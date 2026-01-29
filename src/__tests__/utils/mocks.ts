/**
 * Mock implementations for E2E tests
 * These mocks can be used to isolate tests from external dependencies
 */

import { vi } from 'vitest'
import { UserRole, UserStatus, Language } from './test-utils'
import type { MockUser, MockSchool } from './test-utils'

// ============================================================================
// In-Memory Database Mock
// ============================================================================

export class InMemoryDatabase {
  private users: Map<string, MockUser> = new Map()
  private schools: Map<string, MockSchool> = new Map()
  private emailTokens: Map<string, string> = new Map() // token -> userId
  private resetTokens: Map<string, { userId: string; expires: Date }> = new Map()

  constructor() {
    this.reset()
  }

  reset() {
    this.users.clear()
    this.schools.clear()
    this.emailTokens.clear()
    this.resetTokens.clear()
  }

  // User operations
  createUser(data: Partial<MockUser> & { email: string; name: string; role: UserRole }): MockUser {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const user: MockUser = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password,
      role: data.role,
      status: data.status || UserStatus.PENDING_VERIFICATION,
      schoolId: data.schoolId || null,
      languagePreference: data.languagePreference || Language.ENGLISH,
      emailVerifyToken: data.emailVerifyToken || null,
      emailVerifyExpires: data.emailVerifyExpires || null,
      emailVerified: data.emailVerified || null,
      phone: data.phone || null,
      approvedAt: data.approvedAt || null,
      approvedBy: data.approvedBy || null,
      rejectionReason: data.rejectionReason || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.set(user.email, user)
    if (user.emailVerifyToken) {
      this.emailTokens.set(user.emailVerifyToken, user.id)
    }
    return user
  }

  findUserByEmail(email: string): MockUser | null {
    return this.users.get(email.toLowerCase()) || null
  }

  findUserById(id: string): MockUser | null {
    for (const user of this.users.values()) {
      if (user.id === id) return user
    }
    return null
  }

  findUserByToken(token: string): MockUser | null {
    const userId = this.emailTokens.get(token)
    if (!userId) return null
    return this.findUserById(userId)
  }

  updateUser(id: string, data: Partial<MockUser>): MockUser | null {
    const user = this.findUserById(id)
    if (!user) return null

    // Clear old token mapping if token is being cleared
    if (user.emailVerifyToken && data.emailVerifyToken === null) {
      this.emailTokens.delete(user.emailVerifyToken)
    }

    Object.assign(user, data, { updatedAt: new Date() })
    return user
  }

  findUsersByStatus(status: UserStatus, schoolId?: string): MockUser[] {
    return Array.from(this.users.values()).filter(
      (u) => u.status === status && (!schoolId || u.schoolId === schoolId)
    )
  }

  findUsersByRole(role: UserRole, schoolId?: string): MockUser[] {
    return Array.from(this.users.values()).filter(
      (u) => u.role === role && (!schoolId || u.schoolId === schoolId)
    )
  }

  // School operations
  createSchool(data: Partial<MockSchool> & { name: string; slug: string }): MockSchool {
    const id = `school-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const school: MockSchool = {
      id,
      name: data.name,
      slug: data.slug.toLowerCase(),
      isActive: data.isActive ?? true,
    }
    this.schools.set(school.slug, school)
    return school
  }

  findSchoolBySlug(slug: string): MockSchool | null {
    return this.schools.get(slug.toLowerCase()) || null
  }

  findSchoolById(id: string): MockSchool | null {
    for (const school of this.schools.values()) {
      if (school.id === id) return school
    }
    return null
  }

  // Password reset tokens
  createResetToken(userId: string, token: string, expiresInHours = 1): void {
    this.resetTokens.set(token, {
      userId,
      expires: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    })
  }

  validateResetToken(token: string): { valid: boolean; userId?: string; expired?: boolean } {
    const entry = this.resetTokens.get(token)
    if (!entry) return { valid: false }
    if (entry.expires < new Date()) return { valid: false, expired: true }
    return { valid: true, userId: entry.userId }
  }

  consumeResetToken(token: string): void {
    this.resetTokens.delete(token)
  }

  // Stats
  getUserCount(): number {
    return this.users.size
  }

  getSchoolCount(): number {
    return this.schools.size
  }
}

// Global test database instance
export const testDb = new InMemoryDatabase()

// ============================================================================
// Prisma Mock Factory
// ============================================================================

export function createPrismaMockFromDb(db: InMemoryDatabase) {
  return {
    user: {
      findUnique: vi.fn(async ({ where, include }: {
        where: { email?: string; id?: string; emailVerifyToken?: string };
        include?: { school?: { include?: { users?: { where?: { role: UserRole }; select?: Record<string, boolean> } } }; accounts?: boolean }
      }) => {
        let user: MockUser | null = null

        if (where.email) user = db.findUserByEmail(where.email)
        else if (where.id) user = db.findUserById(where.id)
        else if (where.emailVerifyToken) user = db.findUserByToken(where.emailVerifyToken)

        if (!user) return null

        // Handle includes
        if (include?.school && user.schoolId) {
          const school = db.findSchoolById(user.schoolId)
          if (school) {
            const result: MockUser & { school?: MockSchool & { users?: MockUser[] } } = { ...user, school }
            if (include.school.include?.users) {
              result.school!.users = db.findUsersByRole(
                include.school.include.users.where?.role || UserRole.ADMIN,
                user.schoolId
              )
            }
            return result
          }
        }

        if (include?.accounts) {
          return { ...user, accounts: [] }
        }

        return user
      }),

      create: vi.fn(async ({ data, select }: {
        data: Partial<MockUser> & { email: string; name: string; role: UserRole };
        select?: Record<string, boolean>
      }) => {
        const user = db.createUser(data)
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
        where: { id?: string; email?: string };
        data: Partial<MockUser>
      }) => {
        const userId = where.id || (where.email && db.findUserByEmail(where.email)?.id)
        if (!userId) return null
        return db.updateUser(userId, data)
      }),

      findMany: vi.fn(async ({ where }: {
        where?: { role?: UserRole; status?: UserStatus; schoolId?: string }
      } = {}) => {
        let users = Array.from(testDb['users'].values())
        if (where?.role) users = users.filter((u) => u.role === where.role)
        if (where?.status) users = users.filter((u) => u.status === where.status)
        if (where?.schoolId) users = users.filter((u) => u.schoolId === where.schoolId)
        return users
      }),

      count: vi.fn(async ({ where }: {
        where?: { role?: UserRole; status?: UserStatus; schoolId?: string }
      } = {}) => {
        let users = Array.from(testDb['users'].values())
        if (where?.role) users = users.filter((u) => u.role === where.role)
        if (where?.status) users = users.filter((u) => u.status === where.status)
        if (where?.schoolId) users = users.filter((u) => u.schoolId === where.schoolId)
        return users.length
      }),

      groupBy: vi.fn(async () => []),
    },

    school: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; slug?: string } }) => {
        if (where.id) return db.findSchoolById(where.id)
        if (where.slug) return db.findSchoolBySlug(where.slug)
        return null
      }),
      findMany: vi.fn(async () => Array.from(testDb['schools'].values())),
    },

    account: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: `account-${Date.now()}`,
        ...data,
      })),
    },

    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  }
}

// ============================================================================
// Rate Limit Mock with State
// ============================================================================

export class RateLimitMock {
  private counters: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(
    private config: {
      windowMs: number
      maxRequests: number
    }
  ) {}

  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = identifier
    const entry = this.counters.get(key)

    // Expired or new
    if (!entry || now > entry.resetTime) {
      this.counters.set(key, { count: 1, resetTime: now + this.config.windowMs })
      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      }
    }

    // Check limit
    if (entry.count >= this.config.maxRequests) {
      return { success: false, remaining: 0, resetTime: entry.resetTime }
    }

    // Increment
    entry.count++
    return {
      success: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  reset() {
    this.counters.clear()
  }
}

export const rateLimitMocks = {
  register: new RateLimitMock({ windowMs: 3600000, maxRequests: 3 }),
  login: new RateLimitMock({ windowMs: 900000, maxRequests: 5 }),
  auth: new RateLimitMock({ windowMs: 60000, maxRequests: 10 }),
  ai: new RateLimitMock({ windowMs: 60000, maxRequests: 20 }),
  api: new RateLimitMock({ windowMs: 60000, maxRequests: 100 }),
}

export function createRateLimitersMock() {
  return {
    register: vi.fn((identifier: string) => rateLimitMocks.register.check(identifier)),
    login: vi.fn((identifier: string) => rateLimitMocks.login.check(identifier)),
    auth: vi.fn((identifier: string) => rateLimitMocks.auth.check(identifier)),
    ai: vi.fn((identifier: string) => rateLimitMocks.ai.check(identifier)),
    api: vi.fn((identifier: string) => rateLimitMocks.api.check(identifier)),
  }
}

export function resetRateLimits() {
  Object.values(rateLimitMocks).forEach((mock) => mock.reset())
}

// ============================================================================
// Email Service Mock
// ============================================================================

export class EmailServiceMock {
  private sentEmails: Array<{
    to: string
    subject: string
    html: string
    sentAt: Date
  }> = []

  async sendEmail(options: { to: string; subject: string; html: string }): Promise<{ success: boolean; error?: string }> {
    this.sentEmails.push({
      ...options,
      sentAt: new Date(),
    })
    return { success: true }
  }

  getBaseUrl(): string {
    return 'http://localhost:3000'
  }

  getSentEmails() {
    return [...this.sentEmails]
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null
  }

  findEmailTo(to: string) {
    return this.sentEmails.filter((e) => e.to === to)
  }

  findEmailBySubject(subject: string) {
    return this.sentEmails.filter((e) => e.subject.includes(subject))
  }

  reset() {
    this.sentEmails = []
  }
}

export const emailServiceMock = new EmailServiceMock()

// ============================================================================
// Session Mock Factory
// ============================================================================

export function createSessionMock(user: MockUser | null) {
  if (!user) return null

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
// AI Provider Mock
// ============================================================================

export class AIProviderMock {
  private responses: Map<string, string> = new Map()
  private callHistory: Array<{ systemPrompt: string; userPrompt: string; timestamp: Date }> = []

  setResponse(key: string, response: string) {
    this.responses.set(key, response)
  }

  async generateWithAI(options: { systemPrompt: string; userPrompt: string }): Promise<string> {
    this.callHistory.push({
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      timestamp: new Date(),
    })

    // Return default educational response
    return this.responses.get('default') || JSON.stringify({
      title: 'Mock Lesson Plan',
      objectives: ['Objective 1', 'Objective 2'],
      content: 'This is mock lesson content.',
    })
  }

  async chatWithAI(options: { messages: Array<{ role: string; content: string }> }): Promise<string> {
    return 'This is a helpful educational response from the AI tutor.'
  }

  getCallHistory() {
    return [...this.callHistory]
  }

  reset() {
    this.responses.clear()
    this.callHistory = []
  }
}

export const aiProviderMock = new AIProviderMock()

// ============================================================================
// Test Setup Helpers
// ============================================================================

export function setupTestSchool(name = 'Test School', slug = 'testschool'): MockSchool {
  return testDb.createSchool({ name, slug, isActive: true })
}

export function setupTestUser(
  role: UserRole,
  status: UserStatus = UserStatus.ACTIVE,
  schoolId?: string
): MockUser {
  const rolePrefix = role.toLowerCase()
  const statusSuffix = status !== UserStatus.ACTIVE ? `-${status.toLowerCase()}` : ''

  return testDb.createUser({
    email: `${rolePrefix}${statusSuffix}@test.com`,
    name: `Test ${role}`,
    password: `$2b$12$hashedPassword${role}`,
    role,
    status,
    schoolId,
    emailVerified: status !== UserStatus.PENDING_VERIFICATION ? new Date() : undefined,
    emailVerifyToken: status === UserStatus.PENDING_VERIFICATION ? `verify-token-${role}` : undefined,
    emailVerifyExpires:
      status === UserStatus.PENDING_VERIFICATION
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : undefined,
  })
}

export function resetAllTestData() {
  testDb.reset()
  emailServiceMock.reset()
  aiProviderMock.reset()
  resetRateLimits()
}
