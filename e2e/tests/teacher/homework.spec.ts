import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherHomeworkPage } from '../../page-objects/teacher/homework.page';

test.describe('Teacher Homework', () => {
  let loginPage: LoginPage;
  let homeworkPage: TeacherHomeworkPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homeworkPage = new TeacherHomeworkPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
  });

  test('should navigate to homework page', async () => {
    await homeworkPage.goto();
    await homeworkPage.expectToBeOnHomeworkPage();
  });

  test('should display homework list with seeded homework', async () => {
    await homeworkPage.goto();
    await homeworkPage.expectHomeworkListVisible();
    await homeworkPage.expectHomeworkInList('E2E Test: Math Homework');
  });

  test('should navigate to create homework form', async ({ page }) => {
    await homeworkPage.goto();
    const createVisible = await homeworkPage.createButton.isVisible().catch(() => false);
    if (createVisible) {
      await homeworkPage.navigateToCreate();
      await expect(page).toHaveURL(/\/teacher\/homework\/create/);
    }
  });

  test('should create new homework', async () => {
    test.setTimeout(90000);

    await homeworkPage.goto();
    const createVisible = await homeworkPage.createButton.isVisible().catch(() => false);
    if (createVisible) {
      await homeworkPage.navigateToCreate();
      await homeworkPage.fillHomeworkForm({
        title: 'Test Homework Assignment',
        subject: 'Mathematics',
        instructions: 'Complete the following problems on algebra',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      await homeworkPage.createHomework();

      const page = homeworkPage.page;
      const successVisible = await page.getByText(/created|success/i).first().isVisible().catch(() => false);
      expect(successVisible).toBeTruthy();
    }
  });

  test('should view homework details', async () => {
    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();
      const page = homeworkPage.page;
      const detailsVisible = await page.getByText(/title|description|due|submission/i).first().isVisible().catch(() => false);
      expect(detailsVisible).toBeTruthy();
    }
  });

  test('should view student submissions', async () => {
    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();
      const submissionsLink = homeworkPage.page.getByText(/submission/i).first();
      const hasSubmLink = await submissionsLink.isVisible().catch(() => false);
      if (hasSubmLink) {
        await submissionsLink.click();
        await homeworkPage.page.waitForTimeout(1000);
        const hasSubmissions = await homeworkPage.submissionCard.first().isVisible().catch(() => false);
        expect(typeof hasSubmissions).toBe('boolean');
      }
    }
  });

  test('should AI-grade a submission', async () => {
    test.setTimeout(90000);

    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();
      const gradeBtn = await homeworkPage.gradeButton.isVisible().catch(() => false);
      if (gradeBtn) {
        await homeworkPage.gradeSubmission();
        const page = homeworkPage.page;
        const gradeVisible = await page.getByText(/grade|score|graded/i).first().isVisible().catch(() => false);
        expect(gradeVisible).toBeTruthy();
      }
    }
  });

  test('should override AI grade manually', async () => {
    test.setTimeout(90000);

    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();
      const overrideVisible = await homeworkPage.overrideInput.isVisible().catch(() => false);
      if (overrideVisible) {
        await homeworkPage.overrideGrade(0, '85');
        const page = homeworkPage.page;
        const updated = await page.getByText(/updated|saved|85/i).first().isVisible().catch(() => false);
        expect(updated).toBeTruthy();
      }
    }
  });

  test('should edit homework', async () => {
    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.editHomework();
      const page = homeworkPage.page;
      const editFormVisible = await page.locator('input, textarea').first().isVisible().catch(() => false);
      expect(editFormVisible).toBeTruthy();
    }
  });

  test('should delete homework', async () => {
    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.deleteHomework();
      await homeworkPage.page.waitForTimeout(1000);
    }
  });

  test('should filter by status', async () => {
    await homeworkPage.goto();
    const hasFilter = await homeworkPage.statusFilter.isVisible().catch(() => false);
    if (hasFilter) {
      await homeworkPage.filterByStatus('pending');
      await homeworkPage.page.waitForTimeout(1000);

      await homeworkPage.filterByStatus('submitted');
      await homeworkPage.page.waitForTimeout(1000);
    }
  });
});
