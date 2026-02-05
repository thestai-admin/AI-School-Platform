import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentWorksheetsPage extends BasePage {
  // Locators
  readonly worksheetsList: Locator;
  readonly worksheetCard: Locator;
  readonly worksheetTitle: Locator;
  readonly questionsArea: Locator;
  readonly questionItem: Locator;
  readonly answerInput: Locator;
  readonly mcqOption: Locator;
  readonly submitButton: Locator;
  readonly resultsSummary: Locator;
  readonly scoreDisplay: Locator;
  readonly retryButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.worksheetsList = this.getByTestId('worksheets-list');
    this.worksheetCard = this.getByTestId('worksheet-card');
    this.worksheetTitle = this.getByTestId('worksheet-title');
    this.questionsArea = this.getByTestId('questions-area');
    this.questionItem = this.getByTestId('question-item');
    this.answerInput = this.getByTestId('answer-input');
    this.mcqOption = this.getByTestId('mcq-option');
    this.submitButton = this.getByRole('button', { name: /submit/i });
    this.resultsSummary = this.getByTestId('results-summary');
    this.scoreDisplay = this.getByTestId('score-display');
    this.retryButton = this.getByRole('button', { name: /retry/i });
    this.emptyState = this.getByTestId('empty-state');
  }

  get path(): string {
    return '/student/worksheets';
  }

  // Actions
  async viewWorksheet(id: string): Promise<void> {
    await this.gotoPath(`/student/worksheets/${id}`);
    await this.waitForPageLoad();
  }

  async openWorksheet(): Promise<void> {
    await this.worksheetCard.first().click();
    await this.waitForNavigation();
  }

  async answerMCQ(questionIndex: number, optionIndex: number): Promise<void> {
    const question = this.questionItem.nth(questionIndex);
    const option = question.locator(this.mcqOption).nth(optionIndex);
    await option.click();
  }

  async answerTextQuestion(questionIndex: number, answer: string): Promise<void> {
    const question = this.questionItem.nth(questionIndex);
    const input = question.locator(this.answerInput);
    await input.fill(answer);
  }

  async submitWorksheet(): Promise<void> {
    await this.clickButton(/submit/i);
    await this.waitForPageLoad();
  }

  async retryWorksheet(): Promise<void> {
    await this.retryButton.click();
    await this.waitForPageLoad();
  }

  // Assertions
  async expectToBeOnWorksheetsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/worksheets/);
  }

  async expectWorksheetsListVisible(): Promise<void> {
    await expect(this.worksheetsList).toBeVisible();
  }

  async expectWorksheetDetailVisible(): Promise<void> {
    await expect(this.worksheetTitle).toBeVisible();
    await expect(this.questionsArea).toBeVisible();
  }

  async expectQuestionsVisible(): Promise<void> {
    await expect(this.questionsArea).toBeVisible();
    await expect(this.questionItem.first()).toBeVisible();
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.resultsSummary).toBeVisible();
    await expect(this.scoreDisplay).toBeVisible();
  }

  async expectScore(expectedScore: string | RegExp): Promise<void> {
    await expect(this.scoreDisplay).toContainText(expectedScore);
  }
}
