import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentDashboardPage extends BasePage {
  // Navigation
  readonly chatLink: Locator;
  readonly worksheetsLink: Locator;
  readonly homeworkLink: Locator;
  readonly progressLink: Locator;
  readonly diagramsLink: Locator;
  readonly studyCompanionLink: Locator;
  readonly logoutButton: Locator;

  // Dashboard elements
  readonly welcomeHeading: Locator;
  readonly statsCards: Locator;
  readonly pendingHomework: Locator;
  readonly recentProgress: Locator;
  readonly upcomingDeadlines: Locator;

  // Quick action buttons
  readonly startChatButton: Locator;
  readonly viewHomeworkButton: Locator;
  readonly practiceButton: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation links
    this.chatLink = page.getByRole('link', { name: /chat|ai tutor/i });
    this.worksheetsLink = page.getByRole('link', { name: /worksheets/i });
    this.homeworkLink = page.getByRole('link', { name: /homework/i });
    this.progressLink = page.getByRole('link', { name: /progress/i });
    this.diagramsLink = page.getByRole('link', { name: /diagrams/i });
    this.studyCompanionLink = page.getByRole('link', { name: /study companion|study/i });
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    // Dashboard elements
    this.welcomeHeading = page.getByRole('heading', { name: /welcome|dashboard/i });
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card, .stat-card');
    this.pendingHomework = page.locator('[data-testid="pending-homework"], .pending-homework');
    this.recentProgress = page.locator('[data-testid="recent-progress"], .recent-progress');
    this.upcomingDeadlines = page.locator('[data-testid="upcoming-deadlines"], .upcoming-deadlines');

    // Quick action buttons
    this.startChatButton = page.getByRole('button', { name: /start chat|ask ai|chat with ai/i }).or(
      page.getByRole('link', { name: /start chat|ask ai|chat with ai/i })
    );
    this.viewHomeworkButton = page.getByRole('button', { name: /view homework|my homework/i }).or(
      page.getByRole('link', { name: /view homework|my homework/i })
    );
    this.practiceButton = page.getByRole('button', { name: /practice|start practice/i }).or(
      page.getByRole('link', { name: /practice|start practice/i })
    );
  }

  get path(): string {
    return '/student/dashboard';
  }

  // Navigation actions
  async navigateToChat(): Promise<void> {
    await this.chatLink.click();
    await this.page.waitForURL(/\/student\/chat/);
  }

  async navigateToWorksheets(): Promise<void> {
    await this.worksheetsLink.click();
    await this.page.waitForURL(/\/student\/worksheets/);
  }

  async navigateToHomework(): Promise<void> {
    await this.homeworkLink.click();
    await this.page.waitForURL(/\/student\/homework/);
  }

  async navigateToProgress(): Promise<void> {
    await this.progressLink.click();
    await this.page.waitForURL(/\/student\/progress/);
  }

  async navigateToDiagrams(): Promise<void> {
    await this.diagramsLink.click();
    await this.page.waitForURL(/\/student\/diagrams/);
  }

  async navigateToStudyCompanion(): Promise<void> {
    await this.studyCompanionLink.click();
    await this.page.waitForURL(/\/student\/study/);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/);
  }

  // Quick actions
  async clickStartChat(): Promise<void> {
    await this.startChatButton.click();
  }

  async clickViewHomework(): Promise<void> {
    await this.viewHomeworkButton.click();
  }

  async clickPractice(): Promise<void> {
    await this.practiceButton.click();
  }

  // Assertions
  async expectToBeOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student/);
  }

  async expectWelcomeMessage(studentName?: string): Promise<void> {
    await expect(this.welcomeHeading).toBeVisible();
    if (studentName) {
      await expect(this.page.getByText(studentName)).toBeVisible();
    }
  }

  async expectStatsCardsVisible(): Promise<void> {
    await expect(this.statsCards.first()).toBeVisible();
  }

  async expectPendingHomeworkVisible(): Promise<void> {
    await expect(this.pendingHomework).toBeVisible();
  }

  async expectStudentNavigation(): Promise<void> {
    await expect(this.chatLink).toBeVisible();
    await expect(this.homeworkLink).toBeVisible();
    await expect(this.progressLink).toBeVisible();
  }

  async expectHomeworkCount(count: number): Promise<void> {
    const badge = this.page.locator('[data-testid="homework-count"], .homework-count');
    if (count > 0) {
      await expect(badge).toContainText(count.toString());
    }
  }
}
