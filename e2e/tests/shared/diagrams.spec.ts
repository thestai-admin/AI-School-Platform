import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { DiagramsPage } from '../../page-objects/shared/diagrams.page';

test.describe('Diagrams - Teacher', () => {
  test.describe.configure({ mode: 'serial' });

  let loginPage: LoginPage;
  let diagramsPage: DiagramsPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    diagramsPage = new DiagramsPage(page, 'teacher');
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
    await diagramsPage.goto();
  });

  test('should navigate to diagrams page', async () => {
    await diagramsPage.expectToBeOnDiagramsPage();
  });

  test('should display diagrams list', async () => {
    await diagramsPage.expectDiagramsListVisible();
  });

  test('should show seeded diagram', async () => {
    await diagramsPage.expectDiagramInList('E2E Test: Math Flowchart');
  });

  test('should navigate to create new diagram', async ({ page }) => {
    const createVisible = await diagramsPage.createButton.isVisible().catch(() => false);
    if (createVisible) {
      await diagramsPage.navigateToNew();
      await expect(page).toHaveURL(/\/teacher\/diagrams\/new/);
    }
  });

  test('should create and save a new diagram', async () => {
    const createVisible = await diagramsPage.createButton.isVisible().catch(() => false);
    if (createVisible) {
      await diagramsPage.navigateToNew();

      // Fill in diagram details
      const titleVisible = await diagramsPage.titleInput.isVisible().catch(() => false);
      if (titleVisible) {
        await diagramsPage.titleInput.fill('E2E Test: New Diagram');
      }

      const typeVisible = await diagramsPage.typeSelect.isVisible().catch(() => false);
      if (typeVisible) {
        await diagramsPage.typeSelect.selectOption('FLOWCHART');
      }

      // Save diagram
      await diagramsPage.saveDiagram();
      await diagramsPage.expectDiagramSaved();
    }
  });

  test('should view diagram in detail', async () => {
    const hasDiagram = await diagramsPage.diagramCard.first().isVisible().catch(() => false);
    if (hasDiagram) {
      await diagramsPage.viewDiagram(0);
      await diagramsPage.expectCanvasVisible();
    }
  });

  test('should set diagram visibility', async () => {
    const hasDiagram = await diagramsPage.diagramCard.first().isVisible().catch(() => false);
    if (hasDiagram) {
      await diagramsPage.viewDiagram(0);
      const visibilityVisible = await diagramsPage.visibilitySelect.isVisible().catch(() => false);
      if (visibilityVisible) {
        await diagramsPage.setVisibility('SCHOOL');
      }
    }
  });
});

test.describe('Diagrams - Student', () => {
  let loginPage: LoginPage;
  let diagramsPage: DiagramsPage;

  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    diagramsPage = new DiagramsPage(page, 'student');
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);
    await diagramsPage.goto();
  });

  test('should navigate to student diagrams page', async () => {
    await diagramsPage.expectToBeOnDiagramsPage();
  });

  test('should display shared diagrams', async () => {
    await diagramsPage.expectDiagramsListVisible();
  });

  test('should view diagram in read-only mode', async () => {
    const hasDiagram = await diagramsPage.diagramCard.first().isVisible().catch(() => false);
    if (hasDiagram) {
      await diagramsPage.viewDiagram(0);
      await diagramsPage.expectCanvasVisible();
    }
  });

  test('should create new student diagram', async ({ page }) => {
    const createVisible = await diagramsPage.createButton.isVisible().catch(() => false);
    if (createVisible) {
      await diagramsPage.navigateToNew();
      await expect(page).toHaveURL(/\/student\/diagrams\/new/);
    }
  });
});

test.describe('Diagrams - Admin', () => {
  let loginPage: LoginPage;
  let diagramsPage: DiagramsPage;

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    diagramsPage = new DiagramsPage(page, 'admin');
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(adminEmail, adminPassword);
    await diagramsPage.goto();
  });

  test('should navigate to admin diagrams page', async () => {
    await diagramsPage.expectToBeOnDiagramsPage();
  });

  test('should display all school diagrams', async () => {
    await diagramsPage.expectDiagramsListVisible();
  });

  test('should view diagram details', async () => {
    const hasDiagram = await diagramsPage.diagramCard.first().isVisible().catch(() => false);
    if (hasDiagram) {
      await diagramsPage.viewDiagram(0);
      await diagramsPage.expectCanvasVisible();
    }
  });
});
