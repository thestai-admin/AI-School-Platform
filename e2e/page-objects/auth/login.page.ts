import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleSignInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
    this.googleSignInButton = page.getByRole('button', { name: /google|continue with google/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
    this.errorAlert = page.locator('[role="alert"]');
  }

  get path(): string {
    return '/login';
  }

  // Actions
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndWaitForRedirect(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(url => {
      const path = url.pathname;
      return !path.includes('/login') && (
        path.includes('/dashboard') ||
        path.includes('/admin') ||
        path.includes('/teacher') ||
        path.includes('/student') ||
        path.includes('/parent') ||
        path.includes('/pending-approval') ||
        path.includes('/verify-email-required') ||
        path.includes('/account-suspended') ||
        path.includes('/account-rejected')
      );
    }, { timeout: 15000 });
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async clickGoogleSignIn(): Promise<void> {
    await this.googleSignInButton.click();
  }

  // Assertions
  async expectLoginError(message?: string | RegExp): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      if (typeof message === 'string') {
        await expect(this.errorAlert).toContainText(message);
      } else {
        await expect(this.errorAlert).toHaveText(message);
      }
    }
  }

  async expectToBeOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async expectFormValidationError(): Promise<void> {
    // Check for HTML5 validation or custom validation errors
    const emailError = this.page.locator('[aria-describedby*="email"]');
    const passwordError = this.page.locator('[aria-describedby*="password"]');
    const validationError = this.page.locator('.text-red-500, .error, [role="alert"]');

    const hasError = await Promise.race([
      emailError.isVisible().catch(() => false),
      passwordError.isVisible().catch(() => false),
      validationError.isVisible().catch(() => false),
    ]);

    expect(hasError).toBeTruthy();
  }

  async expectRedirectToDashboard(role: 'admin' | 'teacher' | 'student' | 'parent'): Promise<void> {
    const expectedPath = `/${role}`;
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  async expectRedirectToPendingApproval(): Promise<void> {
    await expect(this.page).toHaveURL(/\/pending-approval/);
  }

  async expectRedirectToVerifyEmail(): Promise<void> {
    await expect(this.page).toHaveURL(/\/verify-email-required/);
  }

  async expectRedirectToSuspended(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account-suspended/);
  }

  async expectRedirectToRejected(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account-rejected/);
  }
}
