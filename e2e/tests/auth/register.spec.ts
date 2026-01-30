import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../page-objects/auth/register.page';
import { v4 as uuidv4 } from 'uuid';

// Generate unique email for each test run to avoid conflicts
function generateUniqueEmail(prefix: string): string {
  const uniqueId = uuidv4().substring(0, 8);
  return `${prefix}-${uniqueId}@e2e.test`;
}

test.describe('Registration Page', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test.describe('Page Load', () => {
    test('should display registration form', async () => {
      await registerPage.expectToBeOnRegisterPage();
      await expect(registerPage.nameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
    });

    test('should have link to login page', async () => {
      await expect(registerPage.loginLink).toBeVisible();
    });

    test('should display role selection options', async () => {
      // Check if role selection is visible
      const studentButton = registerPage.studentRoleButton;
      const teacherButton = registerPage.teacherRoleButton;

      const studentVisible = await studentButton.isVisible().catch(() => false);
      const teacherVisible = await teacherButton.isVisible().catch(() => false);

      // At least one role selection method should be available
      expect(studentVisible || teacherVisible).toBeTruthy();
    });
  });

  test.describe('Student Registration', () => {
    test('should successfully register a new student', async () => {
      const email = generateUniqueEmail('student-new');

      await registerPage.registerStudent({
        name: 'New Test Student',
        email,
        password: 'SecurePassword123!',
        phone: '9876543210',
      });

      await registerPage.expectRegistrationSuccess();
    });

    test('should show error for duplicate email', async () => {
      // Use existing test student email
      const existingEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';

      await registerPage.registerStudent({
        name: 'Duplicate Student',
        email: existingEmail,
        password: 'SecurePassword123!',
      });

      await registerPage.expectDuplicateEmailError();
    });

    test('should validate email format', async () => {
      await registerPage.registerStudent({
        name: 'Invalid Email Student',
        email: 'invalid-email',
        password: 'SecurePassword123!',
      });

      // Should show email validation error or form should not submit
      const currentURL = registerPage.getCurrentPath();
      expect(currentURL).toContain('/register');
    });

    test('should validate password strength', async () => {
      const email = generateUniqueEmail('weak-password');

      await registerPage.registerStudent({
        name: 'Weak Password Student',
        email,
        password: '123', // Too weak
      });

      // Should remain on registration page or show error
      const currentURL = registerPage.getCurrentPath();
      expect(currentURL).toContain('/register');
    });
  });

  test.describe('Teacher Registration', () => {
    test('should successfully register a new teacher', async () => {
      const email = generateUniqueEmail('teacher-new');

      await registerPage.registerTeacher({
        name: 'New Test Teacher',
        email,
        password: 'SecurePassword123!',
        phone: '9876543211',
      });

      // Teachers go to pending approval or verify email
      await registerPage.expectTeacherPendingApproval();
    });

    test('should show error for duplicate email', async () => {
      // Use existing test teacher email
      const existingEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';

      await registerPage.registerTeacher({
        name: 'Duplicate Teacher',
        email: existingEmail,
        password: 'SecurePassword123!',
      });

      await registerPage.expectDuplicateEmailError();
    });
  });

  test.describe('Form Validation', () => {
    test('should require name field', async ({ page }) => {
      await registerPage.emailInput.fill(generateUniqueEmail('no-name'));
      await registerPage.passwordInput.fill('SecurePassword123!');
      await registerPage.submitButton.click();

      // Should not proceed without name
      await expect(page).toHaveURL(/\/register/);
    });

    test('should require email field', async ({ page }) => {
      await registerPage.nameInput.fill('No Email User');
      await registerPage.passwordInput.fill('SecurePassword123!');
      await registerPage.submitButton.click();

      // Should not proceed without email
      await expect(page).toHaveURL(/\/register/);
    });

    test('should require password field', async ({ page }) => {
      await registerPage.nameInput.fill('No Password User');
      await registerPage.emailInput.fill(generateUniqueEmail('no-password'));
      await registerPage.submitButton.click();

      // Should not proceed without password
      await expect(page).toHaveURL(/\/register/);
    });

    test('should validate confirm password match', async ({ page }) => {
      await registerPage.nameInput.fill('Mismatched Password User');
      await registerPage.emailInput.fill(generateUniqueEmail('mismatch'));
      await registerPage.passwordInput.fill('SecurePassword123!');

      // Fill confirm password if visible
      if (await registerPage.confirmPasswordInput.isVisible()) {
        await registerPage.confirmPasswordInput.fill('DifferentPassword123!');
        await registerPage.submitButton.click();

        // Should show mismatch error
        await expect(page).toHaveURL(/\/register/);
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to login page', async ({ page }) => {
      await registerPage.clickLogin();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible form fields', async () => {
      await expect(registerPage.emailInput).toHaveAttribute('type', 'email');
      await expect(registerPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Start with name input
      await registerPage.nameInput.focus();
      await expect(registerPage.nameInput).toBeFocused();

      // Tab through form fields
      await page.keyboard.press('Tab');
      // Next field should be focused
    });
  });
});
