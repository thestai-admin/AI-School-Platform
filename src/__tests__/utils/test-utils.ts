/**
 * E2E Test Utilities
 * Provides mock functions, test helpers, and fixtures for comprehensive testing
 */

import { vi } from 'vitest'

// Define enums locally to avoid Prisma import issues in tests
export const UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
} as const

export const UserStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
} as const

export const Language = {
  ENGLISH: 'ENGLISH',
  HINDI: 'HINDI',
  MIXED: 'MIXED',
} as const

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]
export type Language = (typeof Language)[keyof typeof Language]
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

// ============================================================================
// Types
// ============================================================================

export interface MockUser {
  id: string
  email: string
  name: string
  password?: string
  role: UserRole
  status: UserStatus
  schoolId?: string | null
  emailVerifyToken?: string | null
  emailVerifyExpires?: Date | null
  emailVerified?: Date | null
  languagePreference: Language
  phone?: string | null
  approvedAt?: Date | null
  approvedBy?: string | null
  rejectionReason?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MockSchool {
  id: string
  name: string
  slug: string
  isActive: boolean
  users?: MockUser[]
}

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    status: UserStatus
    schoolId?: string
  }
  expires: string
}

// ============================================================================
// Test Fixtures
// ============================================================================

export const TEST_SCHOOL: MockSchool = {
  id: 'school-test-001',
  name: 'Test School',
  slug: 'testschool',
  isActive: true,
}

export const TEST_SCHOOL_2: MockSchool = {
  id: 'school-test-002',
  name: 'Other School',
  slug: 'otherschool',
  isActive: true,
}

export const TEST_USERS = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@test.com',
    name: 'Test Admin',
    password: '$2b$12$hashedPasswordAdmin', // Admin123!
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  teacher: {
    id: 'user-teacher-001',
    email: 'teacher@test.com',
    name: 'Test Teacher',
    password: '$2b$12$hashedPasswordTeacher', // Teacher123!
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    approvedAt: new Date(),
    approvedBy: 'user-admin-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  teacherPending: {
    id: 'user-teacher-pending-001',
    email: 'teacher-pending@test.com',
    name: 'Pending Teacher',
    password: '$2b$12$hashedPasswordTeacher',
    role: UserRole.TEACHER,
    status: UserStatus.PENDING_APPROVAL,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  teacherPendingVerification: {
    id: 'user-teacher-pv-001',
    email: 'teacher-pv@test.com',
    name: 'Unverified Teacher',
    password: '$2b$12$hashedPasswordTeacher',
    role: UserRole.TEACHER,
    status: UserStatus.PENDING_VERIFICATION,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerifyToken: 'valid-verification-token-teacher',
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  student: {
    id: 'user-student-001',
    email: 'student@test.com',
    name: 'Test Student',
    password: '$2b$12$hashedPasswordStudent', // Student123!
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  studentPendingVerification: {
    id: 'user-student-pv-001',
    email: 'student-pv@test.com',
    name: 'Unverified Student',
    password: '$2b$12$hashedPasswordStudent',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING_VERIFICATION,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerifyToken: 'valid-verification-token-student',
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  parent: {
    id: 'user-parent-001',
    email: 'parent@test.com',
    name: 'Test Parent',
    password: '$2b$12$hashedPasswordParent', // Parent123!
    role: UserRole.PARENT,
    status: UserStatus.ACTIVE,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  parentPendingVerification: {
    id: 'user-parent-pv-001',
    email: 'parent-pv@test.com',
    name: 'Unverified Parent',
    password: '$2b$12$hashedPasswordParent',
    role: UserRole.PARENT,
    status: UserStatus.PENDING_VERIFICATION,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerifyToken: 'valid-verification-token-parent',
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  suspended: {
    id: 'user-suspended-001',
    email: 'suspended@test.com',
    name: 'Suspended User',
    password: '$2b$12$hashedPasswordSuspended',
    role: UserRole.STUDENT,
    status: UserStatus.SUSPENDED,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  rejected: {
    id: 'user-rejected-001',
    email: 'rejected@test.com',
    name: 'Rejected User',
    password: '$2b$12$hashedPasswordRejected',
    role: UserRole.TEACHER,
    status: UserStatus.REJECTED,
    schoolId: TEST_SCHOOL.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    rejectionReason: 'Failed background check',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,

  // Teacher from a different school
  teacherOtherSchool: {
    id: 'user-teacher-other-001',
    email: 'teacher-other@test.com',
    name: 'Other School Teacher',
    password: '$2b$12$hashedPasswordTeacher',
    role: UserRole.TEACHER,
    status: UserStatus.PENDING_APPROVAL,
    schoolId: TEST_SCHOOL_2.id,
    languagePreference: Language.ENGLISH,
    emailVerified: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MockUser,
}

// ============================================================================
// Session Helpers
// ============================================================================

export function createMockSession(user: MockUser): MockSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      schoolId: user.schoolId || undefined,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

// ============================================================================
// Request Helpers
// ============================================================================

export function createMockRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body)
  }

  return new Request(`http://localhost:3000${url}`, requestInit)
}

export function createMockNextRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const request = createMockRequest(method, url, body, headers)
  return request as unknown as import('next/server').NextRequest
}

// ============================================================================
// Password Test Helpers
// ============================================================================

export const VALID_PASSWORDS = {
  strong: 'Admin123!',
  teacher: 'Teacher123!',
  student: 'Student123!',
  parent: 'Parent123!',
}

export const INVALID_PASSWORDS = {
  tooShort: 'Ab1!',
  noUppercase: 'password123!',
  noLowercase: 'PASSWORD123!',
  noNumber: 'Password!@#',
  noSpecial: 'Password123',
}

// ============================================================================
// Email Test Helpers
// ============================================================================

export const VALID_EMAILS = [
  'test@example.com',
  'user.name@domain.co.uk',
  'user+tag@gmail.com',
]

export const INVALID_EMAILS = [
  'notanemail',
  '@nodomain.com',
  'no@',
  'spaces in@email.com',
  '',
]

// ============================================================================
// XSS Test Payloads
// ============================================================================

export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(\'xss\')">',
  '<a href="javascript:alert(\'xss\')">click</a>',
  '"><script>alert(document.cookie)</script>',
  "'; DROP TABLE users; --",
]

// ============================================================================
// Mock Functions
// ============================================================================

export function createPrismaMock() {
  const users = new Map<string, MockUser>()
  const schools = new Map<string, MockSchool>()

  // Initialize with test data
  Object.values(TEST_USERS).forEach((user) => users.set(user.email, user))
  schools.set(TEST_SCHOOL.slug, TEST_SCHOOL)
  schools.set(TEST_SCHOOL_2.slug, TEST_SCHOOL_2)

  return {
    user: {
      findUnique: vi.fn(({ where }: { where: { email?: string; id?: string; emailVerifyToken?: string } }) => {
        if (where.email) return Promise.resolve(users.get(where.email) || null)
        if (where.id) {
          for (const user of users.values()) {
            if (user.id === where.id) return Promise.resolve(user)
          }
        }
        if (where.emailVerifyToken) {
          for (const user of users.values()) {
            if (user.emailVerifyToken === where.emailVerifyToken) return Promise.resolve(user)
          }
        }
        return Promise.resolve(null)
      }),
      create: vi.fn(({ data }: { data: Partial<MockUser> }) => {
        const newUser: MockUser = {
          id: `user-${Date.now()}`,
          email: data.email!,
          name: data.name!,
          password: data.password,
          role: data.role!,
          status: data.status || UserStatus.PENDING_VERIFICATION,
          schoolId: data.schoolId,
          languagePreference: data.languagePreference || Language.ENGLISH,
          emailVerifyToken: data.emailVerifyToken,
          emailVerifyExpires: data.emailVerifyExpires,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        users.set(newUser.email, newUser)
        return Promise.resolve(newUser)
      }),
      update: vi.fn(({ where, data }: { where: { id?: string; email?: string }; data: Partial<MockUser> }) => {
        let user: MockUser | undefined
        if (where.id) {
          for (const u of users.values()) {
            if (u.id === where.id) {
              user = u
              break
            }
          }
        } else if (where.email) {
          user = users.get(where.email)
        }
        if (user) {
          Object.assign(user, data, { updatedAt: new Date() })
          return Promise.resolve(user)
        }
        return Promise.resolve(null)
      }),
      findMany: vi.fn(() => Promise.resolve(Array.from(users.values()))),
      count: vi.fn(() => Promise.resolve(users.size)),
      groupBy: vi.fn(() => Promise.resolve([])),
    },
    school: {
      findUnique: vi.fn(({ where }: { where: { id?: string; slug?: string } }) => {
        if (where.id) {
          for (const school of schools.values()) {
            if (school.id === where.id) return Promise.resolve(school)
          }
        }
        if (where.slug) return Promise.resolve(schools.get(where.slug) || null)
        return Promise.resolve(null)
      }),
      findMany: vi.fn(() => Promise.resolve(Array.from(schools.values()))),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({ user: {}, school: {} })),
  }
}

export function createEmailMock() {
  return {
    sendEmail: vi.fn(() => Promise.resolve({ success: true })),
    getBaseUrl: vi.fn(() => 'http://localhost:3000'),
  }
}

export function createRateLimitMock(success = true) {
  return {
    checkRateLimit: vi.fn(() => ({
      success,
      remaining: success ? 5 : 0,
      resetTime: Date.now() + 60000,
    })),
    rateLimiters: {
      api: vi.fn(() => ({ success, remaining: success ? 99 : 0, resetTime: Date.now() + 60000 })),
      ai: vi.fn(() => ({ success, remaining: success ? 19 : 0, resetTime: Date.now() + 60000 })),
      auth: vi.fn(() => ({ success, remaining: success ? 9 : 0, resetTime: Date.now() + 60000 })),
      login: vi.fn(() => ({ success, remaining: success ? 4 : 0, resetTime: Date.now() + 900000 })),
      register: vi.fn(() => ({ success, remaining: success ? 2 : 0, resetTime: Date.now() + 3600000 })),
    },
    getClientIp: vi.fn(() => '127.0.0.1'),
    rateLimitResponse: vi.fn((resetTime: number) => new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((resetTime - Date.now()) / 1000) }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    )),
  }
}

export function createAuthMock(session: MockSession | null = null) {
  return {
    getServerSession: vi.fn(() => Promise.resolve(session)),
    authOptions: {},
    hashPassword: vi.fn((password: string) => Promise.resolve(`$2b$12$hashed_${password}`)),
    verifyPassword: vi.fn((password: string, hash: string) =>
      Promise.resolve(hash === `$2b$12$hashed_${password}` || hash.includes('hashedPassword'))
    ),
    generateToken: vi.fn(() => 'mock-token-' + Date.now()),
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Failed to parse response as JSON: ${text}`)
  }
}

export function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedErrorContains?: string
) {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }
  if (expectedErrorContains) {
    return response.json().then((data: { error?: string }) => {
      if (!data.error?.toLowerCase().includes(expectedErrorContains.toLowerCase())) {
        throw new Error(`Expected error to contain "${expectedErrorContains}", got "${data.error}"`)
      }
    })
  }
}

// ============================================================================
// Token Helpers
// ============================================================================

export function createExpiredToken(): string {
  return 'expired-token-' + Date.now()
}

export function createValidToken(): string {
  return 'valid-token-' + Date.now()
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

export function resetAllMocks() {
  vi.resetAllMocks()
}

export function clearAllMocks() {
  vi.clearAllMocks()
}
