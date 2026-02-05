import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudentCompetitivePage extends BasePage {
  // Locators
  readonly examTypeList: Locator;
  readonly examCard: Locator;
  readonly practiceSetArea: Locator;
  readonly questionDisplay: Locator;
  readonly answerOptions: Locator;
  readonly submitAnswer: Locator;
  readonly resultsArea: Locator;
  readonly explanationText: Locator;
  readonly progressTracker: Locator;
  readonly featureGateMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.examTypeList = this.getByTestId('exam-type-list');
    this.examCard = this.getByTestId('exam-card');
    this.practiceSetArea = this.getByTestId('practice-set-area');
    this.questionDisplay = this.getByTestId('question-display');
    this.answerOptions = this.getByTestId('answer-options');
    this.submitAnswer = this.getByRole('button', { name: /submit answer/i });
    this.resultsArea = this.getByTestId('results-area');
    this.explanationText = this.getByTestId('explanation-text');
    this.progressTracker = this.getByTestId('progress-tracker');
    this.featureGateMessage = this.getByTestId('feature-gate-message');
  }

  get path(): string {
    return '/student/competitive';
  }

  // Actions
  async selectExamType(type: string): Promise<void> {
    const examCard = this.examCard.filter({ hasText: type });
    await examCard.click();
    await this.waitForNavigation();
  }

  async startPractice(): Promise<void> {
    await this.page.getByRole('button', { name: /start practice/i }).click();
    await this.waitForPageLoad();
  }

  async answerQuestion(optionIndex: number): Promise<void> {
    const option = this.answerOptions.locator('input, button').nth(optionIndex);
    await option.click();
  }

  async submitPractice(): Promise<void> {
    await this.submitAnswer.click();
    await this.waitForPageLoad();
  }

  async viewResults(): Promise<void> {
    await this.page.getByRole('button', { name: /view results/i }).click();
    await this.waitForNavigation();
  }

  async viewProgress(): Promise<void> {
    await this.page.getByRole('link', { name: /progress/i }).click();
    await this.waitForNavigation();
  }

  // Assertions
  async expectToBeOnCompetitivePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/student\/competitive/);
  }

  async expectFeatureGated(): Promise<void> {
    await expect(this.featureGateMessage).toBeVisible();
  }

  async expectExamTypesVisible(): Promise<void> {
    await expect(this.examTypeList).toBeVisible();
    await expect(this.examCard.first()).toBeVisible();
  }

  async expectPracticeActive(): Promise<void> {
    await expect(this.practiceSetArea).toBeVisible();
    await expect(this.questionDisplay).toBeVisible();
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.resultsArea).toBeVisible();
  }

  async expectProgressVisible(): Promise<void> {
    await expect(this.progressTracker).toBeVisible();
  }
}
