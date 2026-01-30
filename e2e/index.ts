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

// Page Objects
export { BasePage } from './page-objects/base.page';
export { LoginPage } from './page-objects/auth/login.page';
export { RegisterPage } from './page-objects/auth/register.page';
export type { RegistrationRole, RegistrationData } from './page-objects/auth/register.page';
export { TeacherDashboardPage } from './page-objects/teacher/dashboard.page';
export { StudentDashboardPage } from './page-objects/student/dashboard.page';
export { StudentChatPage } from './page-objects/student/chat.page';
export { AdminTeachersPage } from './page-objects/admin/teachers.page';
