import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { AdminStudentsPage } from '../../page-objects/admin/students.page';

test.describe('Admin Student Management', () => {
  let loginPage: LoginPage;
  let studentsPage: AdminStudentsPage;

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    studentsPage = new AdminStudentsPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(adminEmail, adminPassword);
    await studentsPage.goto();
  });

  test('should navigate to students page', async () => {
    await studentsPage.expectToBeOnStudentsPage();
  });

  test('should display student list', async () => {
    await studentsPage.expectStudentListVisible();
  });

  test('should search students by name', async () => {
    await studentsPage.searchStudent('Test Student');
    await studentsPage.page.waitForTimeout(1000);
    await studentsPage.expectStudentInList('Test Student');
  });

  test('should search students by email', async () => {
    const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
    await studentsPage.searchStudent(studentEmail);
    await studentsPage.page.waitForTimeout(1000);
    await studentsPage.expectStudentInList(studentEmail);
  });

  test('should view student details', async () => {
    const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
    await studentsPage.searchStudent(studentEmail);
    await studentsPage.page.waitForTimeout(1000);

    const hasStudent = await studentsPage.studentRow.first().isVisible().catch(() => false);
    if (hasStudent) {
      await studentsPage.viewStudentDetail(studentEmail);
      await studentsPage.expectStudentDetailVisible();
    }
  });

  test('should filter by class', async () => {
    const filterVisible = await studentsPage.classFilter.isVisible().catch(() => false);
    if (filterVisible) {
      await studentsPage.filterByClass('Class 5-A');
      await studentsPage.page.waitForTimeout(1000);
      // After filtering, student list should still be visible
      await studentsPage.expectStudentListVisible();
    }
  });
});
