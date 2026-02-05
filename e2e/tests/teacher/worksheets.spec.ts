import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherWorksheetsPage } from '../../page-objects/teacher/worksheets.page';

test.describe('Teacher Worksheets', () => {
  let loginPage: LoginPage;
  let worksheetsPage: TeacherWorksheetsPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    worksheetsPage = new TeacherWorksheetsPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
  });

  test('should navigate to worksheet creation page', async () => {
    await worksheetsPage.goto();
    await worksheetsPage.expectToBeOnWorksheetsPage();
  });

  test('should display worksheet creation form', async () => {
    await worksheetsPage.goto();
    await worksheetsPage.expectFormVisible();
  });

  test('should fill worksheet form fields', async () => {
    await worksheetsPage.goto();
    await worksheetsPage.fillWorksheetForm({
      grade: '6',
      subject: 'Mathematics',
      topic: 'Fractions',
      difficulty: 'MEDIUM',
      questionCount: '10',
    });

    // Verify topic is filled
    await expect(worksheetsPage.topicInput).toHaveValue('Fractions');
  });

  test('should generate AI worksheet', async () => {
    test.setTimeout(90000);

    await worksheetsPage.goto();
    await worksheetsPage.fillWorksheetForm({
      grade: '7',
      subject: 'Science',
      topic: 'Cell Structure',
      difficulty: 'MEDIUM',
      questionCount: '8',
    });

    await worksheetsPage.generateWorksheet();
    await worksheetsPage.expectGeneratedQuestionsVisible();
  });

  test('should verify generated questions have types', async () => {
    test.setTimeout(90000);

    await worksheetsPage.goto();
    await worksheetsPage.fillWorksheetForm({
      grade: '8',
      subject: 'Mathematics',
      topic: 'Linear Equations',
      difficulty: 'MEDIUM',
      questionCount: '12',
    });

    await worksheetsPage.generateWorksheet();
    await worksheetsPage.expectGeneratedQuestionsVisible();

    const page = worksheetsPage.page;
    const hasMCQ = await page.locator('text=/multiple choice|mcq|option/i').first().isVisible().catch(() => false);
    const hasFillBlank = await page.locator('text=/fill.*blank|___|complete/i').first().isVisible().catch(() => false);
    const hasShortAnswer = await page.locator('text=/short answer|answer.*following|explain/i').first().isVisible().catch(() => false);
    expect(hasMCQ || hasFillBlank || hasShortAnswer).toBeTruthy();
  });

  test('should save generated worksheet', async () => {
    test.setTimeout(90000);

    await worksheetsPage.goto();
    await worksheetsPage.fillWorksheetForm({
      grade: '5',
      subject: 'English',
      topic: 'Grammar - Tenses',
      difficulty: 'EASY',
      questionCount: '10',
    });

    await worksheetsPage.generateWorksheet();
    await worksheetsPage.expectGeneratedQuestionsVisible();
    await worksheetsPage.saveWorksheet();

    const page = worksheetsPage.page;
    const successVisible = await page.locator('text=/saved|success/i').first().isVisible().catch(() => false);
    expect(successVisible).toBeTruthy();
  });

  test('should navigate to saved worksheets', async () => {
    await worksheetsPage.goto();
    await worksheetsPage.navigateToSaved();
    await worksheetsPage.expectSavedWorksheetsVisible();
  });

  test('should view saved worksheet details', async () => {
    await worksheetsPage.goto();
    await worksheetsPage.navigateToSaved();

    const hasWorksheets = await worksheetsPage.worksheetCard.first().isVisible().catch(() => false);
    if (hasWorksheets) {
      await worksheetsPage.viewWorksheet();
      const page = worksheetsPage.page;
      const contentVisible = await page.locator('text=/question|answer|instructions/i').first().isVisible().catch(() => false);
      expect(contentVisible).toBeTruthy();
    }
  });

  test('should delete saved worksheet', async () => {
    test.setTimeout(90000);

    await worksheetsPage.goto();
    await worksheetsPage.navigateToSaved();

    const hasWorksheets = await worksheetsPage.worksheetCard.first().isVisible().catch(() => false);
    if (hasWorksheets) {
      await worksheetsPage.deleteWorksheet();
      await worksheetsPage.page.waitForTimeout(1000);
    }
  });

  test('should filter by subject and difficulty', async () => {
    await worksheetsPage.goto();
    await worksheetsPage.navigateToSaved();

    const hasFilter = await worksheetsPage.filterBySubjectDropdown.isVisible().catch(() => false);
    if (hasFilter) {
      await worksheetsPage.filterBySubject('Mathematics');
      await worksheetsPage.page.waitForTimeout(1000);

      const hasDiffFilter = await worksheetsPage.filterByDifficultyDropdown.isVisible().catch(() => false);
      if (hasDiffFilter) {
        await worksheetsPage.filterByDifficulty('MEDIUM');
        await worksheetsPage.page.waitForTimeout(1000);
      }
    }
  });
});
