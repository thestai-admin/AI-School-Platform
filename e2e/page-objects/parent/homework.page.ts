import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ParentHomeworkPage extends BasePage {
  readonly homeworkList: Locator;
  readonly homeworkCard: Locator;
  readonly childName: Locator;
  readonly submissionStatus: Locator;
  readonly gradeDisplay: Locator;
  readonly feedbackArea: Locator;
  readonly dueDateDisplay: Locator;
  readonly statusFilter: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.homeworkList = page.locator('[data-testid="homework-list"], .homework-list, .homework-grid');
    this.homeworkCard = page.locator('[data-testid="homework-card"], .homework-card, .homework-item');
    this.childName = page.locator('[data-testid="child-name"]').or(page.getByText(/Test Student/i));
    this.submissionStatus = page.locator('[data-testid="submission-status"]').or(page.getByText(/submitted|pending|graded/i).first());
    this.gradeDisplay = page.locator('[data-testid="grade-display"]').or(page.getByText(/score|grade|marks/i).first());
    this.feedbackArea = page.locator('[data-testid="feedback-area"], .feedback, .ai-feedback');
    this.dueDateDisplay = page.locator('[data-testid="due-date"]').or(page.getByText(/due/i).first());
    this.statusFilter = page.getByLabel(/status|filter/i).or(page.locator('[data-testid="status-filter"]'));
    this.emptyState = page.getByText(/no homework|empty/i);
  }

  get path(): string {
    return '/parent/homework';
  }

  async viewHomeworkDetail(): Promise<void> {
    await this.homeworkCard.first().click();
    await this.page.waitForTimeout(1000);
  }

  async filterByStatus(status: string): Promise<void> {
    if (await this.statusFilter.isVisible().catch(() => false)) {
      await this.statusFilter.selectOption(status);
      await this.page.waitForTimeout(1000);
    }
  }

  // Assertions
  async expectToBeOnHomeworkPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/parent\/homework/);
  }

  async expectHomeworkListVisible(): Promise<void> {
    const hasList = await this.homeworkList.isVisible().catch(() => false);
    const hasCards = await this.homeworkCard.first().isVisible().catch(() => false);
    const hasEmpty = await this.emptyState.isVisible().catch(() => false);
    expect(hasList || hasCards || hasEmpty).toBeTruthy();
  }

  async expectSubmissionStatusVisible(): Promise<void> {
    const hasStatus = await this.submissionStatus.isVisible().catch(() => false);
    expect(hasStatus).toBeTruthy();
  }

  async expectGradeVisible(): Promise<void> {
    const hasGrade = await this.gradeDisplay.isVisible().catch(() => false);
    expect(hasGrade).toBeTruthy();
  }

  async expectFeedbackVisible(): Promise<void> {
    const hasFeedback = await this.feedbackArea.isVisible().catch(() => false);
    expect(hasFeedback).toBeTruthy();
  }
}
