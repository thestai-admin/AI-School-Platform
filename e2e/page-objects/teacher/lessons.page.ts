import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherLessonsPage extends BasePage {
  // Form elements
  readonly gradeSelect: Locator;
  readonly classSelect: Locator;
  readonly subjectSelect: Locator;
  readonly topicInput: Locator;
  readonly languageSelect: Locator;
  readonly durationInput: Locator;
  readonly generateButton: Locator;
  readonly saveButton: Locator;

  // Output and preview
  readonly lessonPlanOutput: Locator;
  readonly lessonPreviewArea: Locator;

  // Saved lessons
  readonly savedLessonsList: Locator;
  readonly lessonCard: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly filterBySubjectDropdown: Locator;

  constructor(page: Page) {
    super(page);

    // Form elements
    this.gradeSelect = page.getByLabel(/grade|class/i);
    this.classSelect = page.getByLabel(/class|section/i);
    this.subjectSelect = page.getByLabel(/subject/i);
    this.topicInput = page.getByLabel(/topic/i);
    this.languageSelect = page.getByLabel(/language/i);
    this.durationInput = page.getByLabel(/duration/i);
    this.generateButton = page.getByRole('button', { name: /generate lesson|generate/i });
    this.saveButton = page.getByRole('button', { name: /save lesson|save/i });

    // Output and preview
    this.lessonPlanOutput = page.locator('[data-testid="lesson-plan-output"], .lesson-plan-output, .lesson-output');
    this.lessonPreviewArea = page.locator('[data-testid="lesson-preview"], .lesson-preview, .preview-area');

    // Saved lessons
    this.savedLessonsList = page.locator('[data-testid="saved-lessons-list"], .saved-lessons-list, .lessons-list');
    this.lessonCard = page.locator('[data-testid="lesson-card"], .lesson-card');
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.filterBySubjectDropdown = page.getByLabel(/filter by subject|filter subject/i);
  }

  get path(): string {
    return '/teacher/lessons';
  }

  // Actions
  async fillLessonForm(data: {
    grade?: string;
    class?: string;
    subject?: string;
    topic?: string;
    language?: string;
    duration?: string;
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
    if (data.language) {
      await this.languageSelect.selectOption(data.language);
    }
    if (data.duration) {
      await this.durationInput.fill(data.duration);
    }
  }

  async generateLesson(): Promise<void> {
    await this.generateButton.click();
    await this.waitForPageLoad();
  }

  async saveLesson(): Promise<void> {
    await this.saveButton.click();
    await this.waitForPageLoad();
  }

  async navigateToSaved(): Promise<void> {
    await this.gotoPath('/teacher/lessons/saved');
    await this.waitForPageLoad();
  }

  async viewLesson(index: number = 0): Promise<void> {
    await this.lessonCard.nth(index).click();
    await this.waitForNavigation();
  }

  async editLesson(index: number = 0): Promise<void> {
    const card = this.lessonCard.nth(index);
    await card.locator(this.editButton).click();
    await this.waitForNavigation();
  }

  async deleteLesson(index: number = 0): Promise<void> {
    const card = this.lessonCard.nth(index);
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

  // Assertions
  async expectToBeOnLessonsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher\/lessons/);
  }

  async expectLessonFormVisible(): Promise<void> {
    await expect(this.gradeSelect).toBeVisible();
    await expect(this.subjectSelect).toBeVisible();
    await expect(this.topicInput).toBeVisible();
    await expect(this.generateButton).toBeVisible();
  }

  async expectGeneratedPlanVisible(): Promise<void> {
    await expect(this.lessonPlanOutput.first()).toBeVisible();
  }

  async expectSavedLessonsVisible(): Promise<void> {
    await expect(this.savedLessonsList).toBeVisible();
  }

  async expectLessonInList(topic: string | RegExp): Promise<void> {
    const lessonWithTopic = this.page.getByText(topic);
    await expect(lessonWithTopic).toBeVisible();
  }
}
