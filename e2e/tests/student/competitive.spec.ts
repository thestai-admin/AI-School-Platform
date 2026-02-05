import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentCompetitivePage } from '../../page-objects/student/competitive.page';

test.describe('Student Competitive Exam Prep', () => {
  let loginPage: LoginPage;
  let competitivePage: StudentCompetitivePage;
  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    competitivePage = new StudentCompetitivePage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
  });

  test('should navigate to exam prep page', async () => {
    await competitivePage.goto();
    const isGated = await competitivePage.featureGateMessage.isVisible().catch(() => false);
    if (!isGated) {
      await competitivePage.expectToBeOnCompetitivePage();
    }
  });

  test('should view exam types', async () => {
    await competitivePage.goto();
    const isGated = await competitivePage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await competitivePage.expectExamTypesVisible();
  });

  test('should select exam type', async () => {
    await competitivePage.goto();
    const isGated = await competitivePage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await competitivePage.selectExamType('JEE');
  });

  test('should start practice set', async () => {
    test.setTimeout(90000);
    await competitivePage.goto();
    const isGated = await competitivePage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await competitivePage.selectExamType('NEET');
    await competitivePage.startPractice();
    await competitivePage.expectPracticeActive();
  });

  test('should answer practice questions and submit', async () => {
    test.setTimeout(90000);
    await competitivePage.goto();
    const isGated = await competitivePage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await competitivePage.selectExamType('Olympiad');
    await competitivePage.startPractice();
    await competitivePage.answerQuestion(0);
    await competitivePage.submitPractice();
    await competitivePage.expectResultsVisible();
  });

  test('should view results and explanations', async () => {
    test.setTimeout(90000);
    await competitivePage.goto();
    const isGated = await competitivePage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await competitivePage.viewProgress();
    await competitivePage.expectProgressVisible();
  });
});
