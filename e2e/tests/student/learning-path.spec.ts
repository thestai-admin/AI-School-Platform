import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentLearningPathPage } from '../../page-objects/student/learning-path.page';

test.describe('Student Learning Path', () => {
  let loginPage: LoginPage;
  let learningPathPage: StudentLearningPathPage;
  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    learningPathPage = new StudentLearningPathPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
  });

  test('should navigate to learning path', async () => {
    await learningPathPage.goto();
    const isGated = await learningPathPage.featureGateMessage.isVisible().catch(() => false);
    if (!isGated) {
      await learningPathPage.expectToBeOnLearningPathPage();
    }
  });

  test('should view personalized path', async () => {
    await learningPathPage.goto();
    const isGated = await learningPathPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    const pathExists = await learningPathPage.pathOverview.isVisible().catch(() => false);
    if (!pathExists) {
      await learningPathPage.generatePath();
    }
    await learningPathPage.expectPathVisible();
  });

  test('should view milestones list', async () => {
    await learningPathPage.goto();
    const isGated = await learningPathPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await learningPathPage.expectMilestonesVisible();
  });

  test('should track milestone progress', async () => {
    await learningPathPage.goto();
    const isGated = await learningPathPage.featureGateMessage.isVisible().catch(() => false);
    if (isGated) return;

    await learningPathPage.trackProgress();
    await learningPathPage.expectProgressTracked();
  });
});
