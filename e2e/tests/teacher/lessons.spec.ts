import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherLessonsPage } from '../../page-objects/teacher/lessons.page';

test.describe('Teacher Lessons', () => {
  let loginPage: LoginPage;
  let lessonsPage: TeacherLessonsPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    lessonsPage = new TeacherLessonsPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
  });

  test('should navigate to lesson creation page', async () => {
    await lessonsPage.goto();
    await lessonsPage.expectToBeOnLessonsPage();
  });

  test('should display lesson creation form', async () => {
    await lessonsPage.goto();
    await lessonsPage.expectLessonFormVisible();
  });

  test('should fill lesson form fields', async () => {
    await lessonsPage.goto();
    await lessonsPage.fillLessonForm({
      grade: '5',
      subject: 'Mathematics',
      topic: 'Fractions and Decimals',
      language: 'English',
      duration: '45'
    });

    // Verify form is filled
    const page = lessonsPage.page;
    await expect(page.locator('select[name="grade"]')).toHaveValue('5');
    await expect(page.locator('select[name="subject"]')).toHaveValue('Mathematics');
    await expect(page.locator('input[name="topic"]')).toHaveValue('Fractions and Decimals');
  });

  test('should generate AI lesson plan', async () => {
    test.setTimeout(90000);

    await lessonsPage.goto();
    await lessonsPage.fillLessonForm({
      grade: '6',
      subject: 'Science',
      topic: 'Photosynthesis',
      language: 'English',
      duration: '40'
    });

    await lessonsPage.generateLesson();
    await lessonsPage.expectGeneratedPlanVisible();
  });

  test('should save generated lesson', async () => {
    test.setTimeout(90000);

    await lessonsPage.goto();
    await lessonsPage.fillLessonForm({
      grade: '7',
      subject: 'Mathematics',
      topic: 'Algebra Basics',
      language: 'English',
      duration: '45'
    });

    await lessonsPage.generateLesson();
    await lessonsPage.expectGeneratedPlanVisible();
    await lessonsPage.saveLesson();

    // Verify success message or redirect
    const page = lessonsPage.page;
    const successVisible = await page.locator('text=/saved|success/i').isVisible().catch(() => false);
    expect(successVisible).toBeTruthy();
  });

  test('should navigate to saved lessons', async () => {
    await lessonsPage.goto();
    await lessonsPage.navigateToSaved();
    await lessonsPage.expectSavedLessonsVisible();
  });

  test('should view saved lesson details', async () => {
    await lessonsPage.goto();
    await lessonsPage.navigateToSaved();
    await lessonsPage.expectSavedLessonsVisible();

    const hasLessons = await lessonsPage.lessonCard.first().isVisible().catch(() => false);
    if (hasLessons) {
      await lessonsPage.viewLesson();

      // Verify lesson content is visible
      const page = lessonsPage.page;
      const contentVisible = await page.locator('text=/objective|activity|assessment/i').first().isVisible().catch(() => false);
      expect(contentVisible).toBeTruthy();
    }
  });

  test('should edit saved lesson', async () => {
    await lessonsPage.goto();
    await lessonsPage.navigateToSaved();
    await lessonsPage.expectSavedLessonsVisible();

    const hasLessons = await lessonsPage.lessonCard.first().isVisible().catch(() => false);
    if (hasLessons) {
      await lessonsPage.editLesson();

      // Verify edit form is visible
      const page = lessonsPage.page;
      const editFormVisible = await page.locator('input[name="topic"], textarea').first().isVisible().catch(() => false);
      expect(editFormVisible).toBeTruthy();
    }
  });

  test('should delete saved lesson', async () => {
    test.setTimeout(90000);
    test.describe.configure({ mode: 'serial' });

    // First create a lesson to delete
    await lessonsPage.goto();
    await lessonsPage.fillLessonForm({
      grade: '5',
      subject: 'Science',
      topic: 'Test Lesson for Deletion',
      language: 'English',
      duration: '30'
    });

    await lessonsPage.generateLesson();
    await lessonsPage.expectGeneratedPlanVisible();
    await lessonsPage.saveLesson();

    // Now delete it
    await lessonsPage.navigateToSaved();
    await lessonsPage.expectSavedLessonsVisible();

    const page = lessonsPage.page;
    const initialCount = await page.locator('[data-testid="lesson-item"]').count();

    await lessonsPage.deleteLesson();

    // Verify lesson is removed
    await page.waitForTimeout(1000);
    const finalCount = await page.locator('[data-testid="lesson-item"]').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should filter lessons by subject', async () => {
    await lessonsPage.goto();
    await lessonsPage.navigateToSaved();
    await lessonsPage.expectSavedLessonsVisible();

    const hasLessons = await lessonsPage.lessonCard.first().isVisible().catch(() => false);
    if (hasLessons) {
      await lessonsPage.filterBySubject('Mathematics');

      // Verify filtered results
      const page = lessonsPage.page;
      await page.waitForTimeout(1000);
      const lessons = await page.locator('[data-testid="lesson-item"]').all();

      for (const lesson of lessons) {
        const text = await lesson.textContent();
        expect(text).toMatch(/mathematics/i);
      }
    }
  });
});
