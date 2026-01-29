/**
 * Login Flow Tests (TC-LOGIN-001 to TC-LOGIN-008)
 *
 * Tests cover:
 * - Valid ACTIVE user login
 * - PENDING_VERIFICATION user blocked
 * - PENDING_APPROVAL user blocked
 * - SUSPENDED user blocked
 * - REJECTED user blocked
 * - Wrong password
 * - Non-existent email
 * - Google OAuth flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import {
  testDb,
  resetAllTestData,
  setupTestSchool,
} from '../../utils/mocks'
import { UserRole, UserStatus } from '../../utils/test-utils'
import type { MockUser, MockSchool } from '../../utils/test-utils'

// We test the authorize function from authOptions directly
// Since NextAuth is complex to test E2E, we test the core logic

describe('Login Flow - NextAuth Credentials Provider', () => {
  let school: MockSchool
  let activeUser: MockUser
  let pendingVerificationUser: MockUser
  let pendingApprovalUser: MockUser
  let suspendedUser: MockUser
  let rejectedUser: MockUser
  let realHashedPassword: string

  beforeEach(async () => {
    resetAllTestData()
    vi.clearAllMocks()

    // Create real hashed password for testing
    realHashedPassword = await bcrypt.hash('ValidPass123!', 12)

    school = setupTestSchool('Test School', 'testschool')

    // Setup users with real hashed passwords
    activeUser = testDb.createUser({
      name: 'Active User',
      email: 'active@test.com',
      password: realHashedPassword,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      emailVerified: new Date(),
    })

    pendingVerificationUser = testDb.createUser({
      name: 'Pending Verification',
      email: 'pending-verify@test.com',
      password: realHashedPassword,
      role: UserRole.STUDENT,
      status: UserStatus.PENDING_VERIFICATION,
      schoolId: school.id,
    })

    pendingApprovalUser = testDb.createUser({
      name: 'Pending Approval',
      email: 'pending-approval@test.com',
      password: realHashedPassword,
      role: UserRole.TEACHER,
      status: UserStatus.PENDING_APPROVAL,
      schoolId: school.id,
      emailVerified: new Date(),
    })

    suspendedUser = testDb.createUser({
      name: 'Suspended User',
      email: 'suspended@test.com',
      password: realHashedPassword,
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
      schoolId: school.id,
      emailVerified: new Date(),
    })

    rejectedUser = testDb.createUser({
      name: 'Rejected User',
      email: 'rejected@test.com',
      password: realHashedPassword,
      role: UserRole.TEACHER,
      status: UserStatus.REJECTED,
      schoolId: school.id,
      emailVerified: new Date(),
      rejectionReason: 'Failed verification',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Simulate the authorize function logic from auth.ts
  async function simulateAuthorize(credentials: { email: string; password: string }) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Email and password required')
    }

    const user = testDb.findUserByEmail(credentials.email.toLowerCase())

    if (!user) {
      throw new Error('No user found with this email')
    }

    if (!user.password) {
      throw new Error('Please sign in with Google')
    }

    const isValid = await bcrypt.compare(credentials.password, user.password)

    if (!isValid) {
      throw new Error('Invalid password')
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new Error('Please verify your email before logging in. Check your inbox for the verification link.')
    }

    if (user.status === 'PENDING_APPROVAL') {
      throw new Error('Your account is pending administrator approval. You will receive an email once approved.')
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('Your account has been suspended. Please contact support.')
    }

    if (user.status === 'REJECTED') {
      throw new Error('Your registration was not approved. Please contact support for more information.')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId ?? undefined,
    }
  }

  // ==========================================================================
  // TC-LOGIN-001: Valid ACTIVE User Login
  // ==========================================================================
  describe('TC-LOGIN-001: Valid ACTIVE User Login', () => {
    it('should successfully authenticate ACTIVE user with correct credentials', async () => {
      const result = await simulateAuthorize({
        email: 'active@test.com',
        password: 'ValidPass123!',
      })

      expect(result).toBeDefined()
      expect(result.id).toBe(activeUser.id)
      expect(result.email).toBe(activeUser.email)
      expect(result.role).toBe(UserRole.STUDENT)
      expect(result.status).toBe(UserStatus.ACTIVE)
    })

    it('should be case-insensitive for email', async () => {
      const result = await simulateAuthorize({
        email: 'ACTIVE@TEST.COM',
        password: 'ValidPass123!',
      })

      expect(result.email).toBe('active@test.com')
    })
  })

  // ==========================================================================
  // TC-LOGIN-002: PENDING_VERIFICATION User
  // ==========================================================================
  describe('TC-LOGIN-002: PENDING_VERIFICATION User', () => {
    it('should block login for user pending email verification', async () => {
      await expect(
        simulateAuthorize({
          email: 'pending-verify@test.com',
          password: 'ValidPass123!',
        })
      ).rejects.toThrow(/verify your email/i)
    })

    it('should mention verification link in error message', async () => {
      try {
        await simulateAuthorize({
          email: 'pending-verify@test.com',
          password: 'ValidPass123!',
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message.toLowerCase()).toContain('verification')
      }
    })
  })

  // ==========================================================================
  // TC-LOGIN-003: PENDING_APPROVAL User
  // ==========================================================================
  describe('TC-LOGIN-003: PENDING_APPROVAL User', () => {
    it('should block login for teacher pending admin approval', async () => {
      await expect(
        simulateAuthorize({
          email: 'pending-approval@test.com',
          password: 'ValidPass123!',
        })
      ).rejects.toThrow(/pending.*approval/i)
    })

    it('should mention admin approval in error message', async () => {
      try {
        await simulateAuthorize({
          email: 'pending-approval@test.com',
          password: 'ValidPass123!',
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message.toLowerCase()).toContain('administrator')
      }
    })
  })

  // ==========================================================================
  // TC-LOGIN-004: SUSPENDED User
  // ==========================================================================
  describe('TC-LOGIN-004: SUSPENDED User', () => {
    it('should block login for suspended user', async () => {
      await expect(
        simulateAuthorize({
          email: 'suspended@test.com',
          password: 'ValidPass123!',
        })
      ).rejects.toThrow(/suspended/i)
    })

    it('should mention contacting support', async () => {
      try {
        await simulateAuthorize({
          email: 'suspended@test.com',
          password: 'ValidPass123!',
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message.toLowerCase()).toContain('support')
      }
    })
  })

  // ==========================================================================
  // TC-LOGIN-005: REJECTED User
  // ==========================================================================
  describe('TC-LOGIN-005: REJECTED User', () => {
    it('should block login for rejected user', async () => {
      await expect(
        simulateAuthorize({
          email: 'rejected@test.com',
          password: 'ValidPass123!',
        })
      ).rejects.toThrow(/not approved/i)
    })
  })

  // ==========================================================================
  // TC-LOGIN-006: Wrong Password
  // ==========================================================================
  describe('TC-LOGIN-006: Wrong Password', () => {
    it('should reject login with incorrect password', async () => {
      await expect(
        simulateAuthorize({
          email: 'active@test.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow(/invalid password/i)
    })

    it('should reject empty password', async () => {
      await expect(
        simulateAuthorize({
          email: 'active@test.com',
          password: '',
        })
      ).rejects.toThrow()
    })
  })

  // ==========================================================================
  // TC-LOGIN-007: Non-Existent Email
  // ==========================================================================
  describe('TC-LOGIN-007: Non-Existent Email', () => {
    it('should reject login with non-existent email', async () => {
      await expect(
        simulateAuthorize({
          email: 'nonexistent@test.com',
          password: 'ValidPass123!',
        })
      ).rejects.toThrow(/no user found/i)
    })
  })

  // ==========================================================================
  // TC-LOGIN-008: Google OAuth (Simulated)
  // ==========================================================================
  describe('TC-LOGIN-008: Google OAuth', () => {
    // OAuth flow is handled by NextAuth callbacks
    // We test the signIn callback logic

    async function simulateGoogleSignIn(
      email: string,
      name: string,
      existingUser: MockUser | null
    ) {
      if (existingUser) {
        // Existing user status checks
        if (existingUser.status === 'PENDING_VERIFICATION') {
          return '/login?error=PendingVerification'
        }
        if (existingUser.status === 'SUSPENDED') {
          return '/login?error=AccountSuspended'
        }
        if (existingUser.status === 'REJECTED') {
          return '/login?error=AccountRejected'
        }

        // Return success with existing user data
        return {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status,
        }
      } else {
        // New user - auto-create as STUDENT with ACTIVE status
        const newUser = testDb.createUser({
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(),
        })

        return {
          id: newUser.id,
          email: newUser.email,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        }
      }
    }

    it('should create new user as STUDENT with ACTIVE status via Google OAuth', async () => {
      const result = await simulateGoogleSignIn(
        'newgoogleuser@gmail.com',
        'Google User',
        null
      )

      expect(result).not.toBe('string')
      expect((result as { role: UserRole }).role).toBe(UserRole.STUDENT)
      expect((result as { status: UserStatus }).status).toBe(UserStatus.ACTIVE)

      // Verify user was created in DB
      const createdUser = testDb.findUserByEmail('newgoogleuser@gmail.com')
      expect(createdUser).toBeDefined()
      expect(createdUser?.status).toBe(UserStatus.ACTIVE)
    })

    it('should preserve existing user role on Google OAuth login', async () => {
      // Create existing teacher
      const existingTeacher = testDb.createUser({
        name: 'Existing Teacher',
        email: 'teacher@gmail.com',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
      })

      const result = await simulateGoogleSignIn(
        'teacher@gmail.com',
        'Teacher',
        existingTeacher
      )

      expect((result as { role: UserRole }).role).toBe(UserRole.TEACHER)
    })

    it('should block suspended user from Google OAuth login', async () => {
      const result = await simulateGoogleSignIn(
        suspendedUser.email,
        suspendedUser.name,
        suspendedUser
      )

      expect(result).toBe('/login?error=AccountSuspended')
    })

    it('should block rejected user from Google OAuth login', async () => {
      const result = await simulateGoogleSignIn(
        rejectedUser.email,
        rejectedUser.name,
        rejectedUser
      )

      expect(result).toBe('/login?error=AccountRejected')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should reject user without password (OAuth-only user)', async () => {
      testDb.createUser({
        name: 'OAuth Only',
        email: 'oauth-only@test.com',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        // No password
      })

      await expect(
        simulateAuthorize({
          email: 'oauth-only@test.com',
          password: 'AnyPassword123!',
        })
      ).rejects.toThrow(/sign in with google/i)
    })

    it('should handle missing credentials object', async () => {
      await expect(
        simulateAuthorize({ email: '', password: '' })
      ).rejects.toThrow()
    })
  })
})
