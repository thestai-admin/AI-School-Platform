import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentProgressPage extends BasePage {
  // Locators
  readonly overallStats: Locator;
  readonly subjectBreakdown: Locator;
  readonly homeworkStats: Locator;
  readonly worksheetStats: Locator;
  readonly progressChart: Locator;
  readonly streakDisplay: Locator;
  readonly subjectCard: Locator;
  readonly percentageDisplay: Locator;

  constructor(page: Page) {
    super(page);
    this.overallStats = this.getByTestId('overall-stats');
    this.subjectBreakdown = this.getByTestId('subject-breakdown');
    this.homeworkStats = this.getByTestId('homework-stats');
    this.worksheetStats = this.getByTestId('worksheet-stats');
    this.progressChart = this.getByTestId('progress-chart');
    this.streakDisplay = this.getByTestId('streak-display');
    this.subjectCard = this.getByTestId('subject-card');
    this.percentageDisplay = this.getByTestId('percentage-display');
  }

  get path(): string {
    return '/student/progress';
  }

  // Actions
  async viewSubjectDetail(subject: string): Promise<void> {
    const subjectCard = this.page.getByTestId('subject-card').filter({ hasText: subject });
    await subjectCard.click();
    await this.waitForNavigation();
  }

  async navigateToAnalytics(): Promise<void> {
    await this.page.getByRole('link', { name: /analytics/i }).click();
    await this.waitForNavigation();
  }

  // Assertions
  async expectToBeOnProgressPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/progress/);
  }

  async expectOverallStatsVisible(): Promise<void> {
    await expect(this.overallStats).toBeVisible();
  }

  async expectSubjectBreakdownVisible(): Promise<void> {
    await expect(this.subjectBreakdown).toBeVisible();
    await expect(this.subjectCard.first()).toBeVisible();
  }

  async expectHomeworkStatsVisible(): Promise<void> {
    await expect(this.homeworkStats).toBeVisible();
  }
}
