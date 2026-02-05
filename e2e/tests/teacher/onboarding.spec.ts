import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../page-objects/auth/register.page';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherDashboardPage } from '../../page-objects/teacher/dashboard.page';
import { v4 as uuidv4 } from 'uuid';

// Generate unique email for each test
function generateUniqueEmail(): string {
  const uniqueId = uuidv4().substring(0, 8);
  return `teacher-onboarding-${uniqueId}@e2e.test`;
}

test.describe('Teacher Onboarding Flow', () => {
  test.describe('Complete Onboarding Journey', () => {
    test('new teacher should complete registration and see pending approval', async ({ page }) => {
      test.setTimeout(60000);
      const registerPage = new RegisterPage(page);
      const email = generateUniqueEmail();
      const password = 'SecureTeacher123!';

      await registerPage.goto();
      await registerPage.registerTeacher({
        name: 'Onboarding Test Teacher',
        email,
        password,
        phone: '9876543212',
      });

      await expect(page.getByText('Check Your Email!')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/admin.*approval|administrator|Note for Teachers/i)).toBeVisible();
    });

    test('pending teacher should see approval error when logging in', async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Use the pending teacher test account
      const pendingEmail = process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test';
      const pendingPassword = process.env.TEST_PENDING_TEACHER_PASSWORD || 'TestPendingTeacher123!';

      await loginPage.goto();
      await loginPage.login(pendingEmail, pendingPassword);

      // Credentials provider blocks PENDING_APPROVAL users with error message
      await loginPage.expectLoginError(/pending.*approval|administrator/i);
    });

    test('approved teacher should access dashboard after login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      // Use the approved teacher test account
      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      // Should be on teacher dashboard
      await dashboardPage.expectToBeOnDashboard();
    });
  });

  test.describe('Approved Teacher Dashboard Access', () => {
    test('teacher should see welcome message on dashboard', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      await dashboardPage.expectWelcomeMessage();
    });

    test('teacher should see navigation menu', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      await dashboardPage.expectTeacherNavigation();
    });

    test('teacher should be able to navigate to lessons', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      await dashboardPage.navigateToLessons();
      await expect(page).toHaveURL(/\/teacher\/lessons/);
    });

    test('teacher should be able to navigate to worksheets', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      await dashboardPage.navigateToWorksheets();
      await expect(page).toHaveURL(/\/teacher\/worksheets/);
    });

    test('teacher should be able to navigate to homework', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      await dashboardPage.navigateToHomework();
      await expect(page).toHaveURL(/\/teacher\/homework/);
    });
  });

  test.describe('Teacher Logout', () => {
    test('teacher should be able to logout', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      await dashboardPage.logout();

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('after logout, accessing teacher routes should redirect to login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new TeacherDashboardPage(page);

      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      // Login
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      // Logout
      await dashboardPage.logout();

      // Try to access teacher dashboard directly
      await page.goto('/teacher/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
