import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminDashboardPage extends BasePage {
  readonly statsCards: Locator;
  readonly teacherCount: Locator;
  readonly studentCount: Locator;
  readonly classCount: Locator;
  readonly recentActivity: Locator;
  readonly homeworkSummary: Locator;
  readonly studentsLink: Locator;
  readonly classesLink: Locator;
  readonly analyticsLink: Locator;
  readonly subscriptionsLink: Locator;
  readonly teachersLink: Locator;

  constructor(page: Page) {
    super(page);
    this.statsCards = page.locator('[data-testid="stats-cards"], .stats-cards, .dashboard-stats');
    this.teacherCount = page.locator('[data-testid="teacher-count"]').or(page.getByText(/teacher/i).first());
    this.studentCount = page.locator('[data-testid="student-count"]').or(page.getByText(/student/i).first());
    this.classCount = page.locator('[data-testid="class-count"]').or(page.getByText(/class/i).first());
    this.recentActivity = page.locator('[data-testid="recent-activity"], .recent-activity');
    this.homeworkSummary = page.locator('[data-testid="homework-summary"]');
    this.studentsLink = page.getByRole('link', { name: /students/i }).or(page.locator('[data-testid="students-link"]'));
    this.classesLink = page.getByRole('link', { name: /classes/i }).or(page.locator('[data-testid="classes-link"]'));
    this.analyticsLink = page.getByRole('link', { name: /analytics/i }).or(page.locator('[data-testid="analytics-link"]'));
    this.subscriptionsLink = page.getByRole('link', { name: /subscription/i }).or(page.locator('[data-testid="subscriptions-link"]'));
    this.teachersLink = page.getByRole('link', { name: /teachers/i }).or(page.locator('[data-testid="teachers-link"]'));
  }

  get path(): string {
    return '/admin';
  }

  async navigateToStudents(): Promise<void> {
    await this.studentsLink.click();
    await this.waitForNavigation();
  }

  async navigateToClasses(): Promise<void> {
    await this.classesLink.click();
    await this.waitForNavigation();
  }

  async navigateToAnalytics(): Promise<void> {
    await this.analyticsLink.click();
    await this.waitForNavigation();
  }

  async navigateToSubscriptions(): Promise<void> {
    await this.subscriptionsLink.click();
    await this.waitForNavigation();
  }

  async navigateToTeachers(): Promise<void> {
    await this.teachersLink.click();
    await this.waitForNavigation();
  }

  // Assertions
  async expectToBeOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin/);
  }

  async expectStatsVisible(): Promise<void> {
    // Stats might be individual cards or a container
    const hasStats = await this.statsCards.isVisible().catch(() => false);
    const hasTeacherCount = await this.teacherCount.isVisible().catch(() => false);
    const hasStudentCount = await this.studentCount.isVisible().catch(() => false);
    expect(hasStats || hasTeacherCount || hasStudentCount).toBeTruthy();
  }

  async expectRecentActivityVisible(): Promise<void> {
    const hasActivity = await this.recentActivity.isVisible().catch(() => false);
    const hasAnyContent = await this.page.getByText(/recent|activity|overview/i).first().isVisible().catch(() => false);
    expect(hasActivity || hasAnyContent).toBeTruthy();
  }
}
