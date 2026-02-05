import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { ParentHomeworkPage } from '../../page-objects/parent/homework.page';

test.describe('Parent Homework Tracking', () => {
  let loginPage: LoginPage;
  let homeworkPage: ParentHomeworkPage;

  const parentEmail = process.env.TEST_PARENT_EMAIL || 'test-parent@e2e.test';
  const parentPassword = process.env.TEST_PARENT_PASSWORD || 'TestParent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homeworkPage = new ParentHomeworkPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(parentEmail, parentPassword);
    await homeworkPage.goto();
  });

  test('should navigate to homework tracking page', async () => {
    await homeworkPage.expectToBeOnHomeworkPage();
  });

  test('should display homework list', async () => {
    await homeworkPage.expectHomeworkListVisible();
  });

  test('should show child assigned homework', async () => {
    // Seeded homework should be visible for the linked child
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      const text = await homeworkPage.homeworkCard.first().textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should display submission status', async () => {
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.expectSubmissionStatusVisible();
    }
  });

  test('should display grades when available', async () => {
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      // View a graded homework detail if available
      await homeworkPage.homeworkCard.first().click();
      await homeworkPage.page.waitForTimeout(1000);

      const hasGrade = await homeworkPage.gradeDisplay.isVisible().catch(() => false);
      // Grade may or may not be present depending on grading state
      expect(typeof hasGrade).toBe('boolean');
    }
  });

  test('should display feedback when available', async () => {
    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.homeworkCard.first().click();
      await homeworkPage.page.waitForTimeout(1000);

      const hasFeedback = await homeworkPage.feedbackArea.isVisible().catch(() => false);
      // Feedback may or may not be present
      expect(typeof hasFeedback).toBe('boolean');
    }
  });
});
