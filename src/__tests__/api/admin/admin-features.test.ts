/**
 * Admin Feature Tests (TC-ADMIN-001 to TC-ADMIN-004)
 *
 * Tests cover:
 * - View analytics
 * - List teachers (school-scoped)
 * - List students (school-scoped)
 * - Manage classes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  testDb,
  resetAllTestData,
  setupTestSchool,
  createSessionMock,
} from '../../utils/mocks'
import { UserRole, UserStatus } from '../../utils/test-utils'
import type { MockUser, MockSchool } from '../../utils/test-utils'

// Mock getServerSession
const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Simulated admin API handlers (based on actual API structure)
interface AdminAnalytics {
  totalTeachers: number
  totalStudents: number
  totalClasses: number
  pendingApprovals: number
  activeUsers: number
}

interface Teacher {
  id: string
  name: string
  email: string
  status: UserStatus
  schoolId?: string | null
}

interface Student {
  id: string
  name: string
  email: string
  className?: string
  schoolId?: string | null
}

interface ClassInfo {
  id: string
  name: string
  grade: number
  studentCount: number
  teacherCount: number
}

// Simulated data store
const mockData = {
  teachers: [] as MockUser[],
  students: [] as MockUser[],
  classes: [] as ClassInfo[],
}

// Simulated API handlers
async function getAnalytics(session: ReturnType<typeof createSessionMock> | null): Promise<{
  status: number
  data?: AdminAnalytics
  error?: string
}> {
  if (!session) {
    return { status: 401, error: 'Unauthorized' }
  }

  if (session.user.role !== UserRole.ADMIN) {
    return { status: 403, error: 'Admin access required' }
  }

  const schoolId = session.user.schoolId

  // Get school-scoped stats
  const teachers = mockData.teachers.filter((t) => t.schoolId === schoolId)
  const students = mockData.students.filter((s) => s.schoolId === schoolId)

  return {
    status: 200,
    data: {
      totalTeachers: teachers.length,
      totalStudents: students.length,
      totalClasses: mockData.classes.length,
      pendingApprovals: teachers.filter((t) => t.status === UserStatus.PENDING_APPROVAL).length,
      activeUsers: [...teachers, ...students].filter((u) => u.status === UserStatus.ACTIVE).length,
    },
  }
}

async function listTeachers(session: ReturnType<typeof createSessionMock> | null): Promise<{
  status: number
  data?: Teacher[]
  error?: string
}> {
  if (!session) {
    return { status: 401, error: 'Unauthorized' }
  }

  if (session.user.role !== UserRole.ADMIN) {
    return { status: 403, error: 'Admin access required' }
  }

  // Only return teachers from admin's school
  const schoolId = session.user.schoolId
  const teachers = mockData.teachers
    .filter((t) => t.schoolId === schoolId)
    .map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      status: t.status,
      schoolId: t.schoolId,
    }))

  return { status: 200, data: teachers }
}

async function listStudents(session: ReturnType<typeof createSessionMock> | null): Promise<{
  status: number
  data?: Student[]
  error?: string
}> {
  if (!session) {
    return { status: 401, error: 'Unauthorized' }
  }

  if (session.user.role !== UserRole.ADMIN) {
    return { status: 403, error: 'Admin access required' }
  }

  // Only return students from admin's school
  const schoolId = session.user.schoolId
  const students = mockData.students
    .filter((s) => s.schoolId === schoolId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      schoolId: s.schoolId,
    }))

  return { status: 200, data: students }
}

async function manageClasses(
  session: ReturnType<typeof createSessionMock> | null,
  action: 'list' | 'create',
  data?: { name: string; grade: number }
): Promise<{
  status: number
  data?: ClassInfo | ClassInfo[]
  error?: string
}> {
  if (!session) {
    return { status: 401, error: 'Unauthorized' }
  }

  if (session.user.role !== UserRole.ADMIN) {
    return { status: 403, error: 'Admin access required' }
  }

  if (action === 'list') {
    return { status: 200, data: mockData.classes }
  }

  if (action === 'create' && data) {
    const newClass: ClassInfo = {
      id: `class-${Date.now()}`,
      name: data.name,
      grade: data.grade,
      studentCount: 0,
      teacherCount: 0,
    }
    mockData.classes.push(newClass)
    return { status: 201, data: newClass }
  }

  return { status: 400, error: 'Invalid action' }
}

describe('Admin Features API', () => {
  let school1: MockSchool
  let school2: MockSchool
  let admin1: MockUser
  let admin2: MockUser
  let teacher1: MockUser
  let teacher2: MockUser
  let student1: MockUser
  let student2: MockUser

  beforeEach(() => {
    resetAllTestData()
    mockData.teachers = []
    mockData.students = []
    mockData.classes = []
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
    teacher1 = testDb.createUser({
      name: 'Teacher One',
      email: 'teacher1@school1.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      schoolId: school1.id,
      emailVerified: new Date(),
    })
    mockData.teachers.push(teacher1)

    teacher2 = testDb.createUser({
      name: 'Teacher Two',
      email: 'teacher2@school2.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.TEACHER,
      status: UserStatus.PENDING_APPROVAL,
      schoolId: school2.id,
      emailVerified: new Date(),
    })
    mockData.teachers.push(teacher2)

    // Setup students
    student1 = testDb.createUser({
      name: 'Student One',
      email: 'student1@school1.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      schoolId: school1.id,
      emailVerified: new Date(),
    })
    mockData.students.push(student1)

    student2 = testDb.createUser({
      name: 'Student Two',
      email: 'student2@school2.com',
      password: '$2b$12$hashedPassword',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      schoolId: school2.id,
      emailVerified: new Date(),
    })
    mockData.students.push(student2)

    // Setup classes
    mockData.classes = [
      { id: 'class-001', name: 'Class 5A', grade: 5, studentCount: 25, teacherCount: 3 },
      { id: 'class-002', name: 'Class 5B', grade: 5, studentCount: 24, teacherCount: 3 },
    ]
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // TC-ADMIN-001: View Analytics
  // ==========================================================================
  describe('TC-ADMIN-001: View Analytics', () => {
    it('should return school-wide statistics for admin', async () => {
      const session = createSessionMock(admin1)
      const result = await getAnalytics(session)

      expect(result.status).toBe(200)
      expect(result.data).toBeDefined()
      expect(result.data!.totalTeachers).toBeDefined()
      expect(result.data!.totalStudents).toBeDefined()
      expect(result.data!.totalClasses).toBeDefined()
      expect(result.data!.activeUsers).toBeDefined()
    })

    it('should scope analytics to admin school', async () => {
      const session1 = createSessionMock(admin1)
      const result1 = await getAnalytics(session1)

      const session2 = createSessionMock(admin2)
      const result2 = await getAnalytics(session2)

      // Each admin should only see their school's data
      expect(result1.data!.totalTeachers).toBe(1) // Only teacher1
      expect(result2.data!.totalTeachers).toBe(1) // Only teacher2
    })

    it('should include pending approvals count', async () => {
      // Add pending teacher to school1
      const pendingTeacher = testDb.createUser({
        name: 'Pending Teacher',
        email: 'pending@school1.com',
        role: UserRole.TEACHER,
        status: UserStatus.PENDING_APPROVAL,
        schoolId: school1.id,
      })
      mockData.teachers.push(pendingTeacher)

      const session = createSessionMock(admin1)
      const result = await getAnalytics(session)

      expect(result.data!.pendingApprovals).toBe(1)
    })

    it('should block non-admin users', async () => {
      const session = createSessionMock(teacher1)
      const result = await getAnalytics(session)

      expect(result.status).toBe(403)
      expect(result.error?.toLowerCase()).toContain('admin')
    })

    it('should block unauthenticated requests', async () => {
      const result = await getAnalytics(null)

      expect(result.status).toBe(401)
      expect(result.error?.toLowerCase()).toContain('unauthorized')
    })
  })

  // ==========================================================================
  // TC-ADMIN-002: List Teachers
  // ==========================================================================
  describe('TC-ADMIN-002: List Teachers', () => {
    it('should return teachers only from admin school', async () => {
      const session = createSessionMock(admin1)
      const result = await listTeachers(session)

      expect(result.status).toBe(200)
      expect(result.data).toBeDefined()
      expect(result.data!.length).toBe(1)
      expect(result.data![0].email).toBe('teacher1@school1.com')
    })

    it('should not include teachers from other schools', async () => {
      const session = createSessionMock(admin1)
      const result = await listTeachers(session)

      const otherSchoolTeacher = result.data!.find(
        (t) => t.email === 'teacher2@school2.com'
      )
      expect(otherSchoolTeacher).toBeUndefined()
    })

    it('should include teacher status', async () => {
      const session = createSessionMock(admin2)
      const result = await listTeachers(session)

      expect(result.data![0].status).toBe(UserStatus.PENDING_APPROVAL)
    })

    it('should block non-admin users', async () => {
      const session = createSessionMock(student1)
      const result = await listTeachers(session)

      expect(result.status).toBe(403)
    })
  })

  // ==========================================================================
  // TC-ADMIN-003: List Students
  // ==========================================================================
  describe('TC-ADMIN-003: List Students', () => {
    it('should return students only from admin school', async () => {
      const session = createSessionMock(admin1)
      const result = await listStudents(session)

      expect(result.status).toBe(200)
      expect(result.data!.length).toBe(1)
      expect(result.data![0].email).toBe('student1@school1.com')
    })

    it('should not include students from other schools', async () => {
      const session = createSessionMock(admin1)
      const result = await listStudents(session)

      const otherSchoolStudent = result.data!.find(
        (s) => s.email === 'student2@school2.com'
      )
      expect(otherSchoolStudent).toBeUndefined()
    })

    it('should block teacher from listing students', async () => {
      const session = createSessionMock(teacher1)
      const result = await listStudents(session)

      expect(result.status).toBe(403)
    })
  })

  // ==========================================================================
  // TC-ADMIN-004: Manage Classes
  // ==========================================================================
  describe('TC-ADMIN-004: Manage Classes', () => {
    it('should list all classes', async () => {
      const session = createSessionMock(admin1)
      const result = await manageClasses(session, 'list')

      expect(result.status).toBe(200)
      expect(Array.isArray(result.data)).toBe(true)
      expect((result.data as ClassInfo[]).length).toBe(2)
    })

    it('should create a new class', async () => {
      const session = createSessionMock(admin1)
      const result = await manageClasses(session, 'create', {
        name: 'Class 6A',
        grade: 6,
      })

      expect(result.status).toBe(201)
      expect((result.data as ClassInfo).name).toBe('Class 6A')
      expect((result.data as ClassInfo).grade).toBe(6)
    })

    it('should include student and teacher counts', async () => {
      const session = createSessionMock(admin1)
      const result = await manageClasses(session, 'list')

      const classes = result.data as ClassInfo[]
      expect(classes[0].studentCount).toBeDefined()
      expect(classes[0].teacherCount).toBeDefined()
    })

    it('should block non-admin from managing classes', async () => {
      const session = createSessionMock(teacher1)
      const result = await manageClasses(session, 'create', {
        name: 'Unauthorized Class',
        grade: 7,
      })

      expect(result.status).toBe(403)
    })
  })

  // ==========================================================================
  // Cross-School Isolation Tests
  // ==========================================================================
  describe('Cross-School Isolation', () => {
    it('should completely isolate data between schools', async () => {
      // Admin1 from school1
      const session1 = createSessionMock(admin1)
      const teachers1 = await listTeachers(session1)
      const students1 = await listStudents(session1)
      const analytics1 = await getAnalytics(session1)

      // Admin2 from school2
      const session2 = createSessionMock(admin2)
      const teachers2 = await listTeachers(session2)
      const students2 = await listStudents(session2)
      const analytics2 = await getAnalytics(session2)

      // Verify isolation
      expect(teachers1.data!.every((t) => t.schoolId === school1.id)).toBe(true)
      expect(teachers2.data!.every((t) => t.schoolId === school2.id)).toBe(true)
      expect(students1.data!.every((s) => s.schoolId === school1.id)).toBe(true)
      expect(students2.data!.every((s) => s.schoolId === school2.id)).toBe(true)

      // Different pending counts (school2 has pending teacher)
      expect(analytics1.data!.pendingApprovals).toBe(0)
      expect(analytics2.data!.pendingApprovals).toBe(1)
    })
  })
})
