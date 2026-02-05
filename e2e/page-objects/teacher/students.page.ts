import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherStudentsPage extends BasePage {
  // Student list
  readonly studentsList: Locator;
  readonly studentCard: Locator;
  readonly studentName: Locator;

  // Stats and overview
  readonly statsCards: Locator;
  readonly classSelect: Locator;
  readonly searchInput: Locator;

  // Student details
  readonly studentDetail: Locator;
  readonly progressSection: Locator;
  readonly homeworkHistory: Locator;
  readonly attendanceRecord: Locator;

  // Actions
  readonly viewDetailButton: Locator;
  readonly viewProgressButton: Locator;

  constructor(page: Page) {
    super(page);

    // Student list
    this.studentsList = page.locator('[data-testid="students-list"], .students-list');
    this.studentCard = page.locator('[data-testid="student-card"], .student-card');
    this.studentName = page.locator('[data-testid="student-name"], .student-name');

    // Stats and overview
    this.statsCards = page.locator('[data-testid="stats-card"], .stats-card');
    this.classSelect = page.getByLabel(/class|section/i);
    this.searchInput = page.getByPlaceholder(/search students|search/i);

    // Student details
    this.studentDetail = page.locator('[data-testid="student-detail"], .student-detail');
    this.progressSection = page.locator('[data-testid="progress-section"], .progress-section');
    this.homeworkHistory = page.locator('[data-testid="homework-history"], .homework-history');
    this.attendanceRecord = page.locator('[data-testid="attendance-record"], .attendance-record');

    // Actions
    this.viewDetailButton = page.getByRole('button', { name: /view details|details/i });
    this.viewProgressButton = page.getByRole('button', { name: /view progress|progress/i });
  }

  get path(): string {
    return '/teacher/dashboard';
  }

  // Actions
  async navigateToStudents(): Promise<void> {
    await this.goto();
    // Navigate to students view from dashboard
    const studentsLink = this.page.getByRole('link', { name: /students/i });
    if (await studentsLink.isVisible()) {
      await studentsLink.click();
      await this.waitForNavigation();
    }
  }

  async filterByClass(classId: string): Promise<void> {
    await this.classSelect.selectOption(classId);
    await this.waitForPageLoad();
  }

  async searchStudent(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.waitForPageLoad();
  }

  async viewStudentDetail(index: number = 0): Promise<void> {
    const card = this.studentCard.nth(index);
    await card.click();
    await this.waitForNavigation();
  }

  async viewStudentProgress(index: number = 0): Promise<void> {
    const card = this.studentCard.nth(index);
    const progressButton = card.locator(this.viewProgressButton);
    if (await progressButton.isVisible()) {
      await progressButton.click();
    } else {
      await card.click();
    }
    await this.waitForNavigation();
  }

  // Assertions
  async expectToBeOnStudentsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher\/(dashboard|students|classes)/);
  }

  async expectStudentsListVisible(): Promise<void> {
    await expect(this.studentsList.first()).toBeVisible();
  }

  async expectStudentInList(name: string | RegExp): Promise<void> {
    const studentWithName = this.page.getByText(name);
    await expect(studentWithName).toBeVisible();
  }

  async expectStudentDetailVisible(): Promise<void> {
    await expect(this.studentDetail).toBeVisible();
  }

  async expectProgressVisible(): Promise<void> {
    await expect(this.progressSection).toBeVisible();
  }

  async expectStatsVisible(): Promise<void> {
    await expect(this.statsCards.first()).toBeVisible();
  }
}
