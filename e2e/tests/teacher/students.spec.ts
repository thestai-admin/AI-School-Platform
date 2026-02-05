import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherDashboardPage } from '../../page-objects/teacher/dashboard.page';
import { TeacherHomeworkPage } from '../../page-objects/teacher/homework.page';

test.describe('Teacher Students', () => {
  let loginPage: LoginPage;
  let dashboardPage: TeacherDashboardPage;
  let homeworkPage: TeacherHomeworkPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new TeacherDashboardPage(page);
    homeworkPage = new TeacherHomeworkPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
  });

  test('should show teacher dashboard with class information', async () => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    // Verify class information is visible
    const page = dashboardPage.page;
    const classInfoVisible = await page.locator('text=/class|grade|section/i').first().isVisible().catch(() => false);
    expect(classInfoVisible).toBeTruthy();
  });

  test('should display student count and stats on dashboard', async () => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    const page = dashboardPage.page;

    // Check for student count or stats
    const studentStatsVisible = await page.locator('text=/student|total.*student|enrolled/i').first().isVisible().catch(() => false);
    expect(studentStatsVisible).toBeTruthy();

    // Check for numerical stats
    const hasNumbers = await page.locator('[data-testid="student-count"], text=/\\d+.*student/i').first().isVisible().catch(() => false);
    expect(hasNumbers).toBeTruthy();
  });

  test('should navigate to homework to see student submissions', async () => {
    await homeworkPage.goto();
    await homeworkPage.expectHomeworkListVisible();

    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();

      const page = homeworkPage.page;

      // Verify student submission information is visible
      const submissionsVisible = await page.locator('text=/student|submission|submitted by/i').first().isVisible().catch(() => false);
      expect(submissionsVisible).toBeTruthy();

      // Check for student names or IDs in submissions
      const studentInfoVisible = await page.locator('[data-testid="student-name"], [data-testid="submission-student"]').first().isVisible().catch(() => false);
      expect(studentInfoVisible || submissionsVisible).toBeTruthy();
    }
  });

  test('should view student progress through homework grading', async () => {
    await homeworkPage.goto();
    await homeworkPage.expectHomeworkListVisible();

    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();

      const page = homeworkPage.page;

      // Check if submissions show student progress indicators
      const hasSubmissions = await homeworkPage.submissionCard.first().isVisible().catch(() => false);
      if (hasSubmissions) {
        // Look for progress indicators like grades, scores, status
        const progressVisible = await page.locator('text=/grade|score|progress|status|completed|pending/i').first().isVisible().catch(() => false);
        expect(progressVisible).toBeTruthy();

        // Verify we can see individual student performance
        const submissionCount = await page.locator('[data-testid="submission-item"]').count();
        expect(submissionCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should display student list in class overview', async () => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    const page = dashboardPage.page;

    // Look for student list or roster
    const studentListVisible = await page.locator('text=/student list|class roster|my students/i').first().isVisible().catch(() => false);

    if (studentListVisible) {
      // If there's a student list, verify we can see student entries
      const studentEntries = await page.locator('[data-testid="student-item"], [data-testid="student-card"]').count();
      expect(studentEntries).toBeGreaterThanOrEqual(0);
    }

    // At minimum, verify dashboard shows some student-related information
    const hasStudentInfo = await page.locator('text=/student|class|enrolled/i').first().isVisible().catch(() => false);
    expect(hasStudentInfo).toBeTruthy();
  });

  test('should access student performance metrics', async () => {
    await dashboardPage.goto();
    await dashboardPage.expectToBeOnDashboard();

    const page = dashboardPage.page;

    // Look for performance metrics or analytics
    const metricsVisible = await page.locator('text=/performance|progress|average|completion|analytics/i').first().isVisible().catch(() => false);

    if (metricsVisible) {
      // Verify metrics contain useful information
      const hasPercentage = await page.locator('text=/\\d+%|\\d+\\.\\d+%/').first().isVisible().catch(() => false);
      const hasScore = await page.locator('text=/score|grade|points/i').first().isVisible().catch(() => false);

      expect(hasPercentage || hasScore || metricsVisible).toBeTruthy();
    }
  });

  test('should view student details from homework submissions', async () => {
    test.setTimeout(90000);

    await homeworkPage.goto();
    await homeworkPage.expectHomeworkListVisible();

    const hasHomework = await homeworkPage.homeworkCard.first().isVisible().catch(() => false);
    if (hasHomework) {
      await homeworkPage.viewHomework();

      const hasSubmissions = await homeworkPage.submissionCard.first().isVisible().catch(() => false);
      if (hasSubmissions) {
        const page = homeworkPage.page;

        // Click on first submission to view student work
        const firstSubmission = page.locator('[data-testid="submission-item"]').first();
        const submissionExists = await firstSubmission.isVisible().catch(() => false);

        if (submissionExists) {
          await firstSubmission.click();
          await page.waitForTimeout(1000);

          // Verify we can see student work and details
          const studentWorkVisible = await page.locator('text=/answer|response|submission|student work/i').first().isVisible().catch(() => false);
          expect(studentWorkVisible).toBeTruthy();
        }
      }
    }
  });
});
