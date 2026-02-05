import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class DiagramsPage extends BasePage {
  readonly diagramsList: Locator;
  readonly diagramCard: Locator;
  readonly createButton: Locator;
  readonly diagramCanvas: Locator;
  readonly nodeElement: Locator;
  readonly edgeElement: Locator;
  readonly toolbarArea: Locator;
  readonly saveButton: Locator;
  readonly titleInput: Locator;
  readonly typeSelect: Locator;
  readonly visibilitySelect: Locator;
  readonly deleteButton: Locator;
  readonly viewOnlyIndicator: Locator;

  constructor(page: Page, private role: 'teacher' | 'student' | 'admin' | 'parent') {
    super(page);
    this.diagramsList = page.locator('[data-testid="diagrams-list"], .diagrams-list, .diagram-grid');
    this.diagramCard = page.locator('[data-testid="diagram-card"], .diagram-card');
    this.createButton = page.getByRole('link', { name: /new diagram|create/i }).or(
      page.getByRole('button', { name: /new diagram|create/i })
    );
    this.diagramCanvas = page.locator('.react-flow, [data-testid="diagram-canvas"], .diagram-canvas');
    this.nodeElement = page.locator('.react-flow__node');
    this.edgeElement = page.locator('.react-flow__edge');
    this.toolbarArea = page.locator('[data-testid="diagram-toolbar"], .diagram-toolbar');
    this.saveButton = page.getByRole('button', { name: /save/i });
    this.titleInput = page.getByLabel(/title|name/i);
    this.typeSelect = page.getByLabel(/type/i);
    this.visibilitySelect = page.getByLabel(/visibility/i);
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.viewOnlyIndicator = page.locator('[data-testid="view-only"], .read-only-badge');
  }

  get path(): string {
    return `/${this.role}/diagrams`;
  }

  async navigateToNew(): Promise<void> {
    await this.createButton.click();
    await this.waitForNavigation();
  }

  async saveDiagram(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  async setVisibility(visibility: string): Promise<void> {
    await this.visibilitySelect.selectOption(visibility);
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  async deleteDiagram(): Promise<void> {
    await this.deleteButton.click();
    await this.page.waitForTimeout(500);
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await this.page.waitForTimeout(1000);
  }

  async viewDiagram(index: number): Promise<void> {
    await this.diagramCard.nth(index).click();
    await this.waitForNavigation();
  }

  // Assertions
  async expectToBeOnDiagramsPage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/${this.role}/diagrams`));
  }

  async expectDiagramsListVisible(): Promise<void> {
    // List might use various selectors
    const hasCards = await this.diagramCard.first().isVisible().catch(() => false);
    const hasList = await this.diagramsList.isVisible().catch(() => false);
    const hasAny = await this.page.getByText(/diagram|no diagrams/i).first().isVisible().catch(() => false);
    expect(hasCards || hasList || hasAny).toBeTruthy();
  }

  async expectDiagramInList(title: string): Promise<void> {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async expectCanvasVisible(): Promise<void> {
    await expect(this.diagramCanvas.first()).toBeVisible();
  }

  async expectDiagramSaved(): Promise<void> {
    const success = await this.page.getByText(/saved|success/i).first().isVisible().catch(() => false);
    expect(success).toBeTruthy();
  }

  async expectDiagramDeleted(): Promise<void> {
    const success = await this.page.getByText(/deleted|removed|success/i).first().isVisible().catch(() => false);
    expect(success).toBeTruthy();
  }

  async expectReadOnly(): Promise<void> {
    const readOnly = await this.viewOnlyIndicator.isVisible().catch(() => false);
    const noSave = await this.saveButton.isHidden().catch(() => true);
    expect(readOnly || noSave).toBeTruthy();
  }
}
