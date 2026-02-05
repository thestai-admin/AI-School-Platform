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

    // Navigation links - sidebar uses "Ask Doubt" for chat, "Practice" for worksheets
    this.chatLink = page.getByRole('link', { name: /ask doubt|chat|ai tutor/i }).first();
    this.worksheetsLink = page.getByRole('link', { name: /practice|worksheets/i }).first();
    this.homeworkLink = page.getByRole('link', { name: /homework/i }).first();
    this.progressLink = page.getByRole('link', { name: /progress|analytics/i }).first();
    this.diagramsLink = page.getByRole('link', { name: /diagrams/i }).first();
    this.studyCompanionLink = page.getByRole('link', { name: /ai companion|study companion|study/i }).first();
    this.logoutButton = page.getByRole('button', { name: /logout/i });

    // Dashboard elements - actual UI uses "Hello, {name}!" heading
    this.welcomeHeading = page.getByRole('heading', { name: /hello|welcome|dashboard/i }).first();
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card, .stat-card');
    this.pendingHomework = page.locator('[data-testid="pending-homework"], .pending-homework');
    this.recentProgress = page.locator('[data-testid="recent-progress"], .recent-progress');
    this.upcomingDeadlines = page.locator('[data-testid="upcoming-deadlines"], .upcoming-deadlines');

    // Quick action buttons - these are links in cards on the dashboard
    this.startChatButton = page.getByRole('link', { name: /ask a doubt|ask doubt|start chat|ask ai/i }).first();
    this.viewHomeworkButton = page.getByRole('link', { name: /view homework|my homework|homework/i }).first();
    this.practiceButton = page.getByRole('link', { name: /practice worksheets|practice|start practice/i }).first();
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
    // Try to click the progress link from dashboard card first, or analytics link from sidebar
    const progressCardLink = this.page.getByRole('link', { name: /my progress/i });
    if (await progressCardLink.isVisible().catch(() => false)) {
      await progressCardLink.click();
      await this.page.waitForURL(/\/student\/progress/);
    } else {
      await this.progressLink.click();
      await this.page.waitForURL(/\/student\/(progress|analytics)/);
    }
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
    // Sidebar has "Ask Doubt", "Practice", "Analytics" links
    await expect(this.chatLink).toBeVisible();
    await expect(this.worksheetsLink).toBeVisible();
    // Progress/Analytics link
    await expect(this.progressLink).toBeVisible();
  }

  async expectHomeworkCount(count: number): Promise<void> {
    const badge = this.page.locator('[data-testid="homework-count"], .homework-count');
    if (count > 0) {
      await expect(badge).toContainText(count.toString());
    }
  }
}
