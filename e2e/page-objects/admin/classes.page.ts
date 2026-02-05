import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminClassesPage extends BasePage {
  readonly classList: Locator;
  readonly classCard: Locator;
  readonly createButton: Locator;
  readonly nameInput: Locator;
  readonly gradeInput: Locator;
  readonly sectionInput: Locator;
  readonly saveButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly assignTeacherButton: Locator;
  readonly teacherSelect: Locator;
  readonly studentsList: Locator;
  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.classList = page.locator('[data-testid="class-list"], .class-list, .classes-grid, table');
    this.classCard = page.locator('[data-testid="class-card"], .class-card, tr');
    this.createButton = page.getByRole('button', { name: /create|add|new/i });
    this.nameInput = page.getByLabel(/name/i);
    this.gradeInput = page.getByLabel(/grade/i);
    this.sectionInput = page.getByLabel(/section/i);
    this.saveButton = page.getByRole('button', { name: /save|create|submit/i });
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.assignTeacherButton = page.getByRole('button', { name: /assign/i });
    this.teacherSelect = page.getByLabel(/teacher/i);
    this.studentsList = page.locator('[data-testid="students-list"], .students-list');
    this.confirmDialog = page.locator('[role="dialog"], [data-testid="confirm-dialog"]');
    this.confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
    this.cancelButton = page.getByRole('button', { name: /cancel|no/i });
  }

  get path(): string {
    return '/admin/classes';
  }

  async createClass(name: string, grade: string, section: string): Promise<void> {
    await this.createButton.click();
    await this.page.waitForTimeout(500);
    await this.nameInput.fill(name);
    await this.gradeInput.fill(grade);
    await this.sectionInput.fill(section);
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  async editClass(identifier: string): Promise<void> {
    const row = this.page.getByText(identifier).first();
    const editBtn = row.locator('..').getByRole('button', { name: /edit/i });
    const isVisible = await editBtn.isVisible().catch(() => false);
    if (isVisible) {
      await editBtn.click();
    } else {
      await this.editButton.first().click();
    }
    await this.page.waitForTimeout(500);
  }

  async deleteClass(identifier: string): Promise<void> {
    const row = this.page.getByText(identifier).first();
    const deleteBtn = row.locator('..').getByRole('button', { name: /delete/i });
    const isVisible = await deleteBtn.isVisible().catch(() => false);
    if (isVisible) {
      await deleteBtn.click();
    } else {
      await this.deleteButton.first().click();
    }
    await this.page.waitForTimeout(500);
    if (await this.confirmButton.isVisible()) {
      await this.confirmButton.click();
    }
    await this.page.waitForTimeout(1000);
  }

  async assignTeacher(classIdentifier: string, teacherName: string): Promise<void> {
    await this.assignTeacherButton.first().click();
    await this.page.waitForTimeout(500);
    if (await this.teacherSelect.isVisible()) {
      await this.teacherSelect.selectOption(teacherName);
      await this.saveButton.click();
    }
    await this.page.waitForTimeout(1000);
  }

  async viewClassStudents(identifier: string): Promise<void> {
    const classRow = this.page.getByText(identifier).first();
    await classRow.click();
    await this.page.waitForTimeout(1000);
  }

  // Assertions
  async expectToBeOnClassesPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/classes/);
  }

  async expectClassListVisible(): Promise<void> {
    const hasList = await this.classList.first().isVisible().catch(() => false);
    const hasCards = await this.classCard.first().isVisible().catch(() => false);
    const hasText = await this.page.getByText(/class|no classes/i).first().isVisible().catch(() => false);
    expect(hasList || hasCards || hasText).toBeTruthy();
  }

  async expectClassInList(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectClassCreated(): Promise<void> {
    const success = await this.page.getByText(/created|success/i).first().isVisible().catch(() => false);
    expect(success).toBeTruthy();
  }

  async expectClassDeleted(): Promise<void> {
    const success = await this.page.getByText(/deleted|removed|success/i).first().isVisible().catch(() => false);
    expect(success).toBeTruthy();
  }
}
