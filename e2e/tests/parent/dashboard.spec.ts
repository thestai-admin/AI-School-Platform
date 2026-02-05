import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { ParentDashboardPage } from '../../page-objects/parent/dashboard.page';

test.describe('Parent Dashboard', () => {
  let loginPage: LoginPage;
  let dashboardPage: ParentDashboardPage;

  const parentEmail = process.env.TEST_PARENT_EMAIL || 'test-parent@e2e.test';
  const parentPassword = process.env.TEST_PARENT_PASSWORD || 'TestParent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new ParentDashboardPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(parentEmail, parentPassword);
    await dashboardPage.goto();
  });

  test('should navigate to parent dashboard', async () => {
    await dashboardPage.expectToBeOnDashboard();
  });

  test('should display child information', async () => {
    await dashboardPage.expectChildInfoVisible();
  });

  test('should display progress summary', async () => {
    await dashboardPage.expectProgressSummaryVisible();
  });

  test('should have parent navigation links', async () => {
    await dashboardPage.expectParentNavigation();
  });

  test('should navigate to homework tracking', async ({ page }) => {
    await dashboardPage.navigateToHomework();
    await expect(page).toHaveURL(/\/parent\/homework/);
  });

  test('should navigate to diagrams', async ({ page }) => {
    await dashboardPage.navigateToDiagrams();
    await expect(page).toHaveURL(/\/parent\/diagrams/);
  });

  test('should logout successfully', async ({ page }) => {
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login/);
  });

  test('after logout, accessing parent routes should redirect', async ({ page }) => {
    await dashboardPage.logout();
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}/parent`);
    await expect(page).toHaveURL(/\/login/);
  });
});
