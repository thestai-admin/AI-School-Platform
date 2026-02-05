import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherTrainingPage extends BasePage {
  readonly categoriesList: Locator;
  readonly categoryCard: Locator;
  readonly modulesList: Locator;
  readonly moduleCard: Locator;
  readonly moduleContent: Locator;
  readonly progressIndicator: Locator;
  readonly completeButton: Locator;
  readonly certificationBadge: Locator;
  readonly aiTipsSection: Locator;
  readonly insightsLink: Locator;
  readonly featureGateMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.categoriesList = page.locator('[data-testid="categories-list"], .categories-list, .training-categories');
    this.categoryCard = page.locator('[data-testid="category-card"], .category-card');
    this.modulesList = page.locator('[data-testid="modules-list"], .modules-list');
    this.moduleCard = page.locator('[data-testid="module-card"], .module-card');
    this.moduleContent = page.locator('[data-testid="module-content"], .module-content');
    this.progressIndicator = page.locator('[data-testid="progress-indicator"], .progress-bar, progress');
    this.completeButton = page.getByRole('button', { name: /complete|finish|mark complete/i });
    this.certificationBadge = page.locator('[data-testid="certification-badge"], .certification-badge');
    this.aiTipsSection = page.locator('[data-testid="ai-tips"], .teaching-tips');
    this.insightsLink = page.getByRole('link', { name: /insights/i }).or(page.locator('[data-testid="insights-link"]'));
    this.featureGateMessage = page.getByText(/not available|upgrade|feature.*not/i);
  }

  get path(): string {
    return '/teacher/training';
  }

  async viewCategory(index: number = 0): Promise<void> {
    await this.categoryCard.nth(index).click();
    await this.page.waitForTimeout(1000);
  }

  async viewModule(index: number = 0): Promise<void> {
    await this.moduleCard.nth(index).click();
    await this.waitForNavigation();
  }

  async startModule(): Promise<void> {
    const startBtn = this.page.getByRole('button', { name: /start|begin/i });
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async completeModule(): Promise<void> {
    await this.completeButton.click();
    await this.page.waitForTimeout(1000);
  }

  async viewInsights(): Promise<void> {
    await this.insightsLink.click();
    await this.waitForNavigation();
  }

  async viewCertifications(): Promise<void> {
    const certLink = this.page.getByRole('link', { name: /certification/i });
    if (await certLink.isVisible().catch(() => false)) {
      await certLink.click();
      await this.waitForNavigation();
    }
  }

  // Assertions
  async expectToBeOnTrainingPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher\/training/);
  }

  async expectFeatureGated(): Promise<void> {
    await expect(this.featureGateMessage).toBeVisible();
  }

  async expectCategoriesVisible(): Promise<void> {
    const hasCats = await this.categoriesList.isVisible().catch(() => false);
    const hasCards = await this.categoryCard.first().isVisible().catch(() => false);
    const hasAny = await this.page.getByText(/category|training|module/i).first().isVisible().catch(() => false);
    expect(hasCats || hasCards || hasAny).toBeTruthy();
  }

  async expectModulesVisible(): Promise<void> {
    const hasList = await this.modulesList.isVisible().catch(() => false);
    const hasCards = await this.moduleCard.first().isVisible().catch(() => false);
    expect(hasList || hasCards).toBeTruthy();
  }

  async expectModuleContentVisible(): Promise<void> {
    const hasContent = await this.moduleContent.isVisible().catch(() => false);
    const hasText = await this.page.getByText(/content|section|overview/i).first().isVisible().catch(() => false);
    expect(hasContent || hasText).toBeTruthy();
  }

  async expectProgressTracked(): Promise<void> {
    const hasProgress = await this.progressIndicator.isVisible().catch(() => false);
    expect(hasProgress).toBeTruthy();
  }
}
