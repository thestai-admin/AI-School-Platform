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

  // Role selection
  readonly studentRoleButton: Locator;
  readonly teacherRoleButton: Locator;
  readonly roleSelector: Locator;

  // Student-specific
  readonly classSelect: Locator;

  constructor(page: Page) {
    super(page);

    // Common form fields
    this.nameInput = page.getByLabel(/name|full name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/^password$/i).or(page.locator('input[name="password"]'));
    this.confirmPasswordInput = page.getByLabel(/confirm password/i).or(page.locator('input[name="confirmPassword"]'));
    this.phoneInput = page.getByLabel(/phone|mobile/i);
    this.submitButton = page.getByRole('button', { name: /register|sign up|create account/i });
    this.loginLink = page.getByRole('link', { name: /login|sign in|already have an account/i });
    this.errorAlert = page.locator('[role="alert"]');
    this.successAlert = page.locator('[role="status"], .text-green-500, .success-message');

    // Role selection
    this.studentRoleButton = page.getByRole('button', { name: /student/i }).or(page.locator('[data-role="student"]'));
    this.teacherRoleButton = page.getByRole('button', { name: /teacher/i }).or(page.locator('[data-role="teacher"]'));
    this.roleSelector = page.getByLabel(/role|i am a/i);

    // Student-specific
    this.classSelect = page.getByLabel(/class|grade/i);
  }

  get path(): string {
    return '/register';
  }

  // Actions
  async selectRole(role: RegistrationRole): Promise<void> {
    if (role === 'student') {
      await this.studentRoleButton.click();
    } else {
      await this.teacherRoleButton.click();
    }
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
    // After successful registration, should redirect to verify email or show success
    await this.page.waitForURL(url => {
      const path = url.pathname;
      return path.includes('/verify-email-required') ||
             path.includes('/pending-approval') ||
             path.includes('/login') ||
             path.includes('/registration-success');
    }, { timeout: 10000 });
  }

  async expectTeacherPendingApproval(): Promise<void> {
    await this.page.waitForURL(/\/pending-approval|\/verify-email/);
  }

  async expectStudentVerifyEmail(): Promise<void> {
    await this.page.waitForURL(/\/verify-email-required/);
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
