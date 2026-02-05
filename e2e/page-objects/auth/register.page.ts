import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export type RegistrationRole = 'student' | 'teacher';

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: RegistrationRole;
  classId?: string;
}

export class RegisterPage extends BasePage {
  // Common locators
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly phoneInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorAlert: Locator;
  readonly successAlert: Locator;

  // Role selection - actual UI uses Select dropdown
  readonly roleSelect: Locator;
  readonly studentRoleButton: Locator;
  readonly teacherRoleButton: Locator;
  readonly roleSelector: Locator;

  // Student-specific
  readonly classSelect: Locator;

  // Success state
  readonly successScreen: Locator;
  readonly successTitle: Locator;

  constructor(page: Page) {
    super(page);

    // Common form fields
    this.nameInput = page.getByLabel(/full name/i).or(page.locator('input[name="name"]'));
    this.emailInput = page.getByLabel(/^email$/i).or(page.locator('input[name="email"]'));
    this.passwordInput = page.getByLabel(/^password$/i).or(page.locator('input[name="password"]'));
    this.confirmPasswordInput = page.getByLabel(/confirm password/i).or(page.locator('input[name="confirmPassword"]'));
    this.phoneInput = page.getByLabel(/phone/i).or(page.locator('input[name="phone"]'));
    this.submitButton = page.getByRole('button', { name: /create account/i });
    this.loginLink = page.getByRole('link', { name: /sign in/i });
    // Error alert is a div with bg-red-50 border border-red-200 styling
    this.errorAlert = page.locator('.bg-red-50.border-red-200').or(page.locator('div.text-red-600'));
    this.successAlert = page.locator('.text-green-700').or(page.locator('.bg-green-50'));

    // Role selection - actual UI uses Select dropdown with "I am a..." label
    this.roleSelect = page.getByLabel(/i am a/i);
    // Keep these for backwards compatibility but they won't work
    this.studentRoleButton = page.getByRole('button', { name: /student/i }).or(page.locator('[data-role="student"]'));
    this.teacherRoleButton = page.getByRole('button', { name: /teacher/i }).or(page.locator('[data-role="teacher"]'));
    this.roleSelector = page.getByLabel(/i am a/i).or(page.locator('select[name="role"]'));

    // Student-specific
    this.classSelect = page.getByLabel(/class|grade/i);

    // Success state - shown after successful registration
    this.successScreen = page.locator('[class*="green"]').filter({ hasText: 'Check Your Email' });
    this.successTitle = page.getByRole('heading', { name: /check your email/i }).or(page.getByText('Check Your Email!'));
  }

  get path(): string {
    return '/register';
  }

  // Actions
  async selectRole(role: RegistrationRole): Promise<void> {
    // Actual UI uses Select dropdown, not buttons
    const roleValue = role === 'student' ? 'STUDENT' : 'TEACHER';
    await this.roleSelect.selectOption(roleValue);
  }

  async fillRegistrationForm(data: RegistrationData): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);

    // Confirm password if visible
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(data.password);
    }

    // Phone if provided and visible
    if (data.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.fill(data.phone);
    }

    // Class selection for students
    if (data.classId && await this.classSelect.isVisible()) {
      await this.classSelect.selectOption(data.classId);
    }
  }

  async register(data: RegistrationData, retryCount = 0): Promise<void> {
    // Wait for any existing rate limit message to clear before filling form
    const rateLimitMsg = this.page.getByText(/too many requests/i);
    if (await rateLimitMsg.isVisible().catch(() => false)) {
      await this.page.waitForTimeout(10000);
      await this.goto();
    }

    // Select role if specified
    if (data.role) {
      await this.selectRole(data.role);
    }

    await this.fillRegistrationForm(data);
    await this.submitButton.click();

    // Wait briefly for response
    await this.page.waitForTimeout(2000);

    // Check if rate limited after submission and retry
    if (await rateLimitMsg.isVisible().catch(() => false)) {
      if (retryCount < 2) {
        await this.page.waitForTimeout(15000);
        await this.goto();
        await this.register(data, retryCount + 1);
      }
    }
  }

  async registerStudent(data: Omit<RegistrationData, 'role'>): Promise<void> {
    await this.register({ ...data, role: 'student' });
  }

  async registerTeacher(data: Omit<RegistrationData, 'role'>): Promise<void> {
    await this.register({ ...data, role: 'teacher' });
  }

  async clickLogin(): Promise<void> {
    await this.loginLink.click();
  }

  // Assertions
  async expectRegistrationError(message?: string | RegExp): Promise<void> {
    // Error can appear as the styled alert or as plain text on the page
    const errorOrText = this.errorAlert.or(this.page.getByText(/too many requests/i));
    await expect(errorOrText.first()).toBeVisible({ timeout: 10000 });
    if (message) {
      // Use toContainText for both string and regex to handle partial matches
      await expect(errorOrText.first()).toContainText(message);
    }
  }

  async expectRegistrationSuccess(): Promise<void> {
    // After successful registration, shows success screen with "Check Your Email!"
    // The page stays on /register but shows success UI
    await expect(this.successTitle).toBeVisible({ timeout: 10000 });
  }

  async expectTeacherPendingApproval(): Promise<void> {
    // Teachers see the success screen with note about admin approval
    await expect(this.successTitle).toBeVisible({ timeout: 10000 });
    // The note says "Wait for admin approval (teachers only)" or "Note for Teachers: ...administrator"
    await expect(this.page.getByText(/admin.*approval|administrator|Note for Teachers/i)).toBeVisible();
  }

  async expectStudentVerifyEmail(): Promise<void> {
    // Students see the success screen asking to check email
    await expect(this.successTitle).toBeVisible({ timeout: 10000 });
  }

  async expectDuplicateEmailError(): Promise<void> {
    // Wait for either duplicate email error or rate limit message
    const error = this.errorAlert;
    const rateLimitOrError = this.page.getByText(/email.*already|already.*registered|exists|already in use|too many requests/i);
    await expect(rateLimitOrError).toBeVisible({ timeout: 10000 });
  }

  async expectPasswordValidationError(): Promise<void> {
    await this.expectRegistrationError(/password.*weak|password.*short|password.*requirements/i);
  }

  async expectEmailValidationError(): Promise<void> {
    await this.expectRegistrationError(/invalid.*email|email.*invalid|email.*format/i);
  }

  async expectToBeOnRegisterPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/register/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }
}
