import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentCompanionPage extends BasePage {
  // Locators
  readonly sessionTypeSelect: Locator;
  readonly subjectSelect: Locator;
  readonly startButton: Locator;
  readonly chatArea: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly aiResponse: Locator;
  readonly endSessionButton: Locator;
  readonly summaryArea: Locator;
  readonly analyticsSection: Locator;
  readonly historyList: Locator;
  readonly featureGateMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.sessionTypeSelect = this.getByTestId('session-type-select');
    this.subjectSelect = this.getByTestId('subject-select');
    this.startButton = this.getByRole('button', { name: /start/i });
    this.chatArea = this.getByTestId('chat-area');
    this.messageInput = this.getByTestId('message-input');
    this.sendButton = this.getByRole('button', { name: /send/i });
    this.aiResponse = this.getByTestId('ai-response');
    this.endSessionButton = this.getByRole('button', { name: /end session/i });
    this.summaryArea = this.getByTestId('summary-area');
    this.analyticsSection = this.getByTestId('analytics-section');
    this.historyList = this.getByTestId('history-list');
    this.featureGateMessage = this.getByTestId('feature-gate-message');
  }

  get path(): string {
    return '/student/companion';
  }

  // Actions
  async startSession(type: string, subject: string): Promise<void> {
    await this.sessionTypeSelect.click();
    await this.page.getByRole('option', { name: type }).click();

    await this.subjectSelect.click();
    await this.page.getByRole('option', { name: subject }).click();

    await this.startButton.click();
    await this.waitForPageLoad();
  }

  async sendMessage(msg: string): Promise<void> {
    await this.messageInput.fill(msg);
    await this.sendButton.click();
  }

  async sendMessageAndWait(msg: string): Promise<void> {
    await this.sendMessage(msg);
    await expect(this.aiResponse.last()).toBeVisible({ timeout: 30000 });
  }

  async endSession(): Promise<void> {
    await this.endSessionButton.click();
    await this.waitForPageLoad();
  }

  async viewAnalytics(): Promise<void> {
    await this.page.getByRole('link', { name: /analytics/i }).click();
    await this.waitForNavigation();
  }

  async viewHistory(): Promise<void> {
    await this.page.getByRole('link', { name: /history/i }).click();
    await this.waitForNavigation();
  }

  // Assertions
  async expectToBeOnCompanionPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/companion/);
  }

  async expectFeatureGated(): Promise<void> {
    await expect(this.featureGateMessage).toBeVisible();
  }

  async expectSessionActive(): Promise<void> {
    await expect(this.chatArea).toBeVisible();
    await expect(this.messageInput).toBeVisible();
  }

  async expectAIResponse(): Promise<void> {
    await expect(this.aiResponse.last()).toBeVisible({ timeout: 30000 });
  }

  async expectSummaryVisible(): Promise<void> {
    await expect(this.summaryArea).toBeVisible();
  }

  async expectAnalyticsVisible(): Promise<void> {
    await expect(this.analyticsSection).toBeVisible();
  }
}
