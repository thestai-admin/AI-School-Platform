import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherHomeworkPage extends BasePage {
  // Navigation
  readonly createButton: Locator;

  // Form elements
  readonly titleInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly instructionsTextarea: Locator;
  readonly classSelect: Locator;
  readonly subjectSelect: Locator;
  readonly dueDateInput: Locator;

  // Questions
  readonly questionsArea: Locator;
  readonly addQuestionButton: Locator;

  // Homework list
  readonly homeworkList: Locator;
  readonly homeworkCard: Locator;

  // Submissions
  readonly submissionsList: Locator;
  readonly submissionCard: Locator;
  readonly gradeButton: Locator;
  readonly overrideInput: Locator;

  // Actions
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation
    this.createButton = page.getByRole('button', { name: /create homework|new homework|assign homework/i });

    // Form elements
    this.titleInput = page.getByLabel(/title/i);
    this.descriptionTextarea = page.getByLabel(/description/i);
    this.instructionsTextarea = page.getByLabel(/instructions/i);
    this.classSelect = page.getByLabel(/class|section/i);
    this.subjectSelect = page.getByLabel(/subject/i);
    this.dueDateInput = page.getByLabel(/due date|deadline/i);

    // Questions
    this.questionsArea = page.locator('[data-testid="questions-area"], .questions-area, .homework-questions');
    this.addQuestionButton = page.getByRole('button', { name: /add question/i });

    // Homework list
    this.homeworkList = page.locator('[data-testid="homework-list"], .homework-list');
    this.homeworkCard = page.locator('[data-testid="homework-card"], .homework-card');

    // Submissions
    this.submissionsList = page.locator('[data-testid="submissions-list"], .submissions-list');
    this.submissionCard = page.locator('[data-testid="submission-card"], .submission-card');
    this.gradeButton = page.getByRole('button', { name: /grade|view grade/i });
    this.overrideInput = page.getByLabel(/override grade|manual grade/i);

    // Actions
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.statusFilter = page.getByLabel(/filter by status|status filter/i);
  }

  get path(): string {
    return '/teacher/homework';
  }

  // Actions
  async navigateToCreate(): Promise<void> {
    await this.createButton.click();
    await this.page.waitForURL(/\/teacher\/homework\/create/);
  }

  async fillHomeworkForm(data: {
    title?: string;
    description?: string;
    instructions?: string;
    class?: string;
    subject?: string;
    dueDate?: string;
  }): Promise<void> {
    if (data.title) {
      await this.titleInput.fill(data.title);
    }
    if (data.description) {
      await this.descriptionTextarea.fill(data.description);
    }
    if (data.instructions) {
      await this.instructionsTextarea.fill(data.instructions);
    }
    if (data.class) {
      await this.classSelect.selectOption(data.class);
    }
    if (data.subject) {
      await this.subjectSelect.selectOption(data.subject);
    }
    if (data.dueDate) {
      await this.dueDateInput.fill(data.dueDate);
    }
  }

  async addQuestion(questionText?: string, points?: string): Promise<void> {
    await this.addQuestionButton.click();
    if (questionText) {
      const lastQuestionInput = this.questionsArea.locator('textarea, input[type="text"]').last();
      await lastQuestionInput.fill(questionText);
    }
    if (points) {
      const lastPointsInput = this.questionsArea.locator('input[type="number"]').last();
      await lastPointsInput.fill(points);
    }
  }

  async createHomework(): Promise<void> {
    await this.clickButton(/create|assign|submit/i);
    await this.waitForPageLoad();
  }

  async viewHomework(index: number = 0): Promise<void> {
    await this.homeworkCard.nth(index).click();
    await this.waitForNavigation();
  }

  async viewSubmissions(homeworkIndex: number = 0): Promise<void> {
    const card = this.homeworkCard.nth(homeworkIndex);
    const viewSubmissionsLink = card.getByRole('link', { name: /view submissions|submissions/i });
    await viewSubmissionsLink.click();
    await this.waitForNavigation();
  }

  async gradeSubmission(submissionIndex: number = 0): Promise<void> {
    const card = this.submissionCard.nth(submissionIndex);
    await card.locator(this.gradeButton).click();
    await this.waitForNavigation();
  }

  async overrideGrade(submissionIndex: number, newGrade: string): Promise<void> {
    const card = this.submissionCard.nth(submissionIndex);
    const overrideInput = card.locator(this.overrideInput);
    await overrideInput.fill(newGrade);
    await this.clickButton(/save|update/i);
    await this.waitForPageLoad();
  }

  async editHomework(index: number = 0): Promise<void> {
    const card = this.homeworkCard.nth(index);
    await card.locator(this.editButton).click();
    await this.waitForNavigation();
  }

  async deleteHomework(index: number = 0): Promise<void> {
    const card = this.homeworkCard.nth(index);
    await card.locator(this.deleteButton).click();
    // Wait for confirmation dialog if present
    await this.page.waitForTimeout(500);
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await this.waitForPageLoad();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  // Assertions
  async expectToBeOnHomeworkPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher\/homework/);
  }

  async expectHomeworkListVisible(): Promise<void> {
    await expect(this.homeworkList).toBeVisible();
  }

  async expectHomeworkInList(title: string | RegExp): Promise<void> {
    const homeworkWithTitle = this.page.getByText(title);
    await expect(homeworkWithTitle).toBeVisible();
  }

  async expectSubmissionsVisible(): Promise<void> {
    await expect(this.submissionsList).toBeVisible();
  }

  async expectGradingSuccess(): Promise<void> {
    await this.expectSuccessMessage(/graded|grade saved|grade updated/i);
  }
}
