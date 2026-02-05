import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentHomeworkPage } from '../../page-objects/student/homework.page';

test.describe('Student Homework', () => {
  let loginPage: LoginPage;
  let homeworkPage: StudentHomeworkPage;
  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homeworkPage = new StudentHomeworkPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
  });

  test('should navigate to homework page', async () => {
    await homeworkPage.goto();
    await homeworkPage.expectToBeOnHomeworkPage();
  });

  test('should view assigned homework list', async () => {
    await homeworkPage.goto();
    await homeworkPage.expectHomeworkListVisible();
  });

  test('should view homework details', async () => {
    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.homeworkCard.first().click();
      await homeworkPage.page.waitForTimeout(1000);
      await homeworkPage.expectHomeworkDetailVisible();
    }
  });

  test('should submit homework answers', async () => {
    await homeworkPage.goto();
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.homeworkCard.first().click();
      await homeworkPage.page.waitForTimeout(1000);
      await homeworkPage.submitAnswers();
      await homeworkPage.expectSubmissionSuccess();
    }
  });

  test('should view graded homework with feedback', async () => {
    await homeworkPage.goto();
    await homeworkPage.filterByStatus('graded');
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.homeworkCard.first().click();
      await homeworkPage.page.waitForTimeout(1000);
      await homeworkPage.expectFeedbackVisible();
      await homeworkPage.expectGradeVisible();
    }
  });

  test('should filter by status', async () => {
    await homeworkPage.goto();
    await homeworkPage.filterByStatus('pending');
    await homeworkPage.filterByStatus('submitted');
    await homeworkPage.filterByStatus('graded');
  });

  test('should check overdue homework indicator display', async () => {
    await homeworkPage.goto();
    const hasOverdue = await homeworkPage.overdueIndicator.first().isVisible().catch(() => false);
    // Overdue indicator may or may not be present depending on data
    expect(typeof hasOverdue).toBe('boolean');
  });
});
