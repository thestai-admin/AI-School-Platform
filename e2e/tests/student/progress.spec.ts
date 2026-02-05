import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentProgressPage } from '../../page-objects/student/progress.page';

test.describe('Student Progress', () => {
  let loginPage: LoginPage;
  let progressPage: StudentProgressPage;
  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    progressPage = new StudentProgressPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
  });

  test('should navigate to progress page', async ({ page }) => {
    await progressPage.goto();
    await progressPage.expectToBeOnProgressPage();
  });

  test('should view overall progress stats', async ({ page }) => {
    await progressPage.goto();
    await progressPage.expectOverallStatsVisible();
  });

  test('should view subject-wise breakdown', async ({ page }) => {
    await progressPage.goto();
    await progressPage.expectSubjectBreakdownVisible();
    await progressPage.viewSubjectDetail('Mathematics');
  });

  test('should view homework completion stats', async ({ page }) => {
    await progressPage.goto();
    await progressPage.expectHomeworkStatsVisible();
  });

  test('should view worksheet scores', async ({ page }) => {
    await progressPage.goto();
    await progressPage.navigateToAnalytics();
  });
});
