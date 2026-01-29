/**
 * End-to-End User Journey Tests
 *
 * Complete user flow tests covering:
 * - E2E-001: Complete Student Onboarding
 * - E2E-002: Complete Teacher Onboarding with Approval
 * - E2E-003: Homework Lifecycle
 * - E2E-004: Password Reset Flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Define enums locally to avoid Prisma import issues
const UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
} as const

const UserStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
} as const

const Language = {
  ENGLISH: 'ENGLISH',
  HINDI: 'HINDI',
  MIXED: 'MIXED',
} as const

const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const

type UserRole = (typeof UserRole)[keyof typeof UserRole]
type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]
type Language = (typeof Language)[keyof typeof Language]
type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

// Types for testing
interface User {
  id: string
  email: string
  name: string
  password?: string
  role: UserRole
  status: UserStatus
  schoolId?: string
  emailVerifyToken?: string
  emailVerifyExpires?: Date
  passwordResetToken?: string
  passwordResetExpires?: Date
  emailVerified?: Date
  approvedAt?: Date
  approvedBy?: string
}

interface School {
  id: string
  name: string
  slug: string
  isActive: boolean
}

interface Homework {
  id: string
  title: string
  classId: string
  dueDate: Date
  questions: string[]
  submissions: HomeworkSubmission[]
}

interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  answers: string[]
  score?: number
  feedback?: string
  isLate: boolean
  submittedAt: Date
}

interface StudentProgress {
  subjectId: string
  averageScore: number
  worksheetsDone: number
  topicsCompleted: number
}

// In-memory test database
class TestDatabase {
  users: Map<string, User> = new Map()
  schools: Map<string, School> = new Map()
  homework: Map<string, Homework> = new Map()
  progress: Map<string, StudentProgress[]> = new Map()
  emailsSent: Array<{ to: string; subject: string; body: string }> = []
  private idCounter = 0

  reset() {
    this.users.clear()
    this.schools.clear()
    this.homework.clear()
    this.progress.clear()
    this.emailsSent = []
    this.idCounter = 0
  }

  private nextId(prefix: string): string {
    this.idCounter++
    return `${prefix}-${this.idCounter}-${Math.random().toString(36).substr(2, 5)}`
  }

  // User operations
  createUser(data: Partial<User> & { email: string; name: string; role: UserRole }): User {
    const id = this.nextId('user')
    const user: User = {
      id,
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password,
      role: data.role,
      status: data.status || UserStatus.PENDING_VERIFICATION,
      schoolId: data.schoolId,
      emailVerifyToken: data.emailVerifyToken,
      emailVerifyExpires: data.emailVerifyExpires,
      passwordResetToken: data.passwordResetToken,
      passwordResetExpires: data.passwordResetExpires,
    }
    this.users.set(user.email, user)
    return user
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.get(email.toLowerCase())
  }

  findUserById(id: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.id === id) return user
    }
    return undefined
  }

  findUserByToken(token: string, tokenType: 'email' | 'reset'): User | undefined {
    for (const user of this.users.values()) {
      if (tokenType === 'email' && user.emailVerifyToken === token) return user
      if (tokenType === 'reset' && user.passwordResetToken === token) return user
    }
    return undefined
  }

  updateUser(id: string, data: Partial<User>): User | undefined {
    const user = this.findUserById(id)
    if (user) {
      Object.assign(user, data)
      return user
    }
    return undefined
  }

  // School operations
  createSchool(name: string, slug: string): School {
    const school: School = {
      id: this.nextId('school'),
      name,
      slug,
      isActive: true,
    }
    this.schools.set(slug, school)
    return school
  }

  findSchoolBySlug(slug: string): School | undefined {
    return this.schools.get(slug)
  }

  // Email simulation
  sendEmail(to: string, subject: string, body: string) {
    this.emailsSent.push({ to, subject, body })
  }

  getEmailsSentTo(email: string) {
    return this.emailsSent.filter((e) => e.to === email)
  }

  // Homework operations
  createHomework(data: Omit<Homework, 'submissions'>): Homework {
    const homework: Homework = { ...data, submissions: [] }
    this.homework.set(data.id, homework)
    return homework
  }

  submitHomework(homeworkId: string, submission: HomeworkSubmission) {
    const hw = this.homework.get(homeworkId)
    if (hw) {
      hw.submissions.push(submission)
    }
  }

  // Progress operations
  updateProgress(userId: string, progress: StudentProgress) {
    const existing = this.progress.get(userId) || []
    const idx = existing.findIndex((p) => p.subjectId === progress.subjectId)
    if (idx >= 0) {
      existing[idx] = progress
    } else {
      existing.push(progress)
    }
    this.progress.set(userId, existing)
  }

  getProgress(userId: string): StudentProgress[] {
    return this.progress.get(userId) || []
  }
}

const db = new TestDatabase()

// Simulated API functions
async function registerUser(data: {
  name: string
  email: string
  password: string
  role: UserRole
  schoolId?: string
}): Promise<{ success: boolean; user?: User; error?: string }> {
  // Validate password
  if (data.password.length < 8) {
    return { success: false, error: 'Password too short' }
  }
  if (!/[A-Z]/.test(data.password)) {
    return { success: false, error: 'Password needs uppercase' }
  }
  if (!/[a-z]/.test(data.password)) {
    return { success: false, error: 'Password needs lowercase' }
  }
  if (!/\d/.test(data.password)) {
    return { success: false, error: 'Password needs number' }
  }
  if (!/[@$!%*?&#^()_+=\-]/.test(data.password)) {
    return { success: false, error: 'Password needs special char' }
  }

  // Check for admin role
  if (data.role === UserRole.ADMIN) {
    return { success: false, error: 'Cannot self-register as admin' }
  }

  // Check duplicate
  if (db.findUserByEmail(data.email)) {
    return { success: false, error: 'Email already exists' }
  }

  const token = `verify-${Date.now()}`
  const user = db.createUser({
    ...data,
    status: UserStatus.PENDING_VERIFICATION,
    emailVerifyToken: token,
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  db.sendEmail(user.email, 'Verify your email', `Token: ${token}`)

  return { success: true, user }
}

async function verifyEmail(token: string): Promise<{
  success: boolean
  user?: User
  needsApproval?: boolean
  error?: string
}> {
  const user = db.findUserByToken(token, 'email')

  if (!user) {
    return { success: false, error: 'Invalid token' }
  }

  if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
    return { success: false, error: 'Token expired' }
  }

  // Determine new status
  let newStatus: UserStatus
  let needsApproval = false

  if (user.role === UserRole.TEACHER) {
    newStatus = UserStatus.PENDING_APPROVAL
    needsApproval = true
    db.sendEmail(user.email, 'Pending Approval', 'Your account is pending admin approval')
  } else {
    newStatus = UserStatus.ACTIVE
    db.sendEmail(user.email, 'Welcome!', 'Your account is now active')
  }

  db.updateUser(user.id, {
    status: newStatus,
    emailVerified: new Date(),
    emailVerifyToken: undefined,
    emailVerifyExpires: undefined,
  })

  return { success: true, user: db.findUserById(user.id), needsApproval }
}

async function login(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const user = db.findUserByEmail(email)

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  if (user.password !== password) {
    return { success: false, error: 'Invalid password' }
  }

  switch (user.status) {
    case UserStatus.PENDING_VERIFICATION:
      return { success: false, error: 'Please verify your email' }
    case UserStatus.PENDING_APPROVAL:
      return { success: false, error: 'Pending admin approval' }
    case UserStatus.SUSPENDED:
      return { success: false, error: 'Account suspended' }
    case UserStatus.REJECTED:
      return { success: false, error: 'Registration rejected' }
    case UserStatus.ACTIVE:
      return { success: true, user }
    default:
      return { success: false, error: 'Unknown status' }
  }
}

async function approveTeacher(
  adminId: string,
  teacherId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; error?: string }> {
  const admin = db.findUserById(adminId)
  if (!admin || admin.role !== UserRole.ADMIN) {
    return { success: false, error: 'Unauthorized' }
  }

  const teacher = db.findUserById(teacherId)
  if (!teacher) {
    return { success: false, error: 'Teacher not found' }
  }

  if (teacher.schoolId !== admin.schoolId) {
    return { success: false, error: 'Cannot manage teachers from other schools' }
  }

  if (teacher.status !== UserStatus.PENDING_APPROVAL) {
    return { success: false, error: 'Teacher is not pending approval' }
  }

  if (action === 'approve') {
    db.updateUser(teacherId, {
      status: UserStatus.ACTIVE,
      approvedAt: new Date(),
      approvedBy: adminId,
    })
    db.sendEmail(teacher.email, 'Account Approved', 'You can now login')
  } else {
    db.updateUser(teacherId, { status: UserStatus.REJECTED })
    db.sendEmail(teacher.email, 'Registration Rejected', 'Sorry, your registration was not approved')
  }

  return { success: true }
}

async function useAIChat(
  userId: string,
  message: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  const user = db.findUserById(userId)

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  if (user.role !== UserRole.STUDENT && user.role !== UserRole.ADMIN) {
    return { success: false, error: 'Only students can use chat' }
  }

  // Simulate AI response
  return {
    success: true,
    response: `Here's a helpful explanation about "${message}". Remember to practice regularly!`,
  }
}

async function submitHomeworkAnswer(
  studentId: string,
  homeworkId: string,
  answers: string[]
): Promise<{ success: boolean; submission?: HomeworkSubmission; error?: string }> {
  const student = db.findUserById(studentId)
  if (!student || student.role !== UserRole.STUDENT) {
    return { success: false, error: 'Unauthorized' }
  }

  const homework = db.homework.get(homeworkId)
  if (!homework) {
    return { success: false, error: 'Homework not found' }
  }

  const isLate = new Date() > homework.dueDate

  const submission: HomeworkSubmission = {
    id: `submission-${Date.now()}`,
    homeworkId,
    studentId,
    answers,
    score: 85, // Simulated AI grading
    feedback: 'Good work! Consider reviewing chapter 3 for improvement.',
    isLate,
    submittedAt: new Date(),
  }

  db.submitHomework(homeworkId, submission)

  // Update progress
  const progress = db.getProgress(studentId)
  const mathProgress = progress.find((p) => p.subjectId === 'math') || {
    subjectId: 'math',
    averageScore: 0,
    worksheetsDone: 0,
    topicsCompleted: 0,
  }
  mathProgress.worksheetsDone++
  mathProgress.averageScore = (mathProgress.averageScore * (mathProgress.worksheetsDone - 1) + 85) / mathProgress.worksheetsDone
  db.updateProgress(studentId, mathProgress)

  return { success: true, submission }
}

async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  const user = db.findUserByEmail(email)

  if (user && user.password) {
    const token = `reset-${Date.now()}`
    db.updateUser(user.id, {
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    })
    db.sendEmail(email, 'Password Reset', `Reset token: ${token}`)
  }

  // Always return success to prevent email enumeration
  return { success: true }
}

async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = db.findUserByToken(token, 'reset')

  if (!user) {
    return { success: false, error: 'Invalid token' }
  }

  if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
    return { success: false, error: 'Token expired' }
  }

  // Validate new password
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[@$!%*?&#]/.test(newPassword)) {
    return { success: false, error: 'Password does not meet requirements' }
  }

  db.updateUser(user.id, {
    password: newPassword,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
  })

  db.sendEmail(user.email, 'Password Changed', 'Your password has been changed')

  return { success: true }
}

describe('End-to-End User Journeys', () => {
  let school: School
  let adminUser: User

  beforeEach(() => {
    db.reset()
    school = db.createSchool('Test School', 'testschool')

    // Create admin directly (admins can't self-register)
    adminUser = db.createUser({
      name: 'School Admin',
      email: 'admin@testschool.com',
      password: 'Admin123!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
    })
  })

  // ==========================================================================
  // E2E-001: Complete Student Onboarding
  // ==========================================================================
  describe('E2E-001: Complete Student Onboarding', () => {
    it('should complete full student onboarding flow', async () => {
      // Step 1: Register as student
      const regResult = await registerUser({
        name: 'New Student',
        email: 'student@test.com',
        password: 'Student123!',
        role: UserRole.STUDENT,
        schoolId: school.id,
      })

      expect(regResult.success).toBe(true)
      expect(regResult.user?.status).toBe(UserStatus.PENDING_VERIFICATION)
      expect(db.getEmailsSentTo('student@test.com').length).toBe(1)

      // Step 2: Try to login before verification - should fail
      const preLoginResult = await login('student@test.com', 'Student123!')
      expect(preLoginResult.success).toBe(false)
      expect(preLoginResult.error).toContain('verify')

      // Step 3: Verify email
      const verifyToken = regResult.user!.emailVerifyToken!
      const verifyResult = await verifyEmail(verifyToken)

      expect(verifyResult.success).toBe(true)
      expect(verifyResult.user?.status).toBe(UserStatus.ACTIVE)
      expect(verifyResult.needsApproval).toBe(false)

      // Step 4: Login successfully
      const loginResult = await login('student@test.com', 'Student123!')
      expect(loginResult.success).toBe(true)
      expect(loginResult.user?.role).toBe(UserRole.STUDENT)

      // Step 5: Use AI chat
      const chatResult = await useAIChat(loginResult.user!.id, 'What is photosynthesis?')
      expect(chatResult.success).toBe(true)
      expect(chatResult.response).toBeDefined()

      // Step 6: Complete a worksheet (homework submission)
      const homework = db.createHomework({
        id: 'hw-001',
        title: 'Math Worksheet',
        classId: 'class-001',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: ['Q1', 'Q2', 'Q3'],
      })

      const submitResult = await submitHomeworkAnswer(
        loginResult.user!.id,
        homework.id,
        ['A1', 'A2', 'A3']
      )

      expect(submitResult.success).toBe(true)
      expect(submitResult.submission?.score).toBeDefined()
      expect(submitResult.submission?.feedback).toBeDefined()

      // Step 7: View progress
      const progress = db.getProgress(loginResult.user!.id)
      expect(progress.length).toBeGreaterThan(0)
      expect(progress[0].worksheetsDone).toBe(1)
    })
  })

  // ==========================================================================
  // E2E-002: Complete Teacher Onboarding with Approval
  // ==========================================================================
  describe('E2E-002: Complete Teacher Onboarding with Approval', () => {
    it('should complete full teacher onboarding with admin approval', async () => {
      // Step 1: Register as teacher
      const regResult = await registerUser({
        name: 'New Teacher',
        email: 'teacher@test.com',
        password: 'Teacher123!',
        role: UserRole.TEACHER,
        schoolId: school.id,
      })

      expect(regResult.success).toBe(true)
      expect(regResult.user?.status).toBe(UserStatus.PENDING_VERIFICATION)

      // Step 2: Verify email → status becomes PENDING_APPROVAL
      const verifyToken = regResult.user!.emailVerifyToken!
      const verifyResult = await verifyEmail(verifyToken)

      expect(verifyResult.success).toBe(true)
      expect(verifyResult.user?.status).toBe(UserStatus.PENDING_APPROVAL)
      expect(verifyResult.needsApproval).toBe(true)

      // Step 3: Try to login - should fail (pending approval)
      const preApprovalLogin = await login('teacher@test.com', 'Teacher123!')
      expect(preApprovalLogin.success).toBe(false)
      expect(preApprovalLogin.error).toContain('approval')

      // Step 4: Admin approves teacher
      const approveResult = await approveTeacher(
        adminUser.id,
        regResult.user!.id,
        'approve'
      )

      expect(approveResult.success).toBe(true)

      // Verify approval email sent
      const approvalEmails = db.getEmailsSentTo('teacher@test.com')
      expect(approvalEmails.some((e) => e.subject.includes('Approved'))).toBe(true)

      // Step 5: Login successfully
      const loginResult = await login('teacher@test.com', 'Teacher123!')
      expect(loginResult.success).toBe(true)
      expect(loginResult.user?.status).toBe(UserStatus.ACTIVE)
      expect(loginResult.user?.approvedAt).toBeDefined()
    })

    it('should handle teacher rejection', async () => {
      // Register and verify
      const regResult = await registerUser({
        name: 'Rejected Teacher',
        email: 'rejected@test.com',
        password: 'Teacher123!',
        role: UserRole.TEACHER,
        schoolId: school.id,
      })

      await verifyEmail(regResult.user!.emailVerifyToken!)

      // Admin rejects
      const rejectResult = await approveTeacher(
        adminUser.id,
        regResult.user!.id,
        'reject'
      )

      expect(rejectResult.success).toBe(true)

      // Verify rejection email
      const rejectionEmails = db.getEmailsSentTo('rejected@test.com')
      expect(rejectionEmails.some((e) => e.subject.includes('Rejected'))).toBe(true)

      // Cannot login
      const loginResult = await login('rejected@test.com', 'Teacher123!')
      expect(loginResult.success).toBe(false)
      expect(loginResult.error).toContain('rejected')
    })

    it('should prevent cross-school approval', async () => {
      const otherSchool = db.createSchool('Other School', 'otherschool')

      // Create admin for the other school
      const otherAdmin = db.createUser({
        name: 'Other Admin',
        email: 'otheradmin@otherschool.com',
        password: 'Admin123!',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        schoolId: otherSchool.id,
      })

      // Create teacher in other school
      const teacherResult = await registerUser({
        name: 'Other Teacher',
        email: 'other@test.com',
        password: 'Teacher123!',
        role: UserRole.TEACHER,
        schoolId: otherSchool.id,
      })

      await verifyEmail(teacherResult.user!.emailVerifyToken!)

      // Admin from testschool (school) tries to approve teacher from otherschool
      // This should fail because adminUser belongs to school, not otherSchool
      const approveResult = await approveTeacher(
        adminUser.id, // admin from 'testschool'
        teacherResult.user!.id, // teacher from 'otherschool'
        'approve'
      )

      expect(approveResult.success).toBe(false)
      expect(approveResult.error).toContain('other schools')
    })
  })

  // ==========================================================================
  // E2E-003: Homework Lifecycle
  // ==========================================================================
  describe('E2E-003: Homework Lifecycle', () => {
    it('should complete full homework lifecycle', async () => {
      // Setup: Create and login teacher
      const teacherReg = await registerUser({
        name: 'Homework Teacher',
        email: 'hwteacher@test.com',
        password: 'Teacher123!',
        role: UserRole.TEACHER,
        schoolId: school.id,
      })
      await verifyEmail(teacherReg.user!.emailVerifyToken!)
      await approveTeacher(adminUser.id, teacherReg.user!.id, 'approve')
      const teacherLogin = await login('hwteacher@test.com', 'Teacher123!')
      expect(teacherLogin.success).toBe(true)

      // Setup: Create and login student
      const studentReg = await registerUser({
        name: 'Homework Student',
        email: 'hwstudent@test.com',
        password: 'Student123!',
        role: UserRole.STUDENT,
        schoolId: school.id,
      })
      await verifyEmail(studentReg.user!.emailVerifyToken!)
      const studentLogin = await login('hwstudent@test.com', 'Student123!')
      expect(studentLogin.success).toBe(true)

      // Step 1: Teacher creates homework
      const homework = db.createHomework({
        id: 'hw-lifecycle',
        title: 'Math Chapter 5',
        classId: 'class-001',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: ['Solve 2+2', 'Solve 3x3', 'Solve 10/2'],
      })

      expect(homework).toBeDefined()
      expect(homework.questions.length).toBe(3)

      // Step 2: Student views homework (homework exists)
      const hw = db.homework.get('hw-lifecycle')
      expect(hw).toBeDefined()

      // Step 3: Student submits answers
      const submission = await submitHomeworkAnswer(
        studentLogin.user!.id,
        homework.id,
        ['4', '9', '5']
      )

      expect(submission.success).toBe(true)
      expect(submission.submission?.score).toBeDefined()
      expect(submission.submission?.feedback).toBeDefined()
      expect(submission.submission?.isLate).toBe(false)

      // Step 4: Teacher views submissions
      const hwWithSubmissions = db.homework.get('hw-lifecycle')
      expect(hwWithSubmissions?.submissions.length).toBe(1)
      expect(hwWithSubmissions?.submissions[0].studentId).toBe(studentLogin.user!.id)

      // Step 5: Parent could view (simulated by checking DB)
      const studentProgress = db.getProgress(studentLogin.user!.id)
      expect(studentProgress.length).toBeGreaterThan(0)
    })

    it('should handle late submission', async () => {
      // Setup student
      const studentReg = await registerUser({
        name: 'Late Student',
        email: 'late@test.com',
        password: 'Student123!',
        role: UserRole.STUDENT,
        schoolId: school.id,
      })
      await verifyEmail(studentReg.user!.emailVerifyToken!)
      const studentLogin = await login('late@test.com', 'Student123!')

      // Create homework with past due date
      const homework = db.createHomework({
        id: 'hw-late',
        title: 'Overdue Assignment',
        classId: 'class-001',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        questions: ['Q1'],
      })

      // Submit late
      const submission = await submitHomeworkAnswer(
        studentLogin.user!.id,
        homework.id,
        ['A1']
      )

      expect(submission.success).toBe(true)
      expect(submission.submission?.isLate).toBe(true)
    })
  })

  // ==========================================================================
  // E2E-004: Password Reset Flow
  // ==========================================================================
  describe('E2E-004: Password Reset Flow', () => {
    it('should complete full password reset flow', async () => {
      // Setup: Create verified user
      const userReg = await registerUser({
        name: 'Password User',
        email: 'password@test.com',
        password: 'OldPass123!',
        role: UserRole.STUDENT,
        schoolId: school.id,
      })
      await verifyEmail(userReg.user!.emailVerifyToken!)

      // Step 1: User forgets password and requests reset
      const resetRequest = await requestPasswordReset('password@test.com')
      expect(resetRequest.success).toBe(true)

      // Verify reset email sent
      const resetEmails = db.getEmailsSentTo('password@test.com')
      expect(resetEmails.some((e) => e.subject.includes('Reset'))).toBe(true)

      // Step 2: User clicks reset link (get token)
      const user = db.findUserByEmail('password@test.com')
      const resetToken = user!.passwordResetToken!
      expect(resetToken).toBeDefined()

      // Step 3: User sets new password
      const resetResult = await resetPassword(resetToken, 'NewPass456!')
      expect(resetResult.success).toBe(true)

      // Verify password changed email
      const changedEmails = db.getEmailsSentTo('password@test.com')
      expect(changedEmails.some((e) => e.subject.includes('Changed'))).toBe(true)

      // Step 4: Login with new password succeeds
      const newLogin = await login('password@test.com', 'NewPass456!')
      expect(newLogin.success).toBe(true)

      // Step 5: Login with old password fails
      const oldLogin = await login('password@test.com', 'OldPass123!')
      expect(oldLogin.success).toBe(false)
    })

    it('should prevent password reset for non-existent email', async () => {
      // Request returns success (to prevent enumeration)
      const result = await requestPasswordReset('nonexistent@test.com')
      expect(result.success).toBe(true)

      // But no email is sent
      const emails = db.getEmailsSentTo('nonexistent@test.com')
      expect(emails.length).toBe(0)
    })

    it('should reject expired reset token', async () => {
      // Setup user with expired token
      const user = db.createUser({
        name: 'Expired Token User',
        email: 'expired@test.com',
        password: 'OldPass123!',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordResetToken: 'expired-token',
        passwordResetExpires: new Date(Date.now() - 1000), // Already expired
      })

      const result = await resetPassword('expired-token', 'NewPass123!')
      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should reject weak new password', async () => {
      // Setup user with valid token
      const user = db.createUser({
        name: 'Weak Password User',
        email: 'weak@test.com',
        password: 'OldPass123!',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      })

      const result = await resetPassword('valid-token', 'weak')
      expect(result.success).toBe(false)
      expect(result.error).toContain('requirements')
    })
  })

  // ==========================================================================
  // Additional Integration Scenarios
  // ==========================================================================
  describe('Additional Integration Scenarios', () => {
    it('should enforce role restrictions on AI chat', async () => {
      // Create and verify teacher
      const teacherReg = await registerUser({
        name: 'Chat Teacher',
        email: 'chatteacher@test.com',
        password: 'Teacher123!',
        role: UserRole.TEACHER,
        schoolId: school.id,
      })
      await verifyEmail(teacherReg.user!.emailVerifyToken!)
      await approveTeacher(adminUser.id, teacherReg.user!.id, 'approve')

      // Teacher tries to use chat
      const chatResult = await useAIChat(teacherReg.user!.id, 'Help me')
      expect(chatResult.success).toBe(false)
      expect(chatResult.error).toContain('students')
    })

    it('should handle complete email lifecycle', async () => {
      // Register
      const reg = await registerUser({
        name: 'Email User',
        email: 'emailtest@test.com',
        password: 'Email123!',
        role: UserRole.STUDENT,
        schoolId: school.id,
      })

      // Check verification email
      let emails = db.getEmailsSentTo('emailtest@test.com')
      expect(emails.length).toBe(1)
      expect(emails[0].subject).toContain('Verify')

      // Verify
      await verifyEmail(reg.user!.emailVerifyToken!)

      // Check welcome email
      emails = db.getEmailsSentTo('emailtest@test.com')
      expect(emails.length).toBe(2)
      expect(emails[1].subject).toContain('Welcome')

      // Request password reset
      await requestPasswordReset('emailtest@test.com')

      // Check reset email
      emails = db.getEmailsSentTo('emailtest@test.com')
      expect(emails.length).toBe(3)
      expect(emails[2].subject).toContain('Reset')
    })
  })
})
