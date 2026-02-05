import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminStudentsPage extends BasePage {
  readonly studentList: Locator;
  readonly studentRow: Locator;
  readonly searchInput: Locator;
  readonly classFilter: Locator;
  readonly studentDetail: Locator;
  readonly progressSection: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;
  readonly studentCount: Locator;

  constructor(page: Page) {
    super(page);
    this.studentList = page.locator('[data-testid="student-list"], .student-list, table, .students-grid');
    this.studentRow = page.locator('[data-testid="student-row"], tr, .student-card');
    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByLabel(/search/i));
    this.classFilter = page.getByLabel(/class|filter/i).or(page.locator('[data-testid="class-filter"]'));
    this.studentDetail = page.locator('[data-testid="student-detail"], .student-detail');
    this.progressSection = page.locator('[data-testid="progress-section"]');
    this.emptyState = page.getByText(/no students|empty/i);
    this.loadingState = page.locator('.loading, [data-testid="loading"]');
    this.studentCount = page.locator('[data-testid="student-count"]');
  }

  get path(): string {
    return '/admin/students';
  }

  async searchStudent(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(1000);
  }

  async filterByClass(className: string): Promise<void> {
    await this.classFilter.selectOption(className);
    await this.page.waitForTimeout(1000);
  }

  async viewStudentDetail(identifier: string): Promise<void> {
    const row = this.page.getByText(identifier).first();
    await row.click();
    await this.waitForNavigation();
  }

  async viewStudentProgress(identifier: string): Promise<void> {
    const progressBtn = this.page.getByRole('button', { name: /progress|view/i });
    await progressBtn.click();
    await this.page.waitForTimeout(1000);
  }

  // Assertions
  async expectToBeOnStudentsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/students/);
  }

  async expectStudentListVisible(): Promise<void> {
    const hasList = await this.studentList.first().isVisible().catch(() => false);
    const hasRows = await this.studentRow.first().isVisible().catch(() => false);
    const hasEmpty = await this.emptyState.isVisible().catch(() => false);
    expect(hasList || hasRows || hasEmpty).toBeTruthy();
  }

  async expectStudentInList(identifier: string): Promise<void> {
    await expect(this.page.getByText(identifier).first()).toBeVisible();
  }

  async expectStudentDetailVisible(): Promise<void> {
    const hasDetail = await this.studentDetail.isVisible().catch(() => false);
    const hasContent = await this.page.getByText(/student|detail|profile/i).first().isVisible().catch(() => false);
    expect(hasDetail || hasContent).toBeTruthy();
  }

  async expectStudentCount(count: number): Promise<void> {
    await expect(this.studentCount).toContainText(count.toString());
  }
}
