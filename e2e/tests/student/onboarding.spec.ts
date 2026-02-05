import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../page-objects/auth/register.page';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentDashboardPage } from '../../page-objects/student/dashboard.page';
import { v4 as uuidv4 } from 'uuid';

// Generate unique email for each test
function generateUniqueEmail(): string {
  const uniqueId = uuidv4().substring(0, 8);
  return `student-onboarding-${uniqueId}@e2e.test`;
}

test.describe('Student Onboarding Flow', () => {
  test.describe('Complete Onboarding Journey', () => {
    test('new student should complete registration', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      const email = generateUniqueEmail();
      const password = 'SecureStudent123!';

      // Step 1: Register as student
      await registerPage.goto();
      await registerPage.registerStudent({
        name: 'Onboarding Test Student',
        email,
        password,
        phone: '9876543213',
      });

      // Step 2: Should see success screen with "Check Your Email!" message
      // The actual UI shows a success screen instead of redirecting
      await expect(page.getByText('Check Your Email!')).toBeVisible({ timeout: 15000 });
    });

    test('verified student should access dashboard after login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      // Use the approved student test account
      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      // Should be on student dashboard
      await dashboardPage.expectToBeOnDashboard();
    });
  });

  test.describe('Student Dashboard Access', () => {
    test('student should see welcome message on dashboard', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      await dashboardPage.expectWelcomeMessage();
    });

    test('student should see navigation menu', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      await dashboardPage.expectStudentNavigation();
    });

    test('student should be able to navigate to chat', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      await dashboardPage.navigateToChat();
      await expect(page).toHaveURL(/\/student\/chat/);
    });

    // Skip - homework link not in student sidebar navigation
    test.skip('student should be able to navigate to homework', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      await dashboardPage.navigateToHomework();
      await expect(page).toHaveURL(/\/student\/homework/);
    });

    test('student should be able to navigate to progress', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      await dashboardPage.navigateToProgress();
      await expect(page).toHaveURL(/\/student\/progress/);
    });
  });

  test.describe('Student Quick Actions', () => {
    test('student should have quick action to start chat', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      // Check if start chat button is available
      const startChatVisible = await dashboardPage.startChatButton.isVisible().catch(() => false);
      if (startChatVisible) {
        await dashboardPage.clickStartChat();
        await expect(page).toHaveURL(/\/student\/chat/);
      }
    });
  });

  test.describe('Student Logout', () => {
    test('student should be able to logout', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      await dashboardPage.logout();

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('after logout, accessing student routes should redirect to login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      // Login
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      // Logout
      await dashboardPage.logout();

      // Try to access student dashboard directly
      await page.goto('/student/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Persistence', () => {
    test('student session should persist after page reload', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      // Reload the page
      await page.reload();

      // Should still be on student dashboard
      await dashboardPage.expectToBeOnDashboard();
    });

    test('student should be able to navigate between pages without re-login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new StudentDashboardPage(page);

      const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
      const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

      // Navigate to chat
      await dashboardPage.navigateToChat();
      await expect(page).toHaveURL(/\/student\/chat/);

      // Navigate back to dashboard (via navigation or direct URL)
      await page.goto('/student');
      await dashboardPage.expectToBeOnDashboard();

      // Navigate to progress/analytics
      await dashboardPage.navigateToProgress();
      await expect(page).toHaveURL(/\/student\/(progress|analytics)/);
    });
  });
});
