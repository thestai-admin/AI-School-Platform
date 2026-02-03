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

    // Navigation and filters - actual UI uses clickable cards for filtering
    this.searchInput = page.getByPlaceholder(/search.*teacher|find.*teacher/i).or(
      page.locator('input[name="search"]')
    );
    this.statusFilter = page.getByLabel(/status/i).or(page.locator('select[name="status"]'));
    // Cards act as tabs in actual UI
    this.pendingTab = page.locator('.cursor-pointer').filter({ hasText: 'Pending' });
    this.activeTab = page.locator('.cursor-pointer').filter({ hasText: 'Active' });
    this.allTab = page.locator('.cursor-pointer').filter({ hasText: 'Total' });
    this.refreshButton = page.getByRole('button', { name: /refresh/i });

    // Teacher list - actual UI uses divs with border rounded-lg
    this.teacherList = page.locator('.space-y-4').first();
    this.teacherRow = page.locator('.border.rounded-lg.p-4');
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
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
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
    await expect(this.teacherList).toBeVisible();
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
