import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { AdminSubscriptionsPage } from '../../page-objects/admin/subscriptions.page';

test.describe('Admin Subscriptions', () => {
  let loginPage: LoginPage;
  let subscriptionsPage: AdminSubscriptionsPage;

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    subscriptionsPage = new AdminSubscriptionsPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(adminEmail, adminPassword);
    await subscriptionsPage.goto();
  });

  test('should navigate to subscriptions page', async () => {
    await subscriptionsPage.expectToBeOnSubscriptionsPage();
  });

  test('should display current tier', async () => {
    await subscriptionsPage.expectCurrentTierVisible();
  });

  test('should show ELITE tier for test school', async () => {
    await subscriptionsPage.expectTier('ELITE');
  });

  test('should display available features', async () => {
    await subscriptionsPage.expectFeaturesVisible();
  });

  test('should navigate to features sub-page', async ({ page }) => {
    await subscriptionsPage.navigateToFeatures();
    await expect(page).toHaveURL(/\/admin\/subscriptions\/features/);
  });

  test('should navigate to usage sub-page', async ({ page }) => {
    await subscriptionsPage.navigateToUsage();
    await expect(page).toHaveURL(/\/admin\/subscriptions\/usage/);
  });
});
