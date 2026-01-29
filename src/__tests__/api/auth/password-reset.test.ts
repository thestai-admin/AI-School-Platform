/**
 * Password Reset Tests (TC-PWD-001 to TC-PWD-004)
 *
 * Tests cover:
 * - Request password reset
 * - Reset password with valid token
 * - Invalid reset token
 * - Expired reset token
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST as postForgotPassword } from '@/app/api/auth/forgot-password/route'
import { POST as postResetPassword, GET as getResetPassword } from '@/app/api/auth/reset-password/route'
import {
  testDb,
  emailServiceMock,
  resetAllTestData,
  setupTestSchool,
  resetRateLimits,
  rateLimitMocks,
} from '../../utils/mocks'
import { UserRole, UserStatus } from '../../utils/test-utils'
import type { MockUser, MockSchool } from '../../utils/test-utils'

// Track updated users
let updatedUsers: Map<string, {
  passwordResetToken?: string | null
  passwordResetExpires?: Date | null
  password?: string
}>

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    auth: vi.fn((identifier: string) => rateLimitMocks.auth.check(identifier)),
  },
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((resetTime: number) =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where, select }: {
        where: { email?: string; passwordResetToken?: string };
        select?: Record<string, boolean>
      }) => {
        let user: MockUser | null = null

        if (where.email) {
          user = testDb.findUserByEmail(where.email)
        } else if (where.passwordResetToken) {
          // Find user by reset token
          for (const u of Array.from(
            (testDb as unknown as { users: Map<string, MockUser> })['users'].values()
          )) {
            const typedUser = u as MockUser & { passwordResetToken?: string }
            if (typedUser.passwordResetToken === where.passwordResetToken) {
              user = u
              break
            }
          }
        }

        if (!user) return null

        // Handle select fields
        if (select) {
          const result: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (select[key]) {
              result[key] = (user as unknown as Record<string, unknown>)[key]
            }
          }
          return result
        }

        return user
      }),

      update: vi.fn(async ({ where, data }: {
        where: { id: string };
        data: Record<string, unknown>
      }) => {
        const user = testDb.findUserById(where.id)
        if (user) {
          testDb.updateUser(where.id, data as Partial<MockUser>)
          updatedUsers.set(where.id, {
            passwordResetToken: data.passwordResetToken as string | null | undefined,
            passwordResetExpires: data.passwordResetExpires as Date | null | undefined,
            password: data.password as string | undefined,
          })
          return { ...user, ...data }
        }
        return null
      }),
    },
  },
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  generateToken: vi.fn(() => `reset-token-${Date.now()}`),
  hashPassword: vi.fn((password: string) => Promise.resolve(`$2b$12$hashed_${password}`)),
}))

// Mock email service
vi.mock('@/lib/email/email-service', () => ({
  sendEmail: vi.fn((options: { to: string; subject: string; html: string }) =>
    emailServiceMock.sendEmail(options)
  ),
  getBaseUrl: vi.fn(() => 'http://localhost:3000'),
}))

// Mock email templates
vi.mock('@/lib/email/templates', () => ({
  passwordResetTemplate: vi.fn((data: { userName: string; resetUrl: string }) =>
    `<html>Reset your password, ${data.userName}: ${data.resetUrl}</html>`
  ),
  passwordChangedTemplate: vi.fn((data: { userName: string; changedAt: string }) =>
    `<html>Password changed for ${data.userName} at ${data.changedAt}</html>`
  ),
}))

// Helper to create NextRequest
function createRequest(body: Record<string, unknown>, url?: string) {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    }),
    url: url || 'http://localhost:3000/api/auth/forgot-password',
  } as unknown as import('next/server').NextRequest
}

describe('Password Reset API', () => {
  let school: MockSchool
  let activeUser: MockUser
  let oauthUser: MockUser

  beforeEach(() => {
    resetAllTestData()
    resetRateLimits()
    updatedUsers = new Map()
    vi.clearAllMocks()

    school = setupTestSchool('Test School', 'testschool')

    activeUser = testDb.createUser({
      name: 'Active User',
      email: 'active@test.com',
      password: '$2b$12$originalPasswordHash',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      emailVerified: new Date(),
    })

    oauthUser = testDb.createUser({
      name: 'OAuth User',
      email: 'oauth@test.com',
      // No password - OAuth only
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      emailVerified: new Date(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // TC-PWD-001: Request Password Reset
  // ==========================================================================
  describe('TC-PWD-001: Request Password Reset', () => {
    it('should generate reset token for existing user', async () => {
      const request = createRequest({ email: 'active@test.com' })
      const response = await postForgotPassword(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()

      // Verify token was saved
      const update = updatedUsers.get(activeUser.id)
      expect(update?.passwordResetToken).toBeDefined()
      expect(update?.passwordResetExpires).toBeDefined()
    })

    it('should set 1-hour expiry for reset token', async () => {
      const now = Date.now()
      const request = createRequest({ email: 'active@test.com' })
      await postForgotPassword(request)

      const update = updatedUsers.get(activeUser.id)
      const expiryTime = update?.passwordResetExpires?.getTime()

      // Should expire in approximately 1 hour
      expect(expiryTime).toBeGreaterThan(now + 55 * 60 * 1000) // At least 55 min
      expect(expiryTime).toBeLessThan(now + 65 * 60 * 1000) // At most 65 min
    })

    it('should send reset email to user', async () => {
      const request = createRequest({ email: 'active@test.com' })
      await postForgotPassword(request)

      const emails = emailServiceMock.findEmailTo('active@test.com')
      expect(emails.length).toBe(1)
      expect(emails[0].subject).toContain('Reset')
    })

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      const request = createRequest({ email: 'nonexistent@test.com' })
      const response = await postForgotPassword(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()

      // No email sent
      const emails = emailServiceMock.findEmailTo('nonexistent@test.com')
      expect(emails.length).toBe(0)
    })

    it('should return success for OAuth-only users (no password to reset)', async () => {
      const request = createRequest({ email: 'oauth@test.com' })
      const response = await postForgotPassword(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()

      // No email sent (can't reset OAuth password)
      const emails = emailServiceMock.findEmailTo('oauth@test.com')
      expect(emails.length).toBe(0)
    })

    it('should require email field', async () => {
      const request = createRequest({})
      const response = await postForgotPassword(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('email')
    })

    it('should be case-insensitive for email', async () => {
      const request = createRequest({ email: 'ACTIVE@TEST.COM' })
      const response = await postForgotPassword(request)

      expect(response.status).toBe(200)
      expect(updatedUsers.get(activeUser.id)?.passwordResetToken).toBeDefined()
    })
  })

  // ==========================================================================
  // TC-PWD-002: Reset Password with Valid Token
  // ==========================================================================
  describe('TC-PWD-002: Reset Password with Valid Token', () => {
    let resetToken: string

    beforeEach(async () => {
      resetToken = 'valid-reset-token-12345'

      // Set up user with valid reset token
      testDb.updateUser(activeUser.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      } as Partial<MockUser>)

      // Update the mock's internal state
      const user = testDb.findUserById(activeUser.id)
      if (user) {
        (user as MockUser & { passwordResetToken?: string; passwordResetExpires?: Date }).passwordResetToken = resetToken
        ;(user as MockUser & { passwordResetToken?: string; passwordResetExpires?: Date }).passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
      }
    })

    it('should reset password with valid token', async () => {
      const request = createRequest({
        token: resetToken,
        password: 'NewPassword123!',
      })

      const response = await postResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('successful')
    })

    it('should hash the new password', async () => {
      const request = createRequest({
        token: resetToken,
        password: 'NewPassword123!',
      })

      await postResetPassword(request)

      const update = updatedUsers.get(activeUser.id)
      expect(update?.password).toContain('$2b$12$hashed_')
    })

    it('should clear reset token after use', async () => {
      const request = createRequest({
        token: resetToken,
        password: 'NewPassword123!',
      })

      await postResetPassword(request)

      const update = updatedUsers.get(activeUser.id)
      expect(update?.passwordResetToken).toBeNull()
      expect(update?.passwordResetExpires).toBeNull()
    })

    it('should send confirmation email', async () => {
      const request = createRequest({
        token: resetToken,
        password: 'NewPassword123!',
      })

      await postResetPassword(request)

      const emails = emailServiceMock.findEmailTo('active@test.com')
      expect(emails.some((e) => e.subject.includes('Changed'))).toBe(true)
    })

    it('should validate new password strength', async () => {
      const weakPasswords = [
        'short1!', // Too short
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase
        'NoNumbers!!', // No numbers
        'NoSpecial123', // No special chars
      ]

      for (const password of weakPasswords) {
        const request = createRequest({
          token: resetToken,
          password,
        })

        const response = await postResetPassword(request)
        expect(response.status).toBe(400)
      }
    })
  })

  // ==========================================================================
  // TC-PWD-003: Invalid Reset Token
  // ==========================================================================
  describe('TC-PWD-003: Invalid Reset Token', () => {
    it('should reject invalid reset token', async () => {
      const request = createRequest({
        token: 'invalid-token-12345',
        password: 'NewPassword123!',
      })

      const response = await postResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('invalid')
    })

    it('should validate token via GET endpoint', async () => {
      const request = {
        url: 'http://localhost:3000/api/auth/reset-password?token=invalid-token',
      } as unknown as import('next/server').NextRequest

      const response = await getResetPassword(request)
      const data = await response.json()

      expect(data.valid).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should require both token and password', async () => {
      const testCases = [
        { password: 'NewPassword123!' }, // Missing token
        { token: 'some-token' }, // Missing password
        {}, // Missing both
      ]

      for (const body of testCases) {
        const request = createRequest(body)
        const response = await postResetPassword(request)
        expect(response.status).toBe(400)
      }
    })
  })

  // ==========================================================================
  // TC-PWD-004: Expired Reset Token
  // ==========================================================================
  describe('TC-PWD-004: Expired Reset Token', () => {
    let expiredToken: string

    beforeEach(() => {
      expiredToken = 'expired-reset-token-12345'

      // Set up user with expired reset token
      const expiredDate = new Date(Date.now() - 1000) // 1 second ago

      testDb.updateUser(activeUser.id, {
        passwordResetToken: expiredToken,
        passwordResetExpires: expiredDate,
      } as Partial<MockUser>)

      const user = testDb.findUserById(activeUser.id)
      if (user) {
        (user as MockUser & { passwordResetToken?: string; passwordResetExpires?: Date }).passwordResetToken = expiredToken
        ;(user as MockUser & { passwordResetToken?: string; passwordResetExpires?: Date }).passwordResetExpires = expiredDate
      }
    })

    it('should reject expired reset token', async () => {
      const request = createRequest({
        token: expiredToken,
        password: 'NewPassword123!',
      })

      const response = await postResetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('expired')
    })

    it('should suggest requesting new token', async () => {
      const request = createRequest({
        token: expiredToken,
        password: 'NewPassword123!',
      })

      const response = await postResetPassword(request)
      const data = await response.json()

      expect(data.error.toLowerCase()).toContain('request a new')
    })

    it('should validate expired token via GET endpoint', async () => {
      const request = {
        url: `http://localhost:3000/api/auth/reset-password?token=${expiredToken}`,
      } as unknown as import('next/server').NextRequest

      const response = await getResetPassword(request)
      const data = await response.json()

      expect(data.valid).toBe(false)
      expect(data.error).toContain('expired')
    })
  })

  // ==========================================================================
  // Token Validation via GET
  // ==========================================================================
  describe('Token Validation (GET endpoint)', () => {
    it('should return valid=true for valid token', async () => {
      const validToken = 'valid-check-token'
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000)

      testDb.updateUser(activeUser.id, {
        passwordResetToken: validToken,
        passwordResetExpires: futureExpiry,
      } as Partial<MockUser>)

      const user = testDb.findUserById(activeUser.id)
      if (user) {
        (user as MockUser & { passwordResetToken?: string; passwordResetExpires?: Date }).passwordResetToken = validToken
        ;(user as MockUser & { passwordResetToken?: string; passwordResetExpires?: Date }).passwordResetExpires = futureExpiry
      }

      const request = {
        url: `http://localhost:3000/api/auth/reset-password?token=${validToken}`,
      } as unknown as import('next/server').NextRequest

      const response = await getResetPassword(request)
      const data = await response.json()

      expect(data.valid).toBe(true)
    })

    it('should require token parameter', async () => {
      const request = {
        url: 'http://localhost:3000/api/auth/reset-password',
      } as unknown as import('next/server').NextRequest

      const response = await getResetPassword(request)
      const data = await response.json()

      expect(data.valid).toBe(false)
      expect(data.error).toContain('required')
    })
  })

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================
  describe('Rate Limiting', () => {
    it('should apply rate limiting to forgot password', async () => {
      // Use up the rate limit (10 requests per minute)
      for (let i = 0; i < 10; i++) {
        const request = createRequest({ email: 'active@test.com' })
        await postForgotPassword(request)
      }

      // 11th request should be rate limited
      const request = createRequest({ email: 'active@test.com' })
      const response = await postForgotPassword(request)

      expect(response.status).toBe(429)
    })
  })
})
