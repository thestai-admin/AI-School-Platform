import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherWorksheetsPage extends BasePage {
  // Form elements
  readonly gradeSelect: Locator;
  readonly classSelect: Locator;
  readonly subjectSelect: Locator;
  readonly topicInput: Locator;
  readonly difficultySelect: Locator;
  readonly questionCountInput: Locator;
  readonly generateButton: Locator;
  readonly saveButton: Locator;

  // Generated content
  readonly generatedQuestionsArea: Locator;

  // Saved worksheets
  readonly savedWorksheetsList: Locator;
  readonly worksheetCard: Locator;
  readonly deleteButton: Locator;

  // Filters
  readonly filterBySubjectDropdown: Locator;
  readonly filterByDifficultyDropdown: Locator;

  constructor(page: Page) {
    super(page);

    // Form elements
    this.gradeSelect = page.getByLabel(/grade|class/i);
    this.classSelect = page.getByLabel(/class|section/i);
    this.subjectSelect = page.getByLabel(/subject/i);
    this.topicInput = page.getByLabel(/topic/i);
    this.difficultySelect = page.getByLabel(/difficulty/i);
    this.questionCountInput = page.getByLabel(/question count|number of questions|questions/i);
    this.generateButton = page.getByRole('button', { name: /generate worksheet|generate/i });
    this.saveButton = page.getByRole('button', { name: /save worksheet|save/i });

    // Generated content
    this.generatedQuestionsArea = page.locator('[data-testid="generated-questions"], .generated-questions, .questions-area');

    // Saved worksheets
    this.savedWorksheetsList = page.locator('[data-testid="saved-worksheets-list"], .saved-worksheets-list, .worksheets-list');
    this.worksheetCard = page.locator('[data-testid="worksheet-card"], .worksheet-card');
    this.deleteButton = page.getByRole('button', { name: /delete/i });

    // Filters
    this.filterBySubjectDropdown = page.getByLabel(/filter by subject|filter subject/i);
    this.filterByDifficultyDropdown = page.getByLabel(/filter by difficulty|filter difficulty/i);
  }

  get path(): string {
    return '/teacher/worksheets';
  }

  // Actions
  async fillWorksheetForm(data: {
    grade?: string;
    class?: string;
    subject?: string;
    topic?: string;
    difficulty?: string;
    questionCount?: string;
  }): Promise<void> {
    if (data.grade) {
      await this.gradeSelect.selectOption(data.grade);
    }
    if (data.class) {
      await this.classSelect.selectOption(data.class);
    }
    if (data.subject) {
      await this.subjectSelect.selectOption(data.subject);
    }
    if (data.topic) {
      await this.topicInput.fill(data.topic);
    }
    if (data.difficulty) {
      await this.difficultySelect.selectOption(data.difficulty);
    }
    if (data.questionCount) {
      await this.questionCountInput.fill(data.questionCount);
    }
  }

  async generateWorksheet(): Promise<void> {
    await this.generateButton.click();
    await this.waitForPageLoad();
  }

  async saveWorksheet(): Promise<void> {
    await this.saveButton.click();
    await this.waitForPageLoad();
  }

  async navigateToSaved(): Promise<void> {
    await this.gotoPath('/teacher/worksheets/saved');
    await this.waitForPageLoad();
  }

  async viewWorksheet(index: number = 0): Promise<void> {
    await this.worksheetCard.nth(index).click();
    await this.waitForNavigation();
  }

  async deleteWorksheet(index: number = 0): Promise<void> {
    const card = this.worksheetCard.nth(index);
    await card.locator(this.deleteButton).click();
    // Wait for confirmation dialog if present
    await this.page.waitForTimeout(500);
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await this.waitForPageLoad();
  }

  async filterBySubject(subject: string): Promise<void> {
    await this.filterBySubjectDropdown.selectOption(subject);
    await this.waitForPageLoad();
  }

  async filterByDifficulty(difficulty: string): Promise<void> {
    await this.filterByDifficultyDropdown.selectOption(difficulty);
    await this.waitForPageLoad();
  }

  // Assertions
  async expectToBeOnWorksheetsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher\/worksheets/);
  }

  async expectFormVisible(): Promise<void> {
    await expect(this.gradeSelect).toBeVisible();
    await expect(this.subjectSelect).toBeVisible();
    await expect(this.topicInput).toBeVisible();
    await expect(this.difficultySelect).toBeVisible();
    await expect(this.generateButton).toBeVisible();
  }

  async expectGeneratedQuestionsVisible(): Promise<void> {
    await expect(this.generatedQuestionsArea).toBeVisible();
  }

  async expectSavedWorksheetsVisible(): Promise<void> {
    await expect(this.savedWorksheetsList).toBeVisible();
  }

  async expectWorksheetInList(topic: string | RegExp): Promise<void> {
    const worksheetWithTopic = this.page.getByText(topic);
    await expect(worksheetWithTopic).toBeVisible();
  }
}
