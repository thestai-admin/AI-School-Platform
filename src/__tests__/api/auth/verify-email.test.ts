/**
 * Email Verification Tests (TC-VER-001 to TC-VER-006)
 *
 * Tests cover:
 * - Student verification → ACTIVE
 * - Teacher verification → PENDING_APPROVAL
 * - Parent verification → ACTIVE
 * - Invalid token handling
 * - Expired token handling
 * - Resend verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/auth/verify-email/route'
import {
  testDb,
  emailServiceMock,
  resetAllTestData,
  setupTestSchool,
  setupTestUser,
} from '../../utils/mocks'
import { UserRole, UserStatus } from '../../utils/test-utils'

// Store for tracking updated users
let updatedUsers: Map<string, { status: UserStatus; emailVerified?: Date | null }>

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where, include }: {
        where: { emailVerifyToken?: string };
        include?: { school?: { include?: { users?: { where?: { role: UserRole } } } } }
      }) => {
        if (!where.emailVerifyToken) return null

        // Find user by token
        for (const user of Array.from((testDb as unknown as { users: Map<string, unknown> })['users'].values())) {
          const typedUser = user as {
            id: string
            emailVerifyToken?: string
            emailVerifyExpires?: Date
            emailVerified?: Date
            role: UserRole
            schoolId?: string
          }
          if (typedUser.emailVerifyToken === where.emailVerifyToken) {
            const result = { ...typedUser }

            // Add school if included
            if (include?.school && typedUser.schoolId) {
              const school = testDb.findSchoolById(typedUser.schoolId)
              if (school) {
                const schoolResult: {
                  id: string
                  name: string
                  slug: string
                  isActive: boolean
                  users?: Array<{ id: string; name: string; email: string }>
                } = { ...school }
                if (include.school.include?.users) {
                  // Get admins for this school
                  schoolResult.users = Array.from(
                    (testDb as unknown as { users: Map<string, unknown> })['users'].values()
                  )
                    .filter((u) => {
                      const typedU = u as { role: UserRole; schoolId?: string }
                      return typedU.role === UserRole.ADMIN && typedU.schoolId === typedUser.schoolId
                    })
                    .map((u) => {
                      const typedU = u as { id: string; name: string; email: string }
                      return {
                        id: typedU.id,
                        name: typedU.name,
                        email: typedU.email,
                      }
                    })
                }
                return { ...result, school: schoolResult }
              }
            }

            return result
          }
        }
        return null
      }),

      update: vi.fn(async ({ where, data }: {
        where: { id: string };
        data: { emailVerified?: Date; emailVerifyToken?: null; emailVerifyExpires?: null; status: UserStatus }
      }) => {
        const user = testDb.findUserById(where.id)
        if (user) {
          testDb.updateUser(where.id, data)
          updatedUsers.set(where.id, { status: data.status, emailVerified: data.emailVerified })
        }
        return user
      }),
    },
  },
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
  welcomeEmailTemplate: vi.fn(
    (data: { userName: string; role: UserRole }) =>
      `<html>Welcome ${data.userName}! Role: ${data.role}</html>`
  ),
  teacherPendingApprovalTemplate: vi.fn(
    (data: { userName: string; schoolName?: string }) =>
      `<html>Hi ${data.userName}, your account is pending approval at ${data.schoolName}</html>`
  ),
  adminNewTeacherTemplate: vi.fn(
    (data: { adminName: string; teacherName: string }) =>
      `<html>${data.adminName}, new teacher ${data.teacherName} registered</html>`
  ),
  adminNewStudentTemplate: vi.fn(
    (data: { adminName: string; studentName: string }) =>
      `<html>${data.adminName}, new student ${data.studentName} registered</html>`
  ),
}))

// Helper to create NextRequest-like object for GET
function createGetRequest(token: string | null) {
  const url = token
    ? `http://localhost:3000/api/auth/verify-email?token=${token}`
    : 'http://localhost:3000/api/auth/verify-email'

  return {
    url,
    nextUrl: new URL(url),
  } as unknown as import('next/server').NextRequest
}

describe('Email Verification API - /api/auth/verify-email', () => {
  let testSchool: ReturnType<typeof setupTestSchool>

  beforeEach(() => {
    resetAllTestData()
    updatedUsers = new Map()
    testSchool = setupTestSchool('Test School', 'testschool')

    // Create admin for the school
    testDb.createUser({
      name: 'School Admin',
      email: 'admin@testschool.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      schoolId: testSchool.id,
      emailVerified: new Date(),
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // TC-VER-001: Student Verification → ACTIVE
  // ==========================================================================
  describe('TC-VER-001: Student Verification', () => {
    it('should verify student and set status to ACTIVE (auto-approved)', async () => {
      const verificationToken = 'student-verify-token-001'
      const student = testDb.createUser({
        name: 'Pending Student',
        email: 'pending-student@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.PENDING_VERIFICATION,
        schoolId: testSchool.id,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const request = createGetRequest(verificationToken)
      const response = await GET(request)

      // Should redirect to login with success message
      expect(response.status).toBe(307) // Redirect
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('message=EmailVerified')
      expect(location).not.toContain('PendingApproval')

      // Verify user status was updated
      const updatedStatus = updatedUsers.get(student.id)
      expect(updatedStatus?.status).toBe(UserStatus.ACTIVE)
      expect(updatedStatus?.emailVerified).toBeDefined()
    })

    it('should send welcome email to verified student', async () => {
      const verificationToken = 'student-verify-token-002'
      testDb.createUser({
        name: 'Email Test Student',
        email: 'email-test-student@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.PENDING_VERIFICATION,
        schoolId: testSchool.id,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const request = createGetRequest(verificationToken)
      await GET(request)

      const emails = emailServiceMock.findEmailTo('email-test-student@test.com')
      expect(emails.length).toBeGreaterThan(0)
      expect(emails.some((e) => e.subject.includes('Welcome'))).toBe(true)
    })
  })

  // ==========================================================================
  // TC-VER-002: Teacher Verification → PENDING_APPROVAL
  // ==========================================================================
  describe('TC-VER-002: Teacher Verification', () => {
    it('should verify teacher and set status to PENDING_APPROVAL', async () => {
      const verificationToken = 'teacher-verify-token-001'
      const teacher = testDb.createUser({
        name: 'Pending Teacher',
        email: 'pending-teacher@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.TEACHER,
        status: UserStatus.PENDING_VERIFICATION,
        schoolId: testSchool.id,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const request = createGetRequest(verificationToken)
      const response = await GET(request)

      // Should redirect with PendingApproval status
      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('PendingApproval')

      // Verify user status was updated to PENDING_APPROVAL (not ACTIVE)
      const updatedStatus = updatedUsers.get(teacher.id)
      expect(updatedStatus?.status).toBe(UserStatus.PENDING_APPROVAL)
    })

    it('should send pending approval email to teacher', async () => {
      const verificationToken = 'teacher-verify-token-002'
      testDb.createUser({
        name: 'Email Test Teacher',
        email: 'email-test-teacher@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.TEACHER,
        status: UserStatus.PENDING_VERIFICATION,
        schoolId: testSchool.id,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const request = createGetRequest(verificationToken)
      await GET(request)

      const emails = emailServiceMock.findEmailTo('email-test-teacher@test.com')
      expect(emails.length).toBeGreaterThan(0)
      expect(emails.some((e) => e.subject.includes('Pending Approval'))).toBe(true)
    })

    it('should notify school admins about new teacher registration', async () => {
      const verificationToken = 'teacher-verify-token-003'
      testDb.createUser({
        name: 'Notify Test Teacher',
        email: 'notify-teacher@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.TEACHER,
        status: UserStatus.PENDING_VERIFICATION,
        schoolId: testSchool.id,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const request = createGetRequest(verificationToken)
      await GET(request)

      // Check admin was notified
      const adminEmails = emailServiceMock.findEmailTo('admin@testschool.com')
      expect(adminEmails.some((e) => e.subject.includes('New Teacher Registration'))).toBe(true)
    })
  })

  // ==========================================================================
  // TC-VER-003: Parent Verification → ACTIVE
  // ==========================================================================
  describe('TC-VER-003: Parent Verification', () => {
    it('should verify parent and set status to ACTIVE (auto-approved)', async () => {
      const verificationToken = 'parent-verify-token-001'
      const parent = testDb.createUser({
        name: 'Pending Parent',
        email: 'pending-parent@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.PARENT,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const request = createGetRequest(verificationToken)
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('message=EmailVerified')
      expect(location).not.toContain('PendingApproval')

      const updatedStatus = updatedUsers.get(parent.id)
      expect(updatedStatus?.status).toBe(UserStatus.ACTIVE)
    })
  })

  // ==========================================================================
  // TC-VER-004: Invalid Token
  // ==========================================================================
  describe('TC-VER-004: Invalid Token', () => {
    it('should redirect to login with InvalidToken error for non-existent token', async () => {
      const request = createGetRequest('non-existent-token-12345')
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=InvalidToken')
    })

    it('should redirect to login with InvalidToken error when no token provided', async () => {
      const request = createGetRequest(null)
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=InvalidToken')
    })
  })

  // ==========================================================================
  // TC-VER-005: Expired Token (>24h)
  // ==========================================================================
  describe('TC-VER-005: Expired Token', () => {
    it('should redirect to login with TokenExpired error for expired token', async () => {
      const expiredToken = 'expired-token-001'
      testDb.createUser({
        name: 'Expired Token User',
        email: 'expired@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifyToken: expiredToken,
        emailVerifyExpires: new Date(Date.now() - 1000), // Expired 1 second ago
      })

      const request = createGetRequest(expiredToken)
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=TokenExpired')
    })
  })

  // ==========================================================================
  // TC-VER-006: Resend Verification - handled by separate endpoint
  // ==========================================================================
  describe('TC-VER-006: Already Verified User', () => {
    it('should redirect with AlreadyVerified message if user already verified', async () => {
      const alreadyVerifiedToken = 'already-verified-token'
      testDb.createUser({
        name: 'Already Verified',
        email: 'verified@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerifyToken: alreadyVerifiedToken, // Token still exists but user is verified
        emailVerified: new Date(), // Already verified
      })

      const request = createGetRequest(alreadyVerifiedToken)
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('message=AlreadyVerified')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle user without school gracefully', async () => {
      const token = 'no-school-token'
      const user = testDb.createUser({
        name: 'No School User',
        email: 'noschool@test.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerifyToken: token,
        emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // No schoolId
      })

      const request = createGetRequest(token)
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('message=EmailVerified')
    })
  })
})
