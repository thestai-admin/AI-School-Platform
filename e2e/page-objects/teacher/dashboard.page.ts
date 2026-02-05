import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherDashboardPage extends BasePage {
  // Navigation
  readonly lessonsLink: Locator;
  readonly worksheetsLink: Locator;
  readonly homeworkLink: Locator;
  readonly diagramsLink: Locator;
  readonly trainingLink: Locator;
  readonly communityLink: Locator;
  readonly logoutButton: Locator;

  // Dashboard elements
  readonly welcomeHeading: Locator;
  readonly statsCards: Locator;
  readonly quickActions: Locator;
  readonly recentLessons: Locator;
  readonly pendingHomework: Locator;

  // Quick action buttons
  readonly createLessonButton: Locator;
  readonly createWorksheetButton: Locator;
  readonly assignHomeworkButton: Locator;
  readonly createDiagramButton: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation links - sidebar uses "Create Lesson", "Create Worksheet" labels
    this.lessonsLink = page.getByRole('link', { name: /create lesson|lessons/i }).first();
    this.worksheetsLink = page.getByRole('link', { name: /create worksheet|worksheets/i }).first();
    this.homeworkLink = page.getByRole('link', { name: /homework/i }).first();
    this.diagramsLink = page.getByRole('link', { name: /diagrams/i }).first();
    this.trainingLink = page.getByRole('link', { name: /training/i }).first();
    this.communityLink = page.getByRole('link', { name: /community/i }).first();
    this.logoutButton = page.getByRole('button', { name: /logout/i });

    // Dashboard elements - actual UI uses "Welcome back, {name}!" heading
    this.welcomeHeading = page.getByRole('heading', { name: /welcome|dashboard/i }).first();
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card, .stat-card');
    this.quickActions = page.locator('[data-testid="quick-actions"], .quick-actions');
    this.recentLessons = page.locator('[data-testid="recent-lessons"], .recent-lessons');
    this.pendingHomework = page.locator('[data-testid="pending-homework"], .pending-homework');

    // Quick action buttons - these are links in cards on the dashboard
    this.createLessonButton = page.getByRole('link', { name: /create lesson plan|create lesson|new lesson/i }).first();
    this.createWorksheetButton = page.getByRole('link', { name: /generate worksheet|create worksheet|new worksheet/i }).first();
    this.assignHomeworkButton = page.getByRole('link', { name: /assign homework|new homework/i }).first();
    this.createDiagramButton = page.getByRole('link', { name: /create diagram|new diagram/i }).first();
  }

  get path(): string {
    return '/teacher/dashboard';
  }

  // Navigation actions
  async navigateToLessons(): Promise<void> {
    await this.lessonsLink.click();
    await this.page.waitForURL(/\/teacher\/lessons/);
  }

  async navigateToWorksheets(): Promise<void> {
    await this.worksheetsLink.click();
    await this.page.waitForURL(/\/teacher\/worksheets/);
  }

  async navigateToHomework(): Promise<void> {
    await this.homeworkLink.click();
    await this.page.waitForURL(/\/teacher\/homework/);
  }

  async navigateToDiagrams(): Promise<void> {
    await this.diagramsLink.click();
    await this.page.waitForURL(/\/teacher\/diagrams/);
  }

  async navigateToTraining(): Promise<void> {
    await this.trainingLink.click();
    await this.page.waitForURL(/\/teacher\/training/);
  }

  async navigateToCommunity(): Promise<void> {
    await this.communityLink.click();
    await this.page.waitForURL(/\/teacher\/community/);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/);
  }

  // Quick actions
  async clickCreateLesson(): Promise<void> {
    await this.createLessonButton.click();
  }

  async clickCreateWorksheet(): Promise<void> {
    await this.createWorksheetButton.click();
  }

  async clickAssignHomework(): Promise<void> {
    await this.assignHomeworkButton.click();
  }

  async clickCreateDiagram(): Promise<void> {
    await this.createDiagramButton.click();
  }

  // Assertions
  async expectToBeOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher/);
  }

  async expectWelcomeMessage(teacherName?: string): Promise<void> {
    await expect(this.welcomeHeading).toBeVisible();
    if (teacherName) {
      await expect(this.page.getByText(teacherName)).toBeVisible();
    }
  }

  async expectStatsCardsVisible(): Promise<void> {
    await expect(this.statsCards.first()).toBeVisible();
  }

  async expectQuickActionsVisible(): Promise<void> {
    await expect(this.quickActions).toBeVisible();
  }

  async expectTeacherNavigation(): Promise<void> {
    // Sidebar has "Create Lesson", "Create Worksheet" links
    await expect(this.lessonsLink).toBeVisible();
    await expect(this.worksheetsLink).toBeVisible();
    // Students link exists in sidebar
    await expect(this.page.getByRole('link', { name: /students/i }).first()).toBeVisible();
  }
}
