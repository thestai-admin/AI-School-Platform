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
    // Error alert is a div with specific styling in actual UI
    this.errorAlert = page.locator('.bg-red-50.border-red-200, [role="alert"]');
    this.successAlert = page.locator('.text-green-700, .bg-green-50');

    // Role selection - actual UI uses Select dropdown with "I am a..." label
    this.roleSelect = page.locator('select[name="role"]');
    // Keep these for backwards compatibility but they won't work
    this.studentRoleButton = page.getByRole('button', { name: /student/i }).or(page.locator('[data-role="student"]'));
    this.teacherRoleButton = page.getByRole('button', { name: /teacher/i }).or(page.locator('[data-role="teacher"]'));
    this.roleSelector = page.getByLabel(/i am a/i).or(page.locator('select[name="role"]'));

    // Student-specific
    this.classSelect = page.getByLabel(/class|grade/i);

    // Success state - shown after successful registration
    this.successScreen = page.locator('.text-green-700').filter({ hasText: 'Check Your Email' });
    this.successTitle = page.getByText('Check Your Email!');
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

  async register(data: RegistrationData): Promise<void> {
    // Select role if specified
    if (data.role) {
      await this.selectRole(data.role);
    }

    await this.fillRegistrationForm(data);
    await this.submitButton.click();
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
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      if (typeof message === 'string') {
        await expect(this.errorAlert).toContainText(message);
      } else {
        await expect(this.errorAlert).toHaveText(message);
      }
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
    await expect(this.page.getByText(/admin.*approval|administrator.*approval/i)).toBeVisible();
  }

  async expectStudentVerifyEmail(): Promise<void> {
    // Students see the success screen asking to check email
    await expect(this.successTitle).toBeVisible({ timeout: 10000 });
  }

  async expectDuplicateEmailError(): Promise<void> {
    await this.expectRegistrationError(/email.*already|already.*registered|exists/i);
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
