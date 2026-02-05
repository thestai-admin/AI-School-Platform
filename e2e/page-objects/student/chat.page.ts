import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentChatPage extends BasePage {
  // Chat interface elements
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly chatMessages: Locator;
  readonly userMessages: Locator;
  readonly aiMessages: Locator;
  readonly loadingIndicator: Locator;

  // Subject/Topic selection
  readonly subjectSelect: Locator;
  readonly topicInput: Locator;
  readonly newChatButton: Locator;

  // Chat history
  readonly chatHistoryList: Locator;
  readonly chatHistoryItem: Locator;

  // Error states
  readonly errorMessage: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    super(page);

    // Chat interface - actual UI uses specific classes
    this.messageInput = page.getByPlaceholder(/type your question here/i).or(
      page.locator('input[type="text"]').filter({ hasText: '' })
    );
    this.sendButton = page.locator('button[type="submit"]');
    this.chatMessages = page.locator('.space-y-4').first();
    // User messages are in blue bubbles (bg-blue-600), AI messages in gray (bg-gray-100)
    this.userMessages = page.locator('.bg-blue-600.text-white.rounded-2xl');
    this.aiMessages = page.locator('.bg-gray-100.text-gray-800.rounded-2xl');
    // Loading indicator shows bouncing dots
    this.loadingIndicator = page.locator('.animate-bounce').first();

    // Subject/Topic selection - actual UI uses Select component without label
    this.subjectSelect = page.locator('select').first();
    this.topicInput = page.getByLabel(/topic/i).or(page.locator('input[name="topic"]'));
    // Clear button is used instead of "new chat"
    this.newChatButton = page.getByRole('button', { name: /clear/i });

    // Chat history
    this.chatHistoryList = page.locator('[data-testid="chat-history"], .chat-history');
    this.chatHistoryItem = page.locator('[data-testid="chat-history-item"], .chat-history-item');

    // Error states
    this.errorMessage = page.locator('[role="alert"], .error-message');
    this.retryButton = page.getByRole('button', { name: /retry|try again/i });
  }

  get path(): string {
    return '/student/chat';
  }

  // Actions
  async sendMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  async sendMessageAndWaitForResponse(message: string): Promise<void> {
    const currentMessageCount = await this.aiMessages.count();

    await this.sendMessage(message);

    // Wait for loading to appear
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Wait for loading to disappear (AI response received)
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});

    // Wait for new AI message
    await expect(this.aiMessages).toHaveCount(currentMessageCount + 1, { timeout: 60000 });
  }

  async selectSubject(subject: string): Promise<void> {
    await this.subjectSelect.selectOption(subject);
  }

  async setTopic(topic: string): Promise<void> {
    await this.topicInput.fill(topic);
  }

  async startNewChat(): Promise<void> {
    await this.newChatButton.click();
  }

  async clickChatHistoryItem(index: number): Promise<void> {
    await this.chatHistoryItem.nth(index).click();
  }

  async retry(): Promise<void> {
    await this.retryButton.click();
  }

  // Getters
  async getLastUserMessage(): Promise<string | null> {
    const messages = await this.userMessages.all();
    if (messages.length === 0) return null;
    return await messages[messages.length - 1].textContent();
  }

  async getLastAIMessage(): Promise<string | null> {
    const messages = await this.aiMessages.all();
    if (messages.length === 0) return null;
    return await messages[messages.length - 1].textContent();
  }

  async getMessageCount(): Promise<{ user: number; ai: number }> {
    return {
      user: await this.userMessages.count(),
      ai: await this.aiMessages.count(),
    };
  }

  // Assertions
  async expectToBeOnChatPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/chat/);
    await expect(this.messageInput).toBeVisible();
  }

  async expectChatInterfaceVisible(): Promise<void> {
    await expect(this.messageInput).toBeVisible();
    await expect(this.sendButton).toBeVisible();
  }

  async expectMessageSent(message: string): Promise<void> {
    await expect(this.userMessages.last()).toContainText(message);
  }

  async expectAIResponse(): Promise<void> {
    await expect(this.aiMessages.last()).toBeVisible();
    const text = await this.aiMessages.last().textContent();
    expect(text?.length).toBeGreaterThan(0);
  }

  async expectAIResponseContains(text: string | RegExp): Promise<void> {
    if (typeof text === 'string') {
      await expect(this.aiMessages.last()).toContainText(text);
    } else {
      await expect(this.aiMessages.last()).toHaveText(text);
    }
  }

  async expectLoading(): Promise<void> {
    await expect(this.loadingIndicator).toBeVisible();
  }

  async expectNotLoading(): Promise<void> {
    await expect(this.loadingIndicator).toBeHidden();
  }

  async expectError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectEmptyChat(): Promise<void> {
    await expect(this.userMessages).toHaveCount(0);
    await expect(this.aiMessages).toHaveCount(0);
  }

  async expectChatHistory(): Promise<void> {
    await expect(this.chatHistoryList).toBeVisible();
  }

  async expectChatHistoryCount(count: number): Promise<void> {
    await expect(this.chatHistoryItem).toHaveCount(count);
  }
}
