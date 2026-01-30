import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  protected readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  }

  // Abstract method - each page must define its own path
  abstract get path(): string;

  // Navigation
  async goto(): Promise<void> {
    await this.page.goto(`${this.baseURL}${this.path}`);
  }

  async gotoPath(path: string): Promise<void> {
    await this.page.goto(`${this.baseURL}${path}`);
  }

  // Wait helpers
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForURL(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }

  // Common element getters
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByLabel(text, options);
  }

  getByPlaceholder(text: string | RegExp, options?: { exact?: boolean }): Locator {
    return this.page.getByPlaceholder(text, options);
  }

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  // Alert/Toast messages
  async getErrorMessage(): Promise<string | null> {
    const errorSelectors = [
      '[role="alert"]',
      '.error-message',
      '.text-red-500',
      '.text-red-600',
      '[data-testid="error-message"]',
    ];

    for (const selector of errorSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible()) {
        return await element.textContent();
      }
    }

    return null;
  }

  async getSuccessMessage(): Promise<string | null> {
    const successSelectors = [
      '[role="status"]',
      '.success-message',
      '.text-green-500',
      '.text-green-600',
      '[data-testid="success-message"]',
    ];

    for (const selector of successSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible()) {
        return await element.textContent();
      }
    }

    return null;
  }

  async expectErrorMessage(message: string | RegExp): Promise<void> {
    const error = await this.getErrorMessage();
    if (typeof message === 'string') {
      expect(error).toContain(message);
    } else {
      expect(error).toMatch(message);
    }
  }

  async expectSuccessMessage(message: string | RegExp): Promise<void> {
    const success = await this.getSuccessMessage();
    if (typeof message === 'string') {
      expect(success).toContain(message);
    } else {
      expect(success).toMatch(message);
    }
  }

  // Form helpers
  async fillInput(label: string | RegExp, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  async clickButton(name: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name }).click();
  }

  async selectOption(label: string | RegExp, value: string): Promise<void> {
    await this.page.getByLabel(label).selectOption(value);
  }

  // Assertions
  async expectToBeOnPage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(this.path));
  }

  async expectTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  async expectHeading(text: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  async expectElementVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  // Screenshots
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `playwright-results/screenshots/${name}.png` });
  }

  // URL helpers
  getCurrentURL(): string {
    return this.page.url();
  }

  getCurrentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  // Keyboard actions
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
