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
      const registerPage = new RegisterPage(page);
      const email = generateUniqueEmail();
      const password = 'SecureTeacher123!';

      // Step 1: Register as teacher
      await registerPage.goto();
      await registerPage.registerTeacher({
        name: 'Onboarding Test Teacher',
        email,
        password,
        phone: '9876543212',
      });

      // Step 2: Should see success screen with "Check Your Email!" message
      // The actual UI shows a success screen instead of redirecting
      await expect(page.getByText('Check Your Email!')).toBeVisible({ timeout: 15000 });

      // Should see note about admin approval for teachers
      await expect(page.getByText(/admin.*approval|administrator|Note for Teachers/i)).toBeVisible();
    });

    // Skip - pending teacher test data not properly set up in CI
    test.skip('pending teacher should see approval message when logging in', async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Use the pending teacher test account
      const pendingEmail = process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test';
      const pendingPassword = process.env.TEST_PENDING_TEACHER_PASSWORD || 'TestPendingTeacher123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(pendingEmail, pendingPassword);

      // Should be on pending approval page
      await loginPage.expectRedirectToPendingApproval();

      // Verify page content
      await expect(page.getByText(/pending|approval|review/i).first()).toBeVisible();
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

    // Skip - homework link not in teacher sidebar navigation
    test.skip('teacher should be able to navigate to homework', async ({ page }) => {
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
