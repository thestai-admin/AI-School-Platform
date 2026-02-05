import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ParentDashboardPage extends BasePage {
  readonly childInfo: Locator;
  readonly childName: Locator;
  readonly progressSummary: Locator;
  readonly homeworkLink: Locator;
  readonly diagramsLink: Locator;
  readonly logoutButton: Locator;
  readonly welcomeHeading: Locator;
  readonly recentUpdates: Locator;

  constructor(page: Page) {
    super(page);
    this.childInfo = page.locator('[data-testid="child-info"]').or(page.getByText(/child|student/i).first());
    this.childName = page.locator('[data-testid="child-name"]').or(page.getByText(/Test Student/i));
    this.progressSummary = page.locator('[data-testid="progress-summary"], .progress-summary');
    this.homeworkLink = page.getByRole('link', { name: /homework/i }).or(page.locator('[data-testid="homework-link"]'));
    this.diagramsLink = page.getByRole('link', { name: /diagram/i }).or(page.locator('[data-testid="diagrams-link"]'));
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i }).or(page.locator('[data-testid="logout-button"]'));
    this.welcomeHeading = page.getByRole('heading').first();
    this.recentUpdates = page.locator('[data-testid="recent-updates"]');
  }

  get path(): string {
    return '/parent';
  }

  async navigateToHomework(): Promise<void> {
    await this.homeworkLink.click();
    await this.waitForNavigation();
  }

  async navigateToDiagrams(): Promise<void> {
    await this.diagramsLink.click();
    await this.waitForNavigation();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForTimeout(2000);
  }

  // Assertions
  async expectToBeOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/parent/);
  }

  async expectChildInfoVisible(): Promise<void> {
    const hasInfo = await this.childInfo.isVisible().catch(() => false);
    const hasName = await this.childName.isVisible().catch(() => false);
    const hasAny = await this.page.getByText(/child|student|progress/i).first().isVisible().catch(() => false);
    expect(hasInfo || hasName || hasAny).toBeTruthy();
  }

  async expectProgressSummaryVisible(): Promise<void> {
    const hasSummary = await this.progressSummary.isVisible().catch(() => false);
    const hasAny = await this.page.getByText(/progress|performance|score/i).first().isVisible().catch(() => false);
    expect(hasSummary || hasAny).toBeTruthy();
  }

  async expectParentNavigation(): Promise<void> {
    const hasHomework = await this.homeworkLink.isVisible().catch(() => false);
    const hasDiagrams = await this.diagramsLink.isVisible().catch(() => false);
    expect(hasHomework || hasDiagrams).toBeTruthy();
  }
}
