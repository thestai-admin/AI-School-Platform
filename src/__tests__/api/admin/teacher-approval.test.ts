/**
 * Teacher Approval Workflow Tests (TC-APR-001 to TC-APR-006)
 *
 * Tests cover:
 * - List pending teachers
 * - Approve teacher
 * - Reject teacher
 * - Cross-school approval prevention
 * - Approve non-pending teacher
 * - Non-admin approval attempt
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/admin/teachers/approve/route'
import {
  testDb,
  emailServiceMock,
  resetAllTestData,
  setupTestSchool,
  createSessionMock,
} from '../../utils/mocks'
import { UserRole, UserStatus } from '../../utils/test-utils'
import type { MockUser, MockSchool } from '../../utils/test-utils'

// Track user updates
let updatedUsers: Map<string, Partial<MockUser>>

// Mock getServerSession
const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where, include }: {
        where: { id: string };
        include?: { school?: boolean }
      }) => {
        const user = testDb.findUserById(where.id)
        if (!user) return null

        if (include?.school && user.schoolId) {
          const school = testDb.findSchoolById(user.schoolId)
          return { ...user, school }
        }

        return user
      }),

      findMany: vi.fn(async ({ where }: {
        where?: { role?: UserRole; status?: UserStatus; schoolId?: string }
      } = {}) => {
        let users = Array.from((testDb as unknown as { users: Map<string, MockUser> })['users'].values())
        if (where?.role) users = users.filter((u) => u.role === where.role)
        if (where?.status) users = users.filter((u) => u.status === where.status)
        if (where?.schoolId) users = users.filter((u) => u.schoolId === where.schoolId)
        return users
      }),

      update: vi.fn(async ({ where, data }: {
        where: { id: string };
        data: Partial<MockUser>
      }) => {
        const user = testDb.findUserById(where.id)
        if (user) {
          testDb.updateUser(where.id, data)
          updatedUsers.set(where.id, data)
          return { ...user, ...data }
        }
        return null
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
  teacherApprovedTemplate: vi.fn(
    (data: { userName: string; loginUrl: string }) =>
      `<html>Congratulations ${data.userName}! Your account has been approved. Login at ${data.loginUrl}</html>`
  ),
  teacherRejectedTemplate: vi.fn(
    (data: { userName: string; reason?: string }) =>
      `<html>Sorry ${data.userName}, your registration was not approved. Reason: ${data.reason || 'Not specified'}</html>`
  ),
}))

// Helper to create NextRequest
function createRequest(body: Record<string, unknown>) {
  return {
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    url: 'http://localhost:3000/api/admin/teachers/approve',
  } as unknown as import('next/server').NextRequest
}

describe('Teacher Approval API - /api/admin/teachers/approve', () => {
  let school1: MockSchool
  let school2: MockSchool
  let admin1: MockUser
  let admin2: MockUser
  let pendingTeacher1: MockUser
  let pendingTeacher2: MockUser
  let activeTeacher: MockUser

  beforeEach(() => {
    resetAllTestData()
    updatedUsers = new Map()
    vi.clearAllMocks()

    // Setup schools
    school1 = setupTestSchool('School One', 'school1')
    school2 = setupTestSchool('School Two', 'school2')

    // Setup admins
    admin1 = testDb.createUser({
      name: 'Admin One',
      email: 'admin1@school1.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      schoolId: school1.id,
      emailVerified: new Date(),
    })

    admin2 = testDb.createUser({
      name: 'Admin Two',
      email: 'admin2@school2.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      schoolId: school2.id,
      emailVerified: new Date(),
    })

    // Setup teachers
    pendingTeacher1 = testDb.createUser({
      name: 'Pending Teacher One',
      email: 'pending1@school1.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.TEACHER,
      status: UserStatus.PENDING_APPROVAL,
      schoolId: school1.id,
      emailVerified: new Date(),
    })

    pendingTeacher2 = testDb.createUser({
      name: 'Pending Teacher Two',
      email: 'pending2@school2.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.TEACHER,
      status: UserStatus.PENDING_APPROVAL,
      schoolId: school2.id,
      emailVerified: new Date(),
    })

    activeTeacher = testDb.createUser({
      name: 'Active Teacher',
      email: 'active@school1.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      schoolId: school1.id,
      emailVerified: new Date(),
      approvedAt: new Date(),
      approvedBy: admin1.id,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // TC-APR-001: List Pending Teachers (tested via approve endpoint context)
  // ==========================================================================
  describe('TC-APR-001: Admin can see pending teachers', () => {
    it('should allow admin to approve teacher from their school', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('approved successfully')
    })
  })

  // ==========================================================================
  // TC-APR-002: Approve Teacher
  // ==========================================================================
  describe('TC-APR-002: Approve Teacher', () => {
    it('should approve pending teacher and update status to ACTIVE', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('approved')
      expect(data.teacher.status).toBe('ACTIVE')

      // Verify update was called with correct data
      const update = updatedUsers.get(pendingTeacher1.id)
      expect(update?.status).toBe(UserStatus.ACTIVE)
      expect(update?.approvedAt).toBeDefined()
      expect(update?.approvedBy).toBe(admin1.id)
    })

    it('should send approval email to teacher', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'approve',
      })

      await POST(request)

      const emails = emailServiceMock.findEmailTo(pendingTeacher1.email)
      expect(emails.length).toBeGreaterThan(0)
      expect(emails.some((e) => e.subject.includes('Approved'))).toBe(true)
    })
  })

  // ==========================================================================
  // TC-APR-003: Reject Teacher
  // ==========================================================================
  describe('TC-APR-003: Reject Teacher', () => {
    it('should reject pending teacher and update status to REJECTED', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const rejectionReason = 'Incomplete documentation provided'

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'reject',
        rejectionReason,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('rejected')
      expect(data.teacher.status).toBe('REJECTED')

      // Verify update was called with correct data
      const update = updatedUsers.get(pendingTeacher1.id)
      expect(update?.status).toBe(UserStatus.REJECTED)
      expect(update?.rejectionReason).toBe(rejectionReason)
    })

    it('should send rejection email to teacher with reason', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'reject',
        rejectionReason: 'Background check failed',
      })

      await POST(request)

      const emails = emailServiceMock.findEmailTo(pendingTeacher1.email)
      expect(emails.length).toBeGreaterThan(0)
      expect(emails.some((e) => e.subject.includes('Registration Update'))).toBe(true)
    })

    it('should use default rejection reason if none provided', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'reject',
        // No rejectionReason
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const update = updatedUsers.get(pendingTeacher1.id)
      expect(update?.rejectionReason).toBeDefined()
      expect(update?.rejectionReason?.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // TC-APR-004: Cross-School Approval Prevention
  // ==========================================================================
  describe('TC-APR-004: Cross-School Approval Prevention', () => {
    it('should prevent admin from approving teacher from different school', async () => {
      // Admin1 (school1) tries to approve teacher from school2
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher2.id, // Teacher from school2
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain('your school')

      // Verify teacher status was NOT changed
      expect(updatedUsers.has(pendingTeacher2.id)).toBe(false)
    })

    it('should prevent admin from rejecting teacher from different school', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: pendingTeacher2.id,
        action: 'reject',
        rejectionReason: 'Not qualified',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain('your school')
    })
  })

  // ==========================================================================
  // TC-APR-005: Approve Non-Pending Teacher
  // ==========================================================================
  describe('TC-APR-005: Approve Non-Pending Teacher', () => {
    it('should reject attempt to approve already ACTIVE teacher', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: activeTeacher.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('not pending')
    })

    it('should reject attempt to reject already ACTIVE teacher', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))

      const request = createRequest({
        teacherId: activeTeacher.id,
        action: 'reject',
        rejectionReason: 'Changed mind',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('not pending')
    })
  })

  // ==========================================================================
  // TC-APR-006: Non-Admin Approval Attempt
  // ==========================================================================
  describe('TC-APR-006: Non-Admin Approval Attempt', () => {
    it('should reject approval attempt by teacher', async () => {
      mockGetServerSession.mockResolvedValue(createSessionMock(activeTeacher))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain('admin')
    })

    it('should reject approval attempt by student', async () => {
      const student = testDb.createUser({
        name: 'Sneaky Student',
        email: 'sneaky@school1.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        schoolId: school1.id,
      })

      mockGetServerSession.mockResolvedValue(createSessionMock(student))

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain('admin')
    })

    it('should reject request from unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.toLowerCase()).toContain('unauthorized')
    })
  })

  // ==========================================================================
  // Validation Tests
  // ==========================================================================
  describe('Input Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createSessionMock(admin1))
    })

    it('should require teacherId', async () => {
      const request = createRequest({
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('required')
    })

    it('should require action', async () => {
      const request = createRequest({
        teacherId: pendingTeacher1.id,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('required')
    })

    it('should reject invalid action', async () => {
      const request = createRequest({
        teacherId: pendingTeacher1.id,
        action: 'invalid-action',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('invalid action')
    })

    it('should return 404 for non-existent teacher', async () => {
      const request = createRequest({
        teacherId: 'non-existent-id',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.toLowerCase()).toContain('not found')
    })

    it('should reject if user is not a teacher', async () => {
      const student = testDb.createUser({
        name: 'Not A Teacher',
        email: 'not-teacher@school1.com',
        password: '$2b$12$hashedPassword',
        role: UserRole.STUDENT,
        status: UserStatus.PENDING_APPROVAL, // Somehow pending
        schoolId: school1.id,
      })

      const request = createRequest({
        teacherId: student.id,
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain('not a teacher')
    })
  })
})
