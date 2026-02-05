import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class AdminTeachersPage extends BasePage {
  // Navigation and filters
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly pendingTab: Locator;
  readonly activeTab: Locator;
  readonly allTab: Locator;
  readonly refreshButton: Locator;

  // Teacher list
  readonly teacherList: Locator;
  readonly teacherRow: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  // Teacher actions
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly viewDetailsButton: Locator;
  readonly editButton: Locator;
  readonly suspendButton: Locator;

  // Modal/Dialog elements
  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly rejectionReasonInput: Locator;

  // Stats
  readonly totalTeachersCount: Locator;
  readonly pendingTeachersCount: Locator;
  readonly activeTeachersCount: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation and filters - actual UI uses clickable cards for filtering (no search input)
    this.searchInput = page.getByPlaceholder(/search/i); // May not exist on page
    this.statusFilter = page.getByLabel(/status/i).or(page.locator('select[name="status"]'));
    // Filter cards - clicking them filters by status
    this.pendingTab = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Pending' }).first();
    this.activeTab = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Active' }).first();
    this.allTab = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Total' }).first();
    this.refreshButton = page.getByRole('button', { name: /refresh/i });

    // Teacher list - each card contains a heading (teacher name) and email paragraph
    this.teacherList = page.locator('.space-y-4');
    this.teacherRow = page.locator('div').filter({ has: page.locator('h3') }).filter({ has: page.locator('p') }).filter({ hasText: /@/ });
    this.emptyState = page.getByText(/no teachers found/i);
    this.loadingState = page.locator('.animate-spin');

    // Teacher actions (these will be scoped to specific rows)
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });
    this.viewDetailsButton = page.getByRole('button', { name: /view|details/i });
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.suspendButton = page.getByRole('button', { name: /suspend/i });

    // Modal/Dialog elements
    this.confirmDialog = page.locator('[role="dialog"], .modal, .dialog');
    this.confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    this.cancelButton = page.getByRole('button', { name: /cancel|no/i });
    this.rejectionReasonInput = page.getByLabel(/reason/i).or(
      page.locator('textarea[name="reason"], input[name="reason"]')
    );

    // Stats
    this.totalTeachersCount = page.locator('[data-testid="total-teachers"], .total-teachers');
    this.pendingTeachersCount = page.locator('[data-testid="pending-teachers"], .pending-teachers');
    this.activeTeachersCount = page.locator('[data-testid="active-teachers"], .active-teachers');
  }

  get path(): string {
    return '/admin/teachers';
  }

  // Actions
  async searchTeacher(query: string): Promise<void> {
    // Note: The current admin teachers page doesn't have a search input
    // This method will only work if search is implemented in the UI
    const isVisible = await this.searchInput.isVisible().catch(() => false);
    if (isVisible) {
      await this.searchInput.fill(query);
      await this.page.waitForTimeout(500); // Debounce
    }
  }

  async filterByStatus(status: 'all' | 'pending' | 'active' | 'suspended' | 'rejected'): Promise<void> {
    await this.statusFilter.selectOption(status);
  }

  async clickPendingTab(): Promise<void> {
    await this.pendingTab.click();
  }

  async clickActiveTab(): Promise<void> {
    await this.activeTab.click();
  }

  async clickAllTab(): Promise<void> {
    await this.allTab.click();
  }

  async refreshList(): Promise<void> {
    await this.refreshButton.click();
  }

  // Teacher row actions
  getTeacherRowByEmail(email: string): Locator {
    return this.teacherRow.filter({ hasText: email });
  }

  getTeacherRowByName(name: string): Locator {
    return this.teacherRow.filter({ hasText: name });
  }

  async approveTeacher(email: string): Promise<void> {
    const row = this.getTeacherRowByEmail(email);
    await row.getByRole('button', { name: /approve/i }).click();

    // Confirm if dialog appears
    if (await this.confirmDialog.isVisible()) {
      await this.confirmButton.click();
    }

    // Wait for success
    await this.page.waitForTimeout(1000);
  }

  async rejectTeacher(email: string, reason?: string): Promise<void> {
    const row = this.getTeacherRowByEmail(email);
    await row.getByRole('button', { name: /reject/i }).click();

    // Fill reason if dialog appears
    if (await this.confirmDialog.isVisible()) {
      if (reason && await this.rejectionReasonInput.isVisible()) {
        await this.rejectionReasonInput.fill(reason);
      }
      await this.confirmButton.click();
    }

    // Wait for success
    await this.page.waitForTimeout(1000);
  }

  async viewTeacherDetails(email: string): Promise<void> {
    const row = this.getTeacherRowByEmail(email);
    await row.getByRole('button', { name: /view|details/i }).click();
  }

  async suspendTeacher(email: string): Promise<void> {
    const row = this.getTeacherRowByEmail(email);
    await row.getByRole('button', { name: /suspend/i }).click();

    if (await this.confirmDialog.isVisible()) {
      await this.confirmButton.click();
    }
  }

  // Assertions
  async expectToBeOnTeachersPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/admin\/teachers/);
  }

  async expectTeacherListVisible(): Promise<void> {
    // Wait for loading to complete first
    await this.page.locator('text=Loading teachers...').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    // Wait for either teacher rows to be visible or empty state
    const hasTeachers = await this.teacherRow.first().isVisible().catch(() => false);
    const isEmpty = await this.emptyState.isVisible().catch(() => false);
    const hasHeading = await this.page.locator('h3').first().isVisible().catch(() => false);
    expect(hasTeachers || isEmpty || hasHeading).toBeTruthy();
  }

  async expectTeacherInList(email: string): Promise<void> {
    await expect(this.getTeacherRowByEmail(email)).toBeVisible();
  }

  async expectTeacherNotInList(email: string): Promise<void> {
    await expect(this.getTeacherRowByEmail(email)).toBeHidden();
  }

  async expectTeacherStatus(email: string, status: string): Promise<void> {
    const row = this.getTeacherRowByEmail(email);
    await expect(row).toContainText(new RegExp(status, 'i'));
  }

  async expectTeacherCount(count: number): Promise<void> {
    await expect(this.teacherRow).toHaveCount(count);
  }

  async expectPendingTeachersCount(count: number): Promise<void> {
    await expect(this.pendingTeachersCount).toContainText(count.toString());
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  async expectApprovalSuccess(): Promise<void> {
    const successMessage = this.page.locator('[role="status"], .success-message, .text-green-500');
    await expect(successMessage).toBeVisible();
  }

  async expectRejectionSuccess(): Promise<void> {
    const successMessage = this.page.locator('[role="status"], .success-message, .text-green-500');
    await expect(successMessage).toBeVisible();
  }
}
