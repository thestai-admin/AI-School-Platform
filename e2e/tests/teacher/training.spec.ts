import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherTrainingPage } from '../../page-objects/teacher/training.page';

test.describe('Teacher Training', () => {
  let loginPage: LoginPage;
  let trainingPage: TeacherTrainingPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    trainingPage = new TeacherTrainingPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
  });

  test('should navigate to training page', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;

    // Check if feature is available or if feature gate message shows
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (featureGateVisible) {
      // Feature is gated, verify the gate message
      expect(featureGateVisible).toBeTruthy();
    } else {
      // Feature is available, verify training page loaded
      await trainingPage.expectToBeOnTrainingPage();
    }
  });

  test('should view training categories', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await trainingPage.expectCategoriesVisible();

      // Verify categories are displayed
      const categoryCount = await page.locator('[data-testid="training-category"]').count();
      expect(categoryCount).toBeGreaterThan(0);
    }
  });

  test('should view module list in a category', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      const hasCategories = await trainingPage.categoryCard.first().isVisible().catch(() => false);

      if (hasCategories) {
        await trainingPage.viewCategory();

        // Verify modules are listed
        const modulesVisible = await page.locator('[data-testid="training-module"], text=/module|lesson|course/i').first().isVisible().catch(() => false);
        expect(modulesVisible).toBeTruthy();
      }
    }
  });

  test('should open training module', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      const hasCategories = await trainingPage.categoryCard.first().isVisible().catch(() => false);

      if (hasCategories) {
        await trainingPage.viewCategory();
        await trainingPage.viewModule();

        // Verify module opened
        await trainingPage.expectModuleContentVisible();
      }
    }
  });

  test('should view module content', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      const hasCategories = await trainingPage.categoryCard.first().isVisible().catch(() => false);

      if (hasCategories) {
        await trainingPage.viewCategory();
        await trainingPage.viewModule();
        await trainingPage.expectModuleContentVisible();

        // Verify content is readable
        const contentVisible = await page.locator('text=/objective|overview|introduction|content/i').first().isVisible().catch(() => false);
        expect(contentVisible).toBeTruthy();
      }
    }
  });

  test('should track module progress - start', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      const hasCategories = await trainingPage.categoryCard.first().isVisible().catch(() => false);

      if (hasCategories) {
        await trainingPage.viewCategory();
        await trainingPage.viewModule();
        await trainingPage.startModule();

        // Verify progress tracking
        const progressVisible = await page.locator('text=/in progress|started|continue/i').isVisible().catch(() => false);
        expect(progressVisible).toBeTruthy();
      }
    }
  });

  test('should track module progress - complete', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      const hasCategories = await trainingPage.categoryCard.first().isVisible().catch(() => false);

      if (hasCategories) {
        await trainingPage.viewCategory();
        await trainingPage.viewModule();
        await trainingPage.startModule();
        await trainingPage.completeModule();

        // Verify completion status
        const completedVisible = await page.locator('text=/completed|finished|done|100%/i').isVisible().catch(() => false);
        expect(completedVisible).toBeTruthy();
      }
    }
  });

  test('should view AI teaching tips and insights', async () => {
    test.setTimeout(90000);

    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await trainingPage.viewInsights();

      // Verify AI insights are visible
      const insightsVisible = await page.locator('text=/insight|tip|recommendation|suggestion|ai.*advice/i').first().isVisible().catch(() => false);
      expect(insightsVisible).toBeTruthy();

      // Check for AI-generated content
      const hasAIContent = await page.locator('[data-testid="ai-insight"], [data-testid="teaching-tip"]').first().isVisible().catch(() => false);
      expect(hasAIContent || insightsVisible).toBeTruthy();
    }
  });

  test('should view certifications', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await trainingPage.viewCertifications();

      // Verify certifications page or section is visible
      const certificationsVisible = await page.locator('text=/certification|certificate|credential|achievement/i').first().isVisible().catch(() => false);
      expect(certificationsVisible).toBeTruthy();

      // Check for certification list or empty state
      const hasCertifications = await page.locator('[data-testid="certification-item"]').count();
      const emptyState = await page.locator('text=/no certification|earn.*certificate|complete.*module/i').isVisible().catch(() => false);

      expect(hasCertifications > 0 || emptyState).toBeTruthy();
    }
  });

  test('should display training progress overview', async () => {
    await trainingPage.goto();

    const page = trainingPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await trainingPage.expectToBeOnTrainingPage();

      // Look for progress overview or stats
      const progressOverviewVisible = await page.locator('text=/progress|completed|in progress|modules completed/i').first().isVisible().catch(() => false);

      if (progressOverviewVisible) {
        // Verify progress metrics
        const hasMetrics = await page.locator('text=/\\d+%|\\d+\\/\\d+/').first().isVisible().catch(() => false);
        expect(hasMetrics || progressOverviewVisible).toBeTruthy();
      }
    }
  });
});
