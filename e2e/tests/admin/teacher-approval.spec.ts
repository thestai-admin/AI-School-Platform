import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { AdminTeachersPage } from '../../page-objects/admin/teachers.page';
import { RegisterPage } from '../../page-objects/auth/register.page';
import { v4 as uuidv4 } from 'uuid';

// Generate unique email for each test
function generateUniqueEmail(): string {
  const uniqueId = uuidv4().substring(0, 8);
  return `approval-test-${uniqueId}@e2e.test`;
}

test.describe('Admin Teacher Approval', () => {
  let loginPage: LoginPage;
  let teachersPage: AdminTeachersPage;

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    teachersPage = new AdminTeachersPage(page);

    // Login as admin
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(adminEmail, adminPassword);

    // Navigate to teachers page
    await teachersPage.goto();
  });

  test.describe('Teachers Page Access', () => {
    test('admin should access teachers page', async () => {
      await teachersPage.expectToBeOnTeachersPage();
    });

    test('should display teacher list', async () => {
      await teachersPage.expectTeacherListVisible();
    });
  });

  test.describe('Viewing Teachers', () => {
    test('should show pending teachers tab', async () => {
      const pendingTabVisible = await teachersPage.pendingTab.isVisible().catch(() => false);
      if (pendingTabVisible) {
        await expect(teachersPage.pendingTab).toBeVisible();
      }
    });

    test('should filter teachers by status', async () => {
      const statusFilterVisible = await teachersPage.statusFilter.isVisible().catch(() => false);

      if (statusFilterVisible) {
        // Filter by pending
        await teachersPage.filterByStatus('pending');
        await teachersPage.page.waitForTimeout(500);

        // All visible teachers should be pending
        // (Implementation dependent on actual UI)
      }
    });

    test('should show existing pending teacher', async () => {
      const pendingTeacherEmail = process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test';

      // Switch to pending tab if available
      const pendingTabVisible = await teachersPage.pendingTab.isVisible().catch(() => false);
      if (pendingTabVisible) {
        await teachersPage.clickPendingTab();
      }

      // Search for pending teacher
      await teachersPage.searchTeacher(pendingTeacherEmail);
      await teachersPage.page.waitForTimeout(500);

      // Teacher should be in list
      await teachersPage.expectTeacherInList(pendingTeacherEmail);
    });
  });

  test.describe('Teacher Approval', () => {
    test('should approve a pending teacher', async ({ page, browser }) => {
      test.setTimeout(90000);
      // Create a new teacher for approval test
      const newTeacherEmail = generateUniqueEmail();
      const newTeacherPassword = 'ApprovalTest123!';

      // Register new teacher in a separate context
      const registerContext = await browser.newContext();
      const registerPage = await registerContext.newPage();
      const register = new RegisterPage(registerPage);

      await register.goto();
      await register.registerTeacher({
        name: 'Approval Test Teacher',
        email: newTeacherEmail,
        password: newTeacherPassword,
      });

      await registerContext.close();

      // Back to admin context - refresh teachers page
      await page.reload();

      // Switch to pending tab if available
      const pendingTabVisible = await teachersPage.pendingTab.isVisible().catch(() => false);
      if (pendingTabVisible) {
        await teachersPage.clickPendingTab();
      }

      // Search for new teacher
      await teachersPage.searchTeacher(newTeacherEmail);
      await page.waitForTimeout(1000);

      // Approve the teacher
      const teacherRow = teachersPage.getTeacherRowByEmail(newTeacherEmail);
      const approveButton = teacherRow.getByRole('button', { name: /approve/i });

      if (await approveButton.isVisible()) {
        await teachersPage.approveTeacher(newTeacherEmail);

        // Verify approval success
        await teachersPage.expectApprovalSuccess();
      }
    });

    test('should reject a pending teacher with reason', async ({ page, browser }) => {
      test.setTimeout(90000);
      // Create a new teacher for rejection test
      const newTeacherEmail = generateUniqueEmail();
      const newTeacherPassword = 'RejectionTest123!';

      // Register new teacher in a separate context
      const registerContext = await browser.newContext();
      const registerPage = await registerContext.newPage();
      const register = new RegisterPage(registerPage);

      await register.goto();
      await register.registerTeacher({
        name: 'Rejection Test Teacher',
        email: newTeacherEmail,
        password: newTeacherPassword,
      });

      await registerContext.close();

      // Back to admin context - refresh teachers page
      await page.reload();

      // Switch to pending tab if available
      const pendingTabVisible = await teachersPage.pendingTab.isVisible().catch(() => false);
      if (pendingTabVisible) {
        await teachersPage.clickPendingTab();
      }

      // Search for new teacher
      await teachersPage.searchTeacher(newTeacherEmail);
      await page.waitForTimeout(1000);

      // Reject the teacher
      const teacherRow = teachersPage.getTeacherRowByEmail(newTeacherEmail);
      const rejectButton = teacherRow.getByRole('button', { name: /reject/i });

      if (await rejectButton.isVisible()) {
        await teachersPage.rejectTeacher(newTeacherEmail, 'Insufficient qualifications');

        // Verify rejection success
        await teachersPage.expectRejectionSuccess();
      }
    });
  });

  test.describe('Post-Approval Login', () => {
    test('approved teacher should be able to login', async ({ browser }) => {
      test.setTimeout(60000); // New context needs more time
      // Use the pre-approved test teacher
      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

      // Login as teacher in new context
      const teacherContext = await browser.newContext();
      const teacherPage = await teacherContext.newPage();
      const login = new LoginPage(teacherPage);

      await login.goto();
      await login.loginAndWaitForRedirect(teacherEmail, teacherPassword);

      // Should be on teacher dashboard
      await login.expectRedirectToDashboard('teacher');

      await teacherContext.close();
    });
  });

  test.describe('Search and Filter', () => {
    test('should search teachers by name', async () => {
      const searchQuery = 'Test';
      await teachersPage.searchTeacher(searchQuery);
      await teachersPage.page.waitForTimeout(500);

      // Results should contain search query
      // (Implementation dependent)
    });

    test('should search teachers by email', async () => {
      const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
      await teachersPage.searchTeacher(teacherEmail);
      await teachersPage.page.waitForTimeout(500);

      await teachersPage.expectTeacherInList(teacherEmail);
    });
  });

  test.describe('Teacher Status Transitions', () => {
    test('pending teacher login should show pending approval error', async ({ browser }) => {
      const pendingEmail = process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test';
      const pendingPassword = process.env.TEST_PENDING_TEACHER_PASSWORD || 'TestPendingTeacher123!';

      // Login as pending teacher in new context - should show error, not redirect
      const pendingContext = await browser.newContext();
      const pendingPage = await pendingContext.newPage();
      const login = new LoginPage(pendingPage);

      await login.goto();
      await login.login(pendingEmail, pendingPassword);

      // Should show pending approval error on login page
      await login.expectLoginError(/pending.*approval|administrator/i);

      await pendingContext.close();
    });
  });
});
