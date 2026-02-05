import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminSubscriptionsPage extends BasePage {
  readonly currentTier: Locator;
  readonly tierBadge: Locator;
  readonly featuresList: Locator;
  readonly featureItem: Locator;
  readonly usageStats: Locator;
  readonly featuresLink: Locator;
  readonly usageLink: Locator;

  constructor(page: Page) {
    super(page);
    this.currentTier = page.locator('[data-testid="current-tier"]').or(page.getByText(/current plan|current tier/i));
    this.tierBadge = page.locator('[data-testid="tier-badge"]').or(page.getByText(/ELITE|STARTER|AFFORDABLE|ENTERPRISE/));
    this.featuresList = page.locator('[data-testid="features-list"], .features-list');
    this.featureItem = page.locator('[data-testid="feature-item"], .feature-item');
    this.usageStats = page.locator('[data-testid="usage-stats"], .usage-stats');
    this.featuresLink = page.getByRole('link', { name: /features/i }).or(page.locator('[data-testid="features-link"]'));
    this.usageLink = page.getByRole('link', { name: /usage/i }).or(page.locator('[data-testid="usage-link"]'));
  }

  get path(): string {
    return '/admin/subscriptions';
  }

  async navigateToFeatures(): Promise<void> {
    await this.featuresLink.click();
    await this.waitForNavigation();
  }

  async navigateToUsage(): Promise<void> {
    await this.usageLink.click();
    await this.waitForNavigation();
  }

  async viewFeatureDetail(): Promise<void> {
    await this.featureItem.first().click();
    await this.page.waitForTimeout(1000);
  }

  // Assertions
  async expectToBeOnSubscriptionsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/subscriptions/);
  }

  async expectCurrentTierVisible(): Promise<void> {
    const hasTier = await this.currentTier.isVisible().catch(() => false);
    const hasBadge = await this.tierBadge.isVisible().catch(() => false);
    expect(hasTier || hasBadge).toBeTruthy();
  }

  async expectTier(tier: string): Promise<void> {
    await expect(this.page.getByText(tier).first()).toBeVisible();
  }

  async expectFeaturesVisible(): Promise<void> {
    const hasList = await this.featuresList.isVisible().catch(() => false);
    const hasItems = await this.featureItem.first().isVisible().catch(() => false);
    const hasText = await this.page.getByText(/feature/i).first().isVisible().catch(() => false);
    expect(hasList || hasItems || hasText).toBeTruthy();
  }

  async expectUsageStatsVisible(): Promise<void> {
    const hasStats = await this.usageStats.isVisible().catch(() => false);
    expect(hasStats).toBeTruthy();
  }
}
