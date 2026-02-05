/**
 * E2E Testing Exports
 *
 * This file exports all page objects and fixtures for use in E2E tests.
 */

// Fixtures
export { test, expect, TEST_USERS } from './fixtures/auth.fixture';
export type { AuthFixtures, UserType } from './fixtures/auth.fixture';
export { seedTestData, cleanTestData, resetTestUserStatus, getTestUser } from './fixtures/database.fixture';
export type { TestUser, TestData } from './fixtures/database.fixture';

// Page Objects - Base
export { BasePage } from './page-objects/base.page';

// Page Objects - Auth
export { LoginPage } from './page-objects/auth/login.page';
export { RegisterPage } from './page-objects/auth/register.page';
export type { RegistrationRole, RegistrationData } from './page-objects/auth/register.page';

// Page Objects - Teacher
export { TeacherDashboardPage } from './page-objects/teacher/dashboard.page';
export { TeacherLessonsPage } from './page-objects/teacher/lessons.page';
export { TeacherWorksheetsPage } from './page-objects/teacher/worksheets.page';
export { TeacherHomeworkPage } from './page-objects/teacher/homework.page';
export { TeacherStudentsPage } from './page-objects/teacher/students.page';
export { TeacherTrainingPage } from './page-objects/teacher/training.page';
export { TeacherCommunityPage } from './page-objects/teacher/community.page';

// Page Objects - Student
export { StudentDashboardPage } from './page-objects/student/dashboard.page';
export { StudentChatPage } from './page-objects/student/chat.page';
export { StudentWorksheetsPage } from './page-objects/student/worksheets.page';
export { StudentHomeworkPage } from './page-objects/student/homework.page';
export { StudentProgressPage } from './page-objects/student/progress.page';
export { StudentCompanionPage } from './page-objects/student/companion.page';
export { StudentCompetitivePage } from './page-objects/student/competitive.page';
export { StudentLearningPathPage } from './page-objects/student/learning-path.page';

// Page Objects - Admin
export { AdminTeachersPage } from './page-objects/admin/teachers.page';
export { AdminDashboardPage } from './page-objects/admin/dashboard.page';
export { AdminStudentsPage } from './page-objects/admin/students.page';
export { AdminClassesPage } from './page-objects/admin/classes.page';
export { AdminSubscriptionsPage } from './page-objects/admin/subscriptions.page';

// Page Objects - Parent
export { ParentDashboardPage } from './page-objects/parent/dashboard.page';
export { ParentProgressPage } from './page-objects/parent/progress.page';
export { ParentHomeworkPage } from './page-objects/parent/homework.page';

// Page Objects - Shared
export { DiagramsPage } from './page-objects/shared/diagrams.page';
