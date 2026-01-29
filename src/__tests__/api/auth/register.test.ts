/**
 * Registration Flow Tests (TC-REG-001 to TC-REG-010)
 *
 * Tests cover:
 * - Student, Teacher, Parent registration
 * - Admin registration blocking
 * - Duplicate email handling
 * - Email format validation
 * - Password requirements validation
 * - XSS sanitization in name field
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserRole, UserStatus, Language } from '../../utils/test-utils'

// Use vi.hoisted to define mocks that will be hoisted alongside vi.mock
const { mockPrisma, mockRateLimitersMock, mockEmailService } = vi.hoisted(() => {
  const sentEmails: Array<{ to: string; subject: string; html: string }> = []

  return {
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      school: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    mockRateLimitersMock: {
      auth: { check: vi.fn().mockResolvedValue({ success: true, remaining: 10 }) },
      ai: { check: vi.fn().mockResolvedValue({ success: true, remaining: 10 }) },
      login: { check: vi.fn().mockResolvedValue({ success: true, remaining: 5 }) },
    },
    mockEmailService: {
      sentEmails,
      sendEmail: vi.fn((options: { to: string; subject: string; html: string }) => {
        sentEmails.push(options)
        return Promise.resolve({ success: true })
      }),
      getBaseUrl: vi.fn(() => 'http://localhost:3000'),
      findEmailTo: (to: string) => sentEmails.filter((e) => e.to === to),
      reset: () => { sentEmails.length = 0 },
    },
  }
})

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}))

// Import after mocks are set up
import { POST } from '@/app/api/auth/register/route'
import {
  testDb,
  resetAllTestData,
  setupTestSchool,
} from '../../utils/mocks'

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn((password: string) => Promise.resolve(`$2b$12$hashed_${password}`)),
  generateToken: vi.fn(() => `token-${Date.now()}`),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: mockRateLimitersMock,
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
}))

vi.mock('@/lib/email/email-service', () => ({
  sendEmail: mockEmailService.sendEmail,
  getBaseUrl: mockEmailService.getBaseUrl,
}))

vi.mock('@/lib/email/templates', () => ({
  emailVerificationTemplate: vi.fn((data: { userName: string; verificationUrl: string }) =>
    `<html>Verify your email, ${data.userName}: ${data.verificationUrl}</html>`
  ),
}))

// Helper to create NextRequest-like object
function createRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    }),
    url: 'http://localhost:3000/api/auth/register',
  } as unknown as import('next/server').NextRequest
}

describe('Registration API - /api/auth/register', () => {
  let testSchool: ReturnType<typeof setupTestSchool>

  beforeEach(() => {
    resetAllTestData()
    mockEmailService.reset()
    testSchool = setupTestSchool('Test School', 'testschool')
    vi.clearAllMocks()

    // Configure Prisma mocks
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string } }) => {
      if (where.email) return testDb.findUserByEmail(where.email)
      return null
    })

    mockPrisma.user.create.mockImplementation(async ({ data, select }: {
      data: { email: string; name: string; role: string; status?: string; password?: string; schoolId?: string; emailVerifyToken?: string; emailVerifyExpires?: Date; languagePreference?: string; phone?: string };
      select?: Record<string, boolean>
    }) => {
      const user = testDb.createUser({
        email: data.email,
        name: data.name,
        role: data.role as 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT',
        status: (data.status || 'PENDING_VERIFICATION') as 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED',
        password: data.password,
        schoolId: data.schoolId,
        emailVerifyToken: data.emailVerifyToken,
        emailVerifyExpires: data.emailVerifyExpires,
        languagePreference: (data.languagePreference || 'ENGLISH') as 'ENGLISH' | 'HINDI' | 'MIXED',
        phone: data.phone,
      })

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
    })

    mockPrisma.school.findUnique.mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) => {
      if (where.id) return testDb.findSchoolById(where.id)
      if (where.slug) return testDb.findSchoolBySlug(where.slug)
      return null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // TC-REG-001: Student Registration
  // ==========================================================================
  describe('TC-REG-001: Student Registration', () => {
    it('should create student with PENDING_VERIFICATION status', async () => {
      const request = createRequest({
        name: 'New Student',
        email: 'newstudent@test.com',
        password: 'Student123!',
        role: UserRole.STUDENT,
        schoolId: testSchool.id,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toContain('Registration successful')
      expect(data.requiresVerification).toBe(true)
      expect(data.user).toMatchObject({
        email: 'newstudent@test.com',
        name: 'New Student',
        role: UserRole.STUDENT,
      })

      // Verify user was created in database
      const createdUser = testDb.findUserByEmail('newstudent@test.com')
      expect(createdUser).toBeTruthy()
      expect(createdUser?.status).toBe(UserStatus.PENDING_VERIFICATION)
      expect(createdUser?.emailVerifyToken).toBeTruthy()
    })

    it('should send verification email to student', async () => {
      const request = createRequest({
        name: 'Email Test Student',
        email: 'emailtest@test.com',
        password: 'Student123!',
        role: UserRole.STUDENT,
      })

      await POST(request)

      const sentEmails = mockEmailService.findEmailTo('emailtest@test.com')
      expect(sentEmails.length).toBe(1)
      expect(sentEmails[0].subject).toContain('Verify your email')
    })
  })

  // ==========================================================================
  // TC-REG-002: Teacher Registration
  // ==========================================================================
  describe('TC-REG-002: Teacher Registration', () => {
    it('should create teacher with PENDING_VERIFICATION status', async () => {
      const request = createRequest({
        name: 'New Teacher',
        email: 'newteacher@test.com',
        password: 'Teacher123!',
        role: UserRole.TEACHER,
        schoolId: testSchool.id,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.role).toBe(UserRole.TEACHER)
      expect(data.requiresVerification).toBe(true)

      const createdUser = testDb.findUserByEmail('newteacher@test.com')
      expect(createdUser?.status).toBe(UserStatus.PENDING_VERIFICATION)
    })
  })

  // ==========================================================================
  // TC-REG-003: Parent Registration
  // ==========================================================================
  describe('TC-REG-003: Parent Registration', () => {
    it('should create parent with PENDING_VERIFICATION status', async () => {
      const request = createRequest({
        name: 'New Parent',
        email: 'newparent@test.com',
        password: 'Parent123!',
        role: UserRole.PARENT,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user.role).toBe(UserRole.PARENT)

      const createdUser = testDb.findUserByEmail('newparent@test.com')
      expect(createdUser?.status).toBe(UserStatus.PENDING_VERIFICATION)
    })
  })

  // ==========================================================================
  // TC-REG-004: Admin Registration Blocked
  // ==========================================================================
  describe('TC-REG-004: Admin Registration Blocked', () => {
    it('should reject ADMIN role self-registration', async () => {
      const request = createRequest({
        name: 'Wannabe Admin',
        email: 'wannabeadmin@test.com',
        password: 'Admin123!',
        role: UserRole.ADMIN,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid role')

      // Verify user was NOT created
      const user = testDb.findUserByEmail('wannabeadmin@test.com')
      expect(user).toBeNull()
    })
  })

  // ==========================================================================
  // TC-REG-005: Duplicate Email
  // ==========================================================================
  describe('TC-REG-005: Duplicate Email', () => {
    it('should reject registration with existing email', async () => {
      // First registration
      testDb.createUser({
        name: 'Existing User',
        email: 'existing@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
      })

      // Attempt duplicate registration
      const request = createRequest({
        name: 'Duplicate User',
        email: 'existing@test.com',
        password: 'Another123!',
        role: UserRole.STUDENT,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error.toLowerCase()).toContain('already exists')
    })

    it('should be case-insensitive for email duplicates', async () => {
      testDb.createUser({
        name: 'Existing User',
        email: 'user@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
      })

      const request = createRequest({
        name: 'Duplicate User',
        email: 'USER@TEST.COM', // Different case
        password: 'Another123!',
        role: UserRole.STUDENT,
      })

      const response = await POST(request)
      expect(response.status).toBe(409)
    })
  })

  // ==========================================================================
  // TC-REG-006: Invalid Email Format
  // ==========================================================================
  describe('TC-REG-006: Invalid Email Format', () => {
    const invalidEmails = [
      'notanemail',
      '@nodomain.com',
      'no@',
      'missing.at.sign.com',
      'spaces in@email.com',
    ]

    invalidEmails.forEach((email) => {
      it(`should reject invalid email: "${email}"`, async () => {
        const request = createRequest({
          name: 'Test User',
          email,
          password: 'Valid123!',
          role: UserRole.STUDENT,
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.toLowerCase()).toContain('invalid email')
      })
    })
  })

  // ==========================================================================
  // TC-REG-007: Password Too Short
  // ==========================================================================
  describe('TC-REG-007: Password Too Short', () => {
    it('should reject password shorter than 8 characters', async () => {
      const request = createRequest({
        name: 'Test User',
        email: 'shortpass@test.com',
        password: 'Ab1!', // Only 4 chars
        role: UserRole.STUDENT,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('8 characters')
    })
  })

  // ==========================================================================
  // TC-REG-008: Password Missing Uppercase
  // ==========================================================================
  describe('TC-REG-008: Password Missing Uppercase', () => {
    it('should reject password without uppercase letter', async () => {
      const request = createRequest({
        name: 'Test User',
        email: 'nouppercase@test.com',
        password: 'student123!', // No uppercase
        role: UserRole.STUDENT,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('uppercase')
    })
  })

  // ==========================================================================
  // TC-REG-009: Password Missing Special Character
  // ==========================================================================
  describe('TC-REG-009: Password Missing Special Character', () => {
    it('should reject password without special character', async () => {
      const request = createRequest({
        name: 'Test User',
        email: 'nospecial@test.com',
        password: 'Student123', // No special char
        role: UserRole.STUDENT,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('special character')
    })
  })

  // ==========================================================================
  // TC-REG-010: XSS in Name Field
  // ==========================================================================
  describe('TC-REG-010: XSS in Name Field', () => {
    const xssPayloads = [
      { input: '<script>alert("xss")</script>John', expected: 'John' },
      { input: 'John<img src="x" onerror="alert(1)">', expected: 'John' },
      {
        input: '<a href="javascript:alert(\'xss\')">Click Me</a>',
        expected: 'Click Me',
      },
      { input: '"><script>alert(document.cookie)</script>', expected: '">' },
      { input: 'Normal Name', expected: 'Normal Name' },
    ]

    xssPayloads.forEach(({ input, expected }) => {
      it(`should sanitize XSS payload: "${input.substring(0, 30)}..."`, async () => {
        const request = createRequest({
          name: input,
          email: `xss-test-${Date.now()}@test.com`,
          password: 'Valid123!',
          role: UserRole.STUDENT,
        })

        const response = await POST(request)

        // If name becomes too short after sanitization, it might fail validation
        if (expected.trim().length >= 2) {
          expect(response.status).toBe(201)
          const data = await response.json()
          expect(data.user.name).not.toContain('<script>')
          expect(data.user.name).not.toContain('onerror')
          expect(data.user.name).not.toContain('javascript:')
        } else {
          expect(response.status).toBe(400)
        }
      })
    })
  })

  // ==========================================================================
  // Additional Edge Cases
  // ==========================================================================
  describe('Additional Validation', () => {
    it('should reject request missing required fields', async () => {
      const testCases = [
        { email: 'test@test.com', password: 'Test123!', role: 'STUDENT' }, // Missing name
        { name: 'Test', password: 'Test123!', role: 'STUDENT' }, // Missing email
        { name: 'Test', email: 'test@test.com', role: 'STUDENT' }, // Missing password
        { name: 'Test', email: 'test@test.com', password: 'Test123!' }, // Missing role
      ]

      for (const body of testCases) {
        const request = createRequest(body)
        const response = await POST(request)
        expect(response.status).toBe(400)
      }
    })

    it('should accept optional language preference', async () => {
      const request = createRequest({
        name: 'Hindi User',
        email: 'hindi@test.com',
        password: 'Hindi123!',
        role: UserRole.STUDENT,
        languagePreference: Language.HINDI,
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const user = testDb.findUserByEmail('hindi@test.com')
      expect(user?.languagePreference).toBe(Language.HINDI)
    })

    it('should sanitize phone number', async () => {
      const request = createRequest({
        name: 'Phone User',
        email: 'phone@test.com',
        password: 'Phone123!',
        role: UserRole.STUDENT,
        phone: '+91 (123) 456-7890 ext. 123',
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const user = testDb.findUserByEmail('phone@test.com')
      // Phone should only contain digits, +, -, space, and parentheses
      expect(user?.phone).not.toContain('ext.')
    })

    it('should validate school exists if schoolId provided', async () => {
      const request = createRequest({
        name: 'Test User',
        email: 'invalidschool@test.com',
        password: 'Test123!',
        role: UserRole.STUDENT,
        schoolId: 'non-existent-school-id',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('invalid school')
    })
  })
})
