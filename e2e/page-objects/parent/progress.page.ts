import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ParentProgressPage extends BasePage {
  readonly overallPerformance: Locator;
  readonly subjectBreakdown: Locator;
  readonly homeworkCompletion: Locator;
  readonly progressChart: Locator;
  readonly subjectCard: Locator;
  readonly gradeDisplay: Locator;

  constructor(page: Page) {
    super(page);
    this.overallPerformance = page.locator('[data-testid="overall-performance"]').or(page.getByText(/overall|performance/i).first());
    this.subjectBreakdown = page.locator('[data-testid="subject-breakdown"]').or(page.getByText(/subject/i).first());
    this.homeworkCompletion = page.locator('[data-testid="homework-completion"]').or(page.getByText(/homework|completion/i).first());
    this.progressChart = page.locator('[data-testid="progress-chart"], .progress-chart, canvas');
    this.subjectCard = page.locator('[data-testid="subject-card"], .subject-card');
    this.gradeDisplay = page.locator('[data-testid="grade-display"]');
  }

  get path(): string {
    return '/parent';
  }

  async viewSubjectDetail(): Promise<void> {
    if (await this.subjectCard.first().isVisible().catch(() => false)) {
      await this.subjectCard.first().click();
      await this.page.waitForTimeout(1000);
    }
  }

  async viewHomeworkCompletion(): Promise<void> {
    if (await this.homeworkCompletion.isVisible().catch(() => false)) {
      await this.homeworkCompletion.click();
      await this.page.waitForTimeout(1000);
    }
  }

  // Assertions
  async expectProgressVisible(): Promise<void> {
    const hasPerformance = await this.overallPerformance.isVisible().catch(() => false);
    const hasAny = await this.page.getByText(/progress|performance|score|grade/i).first().isVisible().catch(() => false);
    expect(hasPerformance || hasAny).toBeTruthy();
  }

  async expectSubjectBreakdownVisible(): Promise<void> {
    const hasBreakdown = await this.subjectBreakdown.isVisible().catch(() => false);
    const hasSubject = await this.page.getByText(/math|science|english|subject/i).first().isVisible().catch(() => false);
    expect(hasBreakdown || hasSubject).toBeTruthy();
  }

  async expectHomeworkCompletionVisible(): Promise<void> {
    const hasCompletion = await this.homeworkCompletion.isVisible().catch(() => false);
    const hasHomework = await this.page.getByText(/homework|assignment/i).first().isVisible().catch(() => false);
    expect(hasCompletion || hasHomework).toBeTruthy();
  }
}
