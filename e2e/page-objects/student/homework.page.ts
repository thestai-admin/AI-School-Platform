import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentHomeworkPage extends BasePage {
  // Locators
  readonly homeworkList: Locator;
  readonly homeworkCard: Locator;
  readonly homeworkTitle: Locator;
  readonly dueDate: Locator;
  readonly statusBadge: Locator;
  readonly questionsArea: Locator;
  readonly answerInput: Locator;
  readonly submitButton: Locator;
  readonly feedbackArea: Locator;
  readonly gradeDisplay: Locator;
  readonly overdueIndicator: Locator;
  readonly statusFilter: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.homeworkList = this.getByTestId('homework-list');
    this.homeworkCard = this.getByTestId('homework-card');
    this.homeworkTitle = this.getByTestId('homework-title');
    this.dueDate = this.getByTestId('due-date');
    this.statusBadge = this.getByTestId('status-badge');
    this.questionsArea = this.getByTestId('questions-area');
    this.answerInput = this.getByTestId('answer-input');
    this.submitButton = this.getByRole('button', { name: /submit/i });
    this.feedbackArea = this.getByTestId('feedback-area');
    this.gradeDisplay = this.getByTestId('grade-display');
    this.overdueIndicator = this.getByTestId('overdue-indicator');
    this.statusFilter = this.getByTestId('status-filter');
    this.emptyState = this.getByTestId('empty-state');
  }

  get path(): string {
    return '/student/homework';
  }

  // Actions
  async viewHomework(id: string): Promise<void> {
    await this.gotoPath(`/student/homework/${id}`);
    await this.waitForPageLoad();
  }

  async submitAnswers(): Promise<void> {
    await this.clickButton(/submit/i);
    await this.waitForPageLoad();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.waitForPageLoad();
  }

  // Assertions
  async expectToBeOnHomeworkPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/homework/);
  }

  async expectHomeworkListVisible(): Promise<void> {
    await expect(this.homeworkList).toBeVisible();
  }

  async expectHomeworkDetailVisible(): Promise<void> {
    await expect(this.homeworkTitle).toBeVisible();
    await expect(this.questionsArea).toBeVisible();
  }

  async expectSubmissionSuccess(): Promise<void> {
    await expect(this.page.getByText(/submitted successfully/i)).toBeVisible();
  }

  async expectFeedbackVisible(): Promise<void> {
    await expect(this.feedbackArea).toBeVisible();
  }

  async expectGradeVisible(): Promise<void> {
    await expect(this.gradeDisplay).toBeVisible();
  }

  async expectOverdueIndicator(): Promise<void> {
    await expect(this.overdueIndicator).toBeVisible();
  }
}
