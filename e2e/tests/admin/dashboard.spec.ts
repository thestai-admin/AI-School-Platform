import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { AdminDashboardPage } from '../../page-objects/admin/dashboard.page';

test.describe('Admin Dashboard', () => {
  let loginPage: LoginPage;
  let dashboardPage: AdminDashboardPage;

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new AdminDashboardPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(adminEmail, adminPassword);
    await dashboardPage.goto();
  });

  test('should navigate to admin dashboard', async () => {
    await dashboardPage.expectToBeOnDashboard();
  });

  test('should display school stats', async () => {
    await dashboardPage.expectStatsVisible();
  });

  test('should display recent activity', async () => {
    await dashboardPage.expectRecentActivityVisible();
  });

  test('should navigate to students section', async ({ page }) => {
    await dashboardPage.navigateToStudents();
    await expect(page).toHaveURL(/\/admin\/students/);
  });

  test('should navigate to classes section', async ({ page }) => {
    await dashboardPage.navigateToClasses();
    await expect(page).toHaveURL(/\/admin\/classes/);
  });

  test('should navigate to teachers section', async ({ page }) => {
    await dashboardPage.navigateToTeachers();
    await expect(page).toHaveURL(/\/admin\/teachers/);
  });

  test('should navigate to analytics section', async ({ page }) => {
    await dashboardPage.navigateToAnalytics();
    await expect(page).toHaveURL(/\/admin\/analytics/);
  });

  test('should navigate to subscriptions section', async ({ page }) => {
    await dashboardPage.navigateToSubscriptions();
    await expect(page).toHaveURL(/\/admin\/subscriptions/);
  });
});
