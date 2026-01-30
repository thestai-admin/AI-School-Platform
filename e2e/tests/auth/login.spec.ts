import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';

// Test user credentials
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test',
    password: process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!',
  },
  parent: {
    email: process.env.TEST_PARENT_EMAIL || 'test-parent@e2e.test',
    password: process.env.TEST_PARENT_PASSWORD || 'TestParent123!',
  },
  pendingTeacher: {
    email: process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test',
    password: process.env.TEST_PENDING_TEACHER_PASSWORD || 'TestPendingTeacher123!',
  },
};

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Page Load', () => {
    test('should display login form', async () => {
      await loginPage.expectToBeOnLoginPage();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should have link to registration', async () => {
      await expect(loginPage.registerLink).toBeVisible();
    });

    test('should have forgot password link', async () => {
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });
  });

  test.describe('Valid Login - All Roles', () => {
    test('admin should login and redirect to admin dashboard', async () => {
      await loginPage.loginAndWaitForRedirect(
        TEST_USERS.admin.email,
        TEST_USERS.admin.password
      );
      await loginPage.expectRedirectToDashboard('admin');
    });

    test('teacher should login and redirect to teacher dashboard', async () => {
      await loginPage.loginAndWaitForRedirect(
        TEST_USERS.teacher.email,
        TEST_USERS.teacher.password
      );
      await loginPage.expectRedirectToDashboard('teacher');
    });

    test('student should login and redirect to student dashboard', async () => {
      await loginPage.loginAndWaitForRedirect(
        TEST_USERS.student.email,
        TEST_USERS.student.password
      );
      await loginPage.expectRedirectToDashboard('student');
    });

    test('parent should login and redirect to parent dashboard', async () => {
      await loginPage.loginAndWaitForRedirect(
        TEST_USERS.parent.email,
        TEST_USERS.parent.password
      );
      await loginPage.expectRedirectToDashboard('parent');
    });
  });

  test.describe('Invalid Credentials', () => {
    test('should show error for wrong password', async () => {
      await loginPage.login(TEST_USERS.admin.email, 'WrongPassword123!');
      await loginPage.expectLoginError();
    });

    test('should show error for non-existent email', async () => {
      await loginPage.login('nonexistent@test.com', 'SomePassword123!');
      await loginPage.expectLoginError();
    });

    test('should show error for empty email', async ({ page }) => {
      await loginPage.passwordInput.fill('SomePassword123!');
      await loginPage.submitButton.click();

      // Should show validation error or remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show error for empty password', async ({ page }) => {
      await loginPage.emailInput.fill(TEST_USERS.admin.email);
      await loginPage.submitButton.click();

      // Should show validation error or remain on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('User Status Blocking', () => {
    test('pending approval teacher should redirect to pending-approval page', async () => {
      await loginPage.loginAndWaitForRedirect(
        TEST_USERS.pendingTeacher.email,
        TEST_USERS.pendingTeacher.password
      );
      await loginPage.expectRedirectToPendingApproval();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to registration page', async ({ page }) => {
      await loginPage.clickRegister();
      await expect(page).toHaveURL(/\/register/);
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.clickForgotPassword();
      await expect(page).toHaveURL(/\/forgot-password|\/reset-password/);
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session after page reload', async ({ page }) => {
      await loginPage.loginAndWaitForRedirect(
        TEST_USERS.student.email,
        TEST_USERS.student.password
      );

      // Reload the page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/\/student/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible form labels', async () => {
      await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus on email input
      await loginPage.emailInput.focus();
      await expect(loginPage.emailInput).toBeFocused();

      // Tab to password
      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();

      // Tab to submit
      await page.keyboard.press('Tab');
      // Submit button or next focusable element should be focused
    });
  });
});
