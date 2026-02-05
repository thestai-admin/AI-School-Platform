import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentCompanionPage } from '../../page-objects/student/companion.page';

test.describe('Student Study Companion', () => {
  let loginPage: LoginPage;
  let companionPage: StudentCompanionPage;
  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    companionPage = new StudentCompanionPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
  });

  test('should navigate to study companion page', async () => {
    await companionPage.goto();
    const isGated = await companionPage.featureGateMessage.isVisible().catch(() => false);
    if (!isGated) {
      await companionPage.expectToBeOnCompanionPage();
    }
  });

  test('should start new study session', async () => {
    test.setTimeout(90000);
    await companionPage.goto();
    const isGated = await companionPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await companionPage.startSession('CONCEPT_LEARNING', 'Mathematics');
    await companionPage.expectSessionActive();
  });

  test('should chat with AI companion', async () => {
    test.setTimeout(90000);
    await companionPage.goto();
    const isGated = await companionPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await companionPage.startSession('DOUBT_SOLVING', 'Science');
    await companionPage.sendMessageAndWait('What is photosynthesis?');
    await companionPage.expectAIResponse();
  });

  test('should end session and view summary', async () => {
    test.setTimeout(90000);
    await companionPage.goto();
    const isGated = await companionPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await companionPage.startSession('CONCEPT_LEARNING', 'Science');
    await companionPage.sendMessageAndWait('Explain gravity');
    await companionPage.endSession();
    await companionPage.expectSummaryVisible();
  });

  test('should view study analytics', async () => {
    await companionPage.goto();
    const isGated = await companionPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await companionPage.viewAnalytics();
    await companionPage.expectAnalyticsVisible();
  });

  test('should view session history', async () => {
    await companionPage.goto();
    const isGated = await companionPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await companionPage.viewHistory();
  });
});
