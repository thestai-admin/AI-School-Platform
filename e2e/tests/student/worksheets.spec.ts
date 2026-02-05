import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentWorksheetsPage } from '../../page-objects/student/worksheets.page';

test.describe('Student Worksheets', () => {
  let loginPage: LoginPage;
  let worksheetsPage: StudentWorksheetsPage;
  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    worksheetsPage = new StudentWorksheetsPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
  });

  test('should navigate to worksheets page', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.expectToBeOnWorksheetsPage();
  });

  test('should view available worksheets list', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.expectWorksheetsListVisible();
  });

  test('should open a worksheet', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.openWorksheet();
    await worksheetsPage.expectWorksheetDetailVisible();
    await worksheetsPage.expectQuestionsVisible();
  });

  test('should answer MCQ questions', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.openWorksheet();
    await worksheetsPage.answerMCQ(0, 0);
  });

  test('should answer text questions', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.openWorksheet();
    await worksheetsPage.answerTextQuestion(0, 'Test answer');
  });

  test('should submit worksheet and view results', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.openWorksheet();
    await worksheetsPage.answerMCQ(0, 0);
    await worksheetsPage.answerTextQuestion(1, 'Test answer');
    await worksheetsPage.submitWorksheet();
    await worksheetsPage.expectResultsVisible();
  });

  test('should retry worksheet', async ({ page }) => {
    await worksheetsPage.goto();
    await worksheetsPage.openWorksheet();
    await worksheetsPage.answerMCQ(0, 0);
    await worksheetsPage.submitWorksheet();
    await worksheetsPage.expectResultsVisible();
    await worksheetsPage.retryWorksheet();
    await worksheetsPage.expectQuestionsVisible();
  });
});
