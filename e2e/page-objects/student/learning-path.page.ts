import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentLearningPathPage extends BasePage {
  // Locators
  readonly pathOverview: Locator;
  readonly milestonesList: Locator;
  readonly milestoneCard: Locator;
  readonly milestoneProgress: Locator;
  readonly currentMilestone: Locator;
  readonly completedMilestones: Locator;
  readonly featureGateMessage: Locator;
  readonly generateButton: Locator;
  readonly pathDetail: Locator;

  constructor(page: Page) {
    super(page);
    this.pathOverview = this.getByTestId('path-overview');
    this.milestonesList = this.getByTestId('milestones-list');
    this.milestoneCard = this.getByTestId('milestone-card');
    this.milestoneProgress = this.getByTestId('milestone-progress');
    this.currentMilestone = this.getByTestId('current-milestone');
    this.completedMilestones = this.getByTestId('completed-milestones');
    this.featureGateMessage = this.getByTestId('feature-gate-message');
    this.generateButton = this.getByRole('button', { name: /generate/i });
    this.pathDetail = this.getByTestId('path-detail');
  }

  get path(): string {
    return '/student/learning-path';
  }

  // Actions
  async viewPath(): Promise<void> {
    await this.goto();
    await this.waitForPageLoad();
  }

  async viewMilestone(id: string): Promise<void> {
    const milestone = this.milestoneCard.filter({ has: this.page.locator(`[data-milestone-id="${id}"]`) });
    await milestone.click();
    await this.waitForNavigation();
  }

  async trackProgress(): Promise<void> {
    await this.page.getByRole('button', { name: /track progress/i }).click();
    await this.waitForPageLoad();
  }

  async generatePath(): Promise<void> {
    await this.generateButton.click();
    await this.waitForPageLoad();
  }

  // Assertions
  async expectToBeOnLearningPathPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/learning-path/);
  }

  async expectFeatureGated(): Promise<void> {
    await expect(this.featureGateMessage).toBeVisible();
  }

  async expectPathVisible(): Promise<void> {
    await expect(this.pathOverview).toBeVisible();
    await expect(this.pathDetail).toBeVisible();
  }

  async expectMilestonesVisible(): Promise<void> {
    await expect(this.milestonesList).toBeVisible();
    await expect(this.milestoneCard.first()).toBeVisible();
  }

  async expectProgressTracked(): Promise<void> {
    await expect(this.milestoneProgress).toBeVisible();
  }
}
