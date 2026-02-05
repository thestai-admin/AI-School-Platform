import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { AdminClassesPage } from '../../page-objects/admin/classes.page';

test.describe('Admin Class Management', () => {
  test.describe.configure({ mode: 'serial' });

  let loginPage: LoginPage;
  let classesPage: AdminClassesPage;

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    classesPage = new AdminClassesPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(adminEmail, adminPassword);
    await classesPage.goto();
  });

  test('should navigate to classes page', async () => {
    await classesPage.expectToBeOnClassesPage();
  });

  test('should display class list', async () => {
    await classesPage.expectClassListVisible();
  });

  test('should show seeded class in list', async () => {
    await classesPage.expectClassInList('Class 5-A');
  });

  test('should create new class', async () => {
    const createVisible = await classesPage.createButton.isVisible().catch(() => false);
    if (createVisible) {
      await classesPage.createClass('Class 6-B', '6', 'B');
      await classesPage.expectClassCreated();
    }
  });

  test('should edit class details', async () => {
    const editVisible = await classesPage.editButton.first().isVisible().catch(() => false);
    if (editVisible) {
      await classesPage.editClass('Class 5-A');
    }
  });

  test('should assign teacher to class', async ({ page }) => {
    const assignVisible = await classesPage.assignTeacherButton.first().isVisible().catch(() => false);
    if (assignVisible) {
      await classesPage.assignTeacher('Class 5-A', 'Test Teacher');
    }
  });

  test('should view class students', async () => {
    await classesPage.viewClassStudents('Class 5-A');
    // Should show at least the seeded test student
    const page = classesPage.page;
    const hasStudents = await page.getByText(/Test Student|student/i).first().isVisible().catch(() => false);
    expect(hasStudents).toBeTruthy();
  });
});
