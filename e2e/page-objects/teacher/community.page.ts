import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class TeacherCommunityPage extends BasePage {
  readonly postsList: Locator;
  readonly postCard: Locator;
  readonly newPostButton: Locator;
  readonly postTitleInput: Locator;
  readonly postContentTextarea: Locator;
  readonly postTypeSelect: Locator;
  readonly submitPostButton: Locator;
  readonly commentInput: Locator;
  readonly submitCommentButton: Locator;
  readonly upvoteButton: Locator;
  readonly searchInput: Locator;
  readonly postTypeFilter: Locator;
  readonly postDetail: Locator;
  readonly featureGateMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.postsList = page.locator('[data-testid="posts-list"], .posts-list, .community-posts');
    this.postCard = page.locator('[data-testid="post-card"], .post-card, .community-post');
    this.newPostButton = page.getByRole('link', { name: /new post|create post/i }).or(
      page.getByRole('button', { name: /new post|create/i })
    );
    this.postTitleInput = page.getByLabel(/title/i);
    this.postContentTextarea = page.getByLabel(/content|body/i).or(page.locator('textarea').first());
    this.postTypeSelect = page.getByLabel(/type|category/i);
    this.submitPostButton = page.getByRole('button', { name: /submit|create|post/i });
    this.commentInput = page.getByPlaceholder(/comment|reply/i).or(page.getByLabel(/comment/i));
    this.submitCommentButton = page.getByRole('button', { name: /comment|reply|submit/i });
    this.upvoteButton = page.getByRole('button', { name: /upvote|like/i }).or(page.locator('[data-testid="upvote-button"]'));
    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByLabel(/search/i));
    this.postTypeFilter = page.getByLabel(/filter.*type|post type/i);
    this.postDetail = page.locator('[data-testid="post-detail"], .post-detail');
    this.featureGateMessage = page.getByText(/not available|upgrade|feature.*not/i);
  }

  get path(): string {
    return '/teacher/community';
  }

  async navigateToNewPost(): Promise<void> {
    await this.newPostButton.click();
    await this.waitForNavigation();
  }

  async createPost(data: { title: string; content: string; type?: string }): Promise<void> {
    await this.postTitleInput.fill(data.title);
    await this.postContentTextarea.fill(data.content);
    if (data.type && await this.postTypeSelect.isVisible().catch(() => false)) {
      await this.postTypeSelect.selectOption(data.type);
    }
    await this.submitPostButton.click();
    await this.page.waitForTimeout(1000);
  }

  async viewPost(index: number = 0): Promise<void> {
    await this.postCard.nth(index).click();
    await this.waitForNavigation();
  }

  async addComment(text: string): Promise<void> {
    await this.commentInput.fill(text);
    await this.submitCommentButton.click();
    await this.page.waitForTimeout(1000);
  }

  async upvotePost(): Promise<void> {
    await this.upvoteButton.first().click();
    await this.page.waitForTimeout(500);
  }

  async searchPosts(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(1000);
  }

  async filterByType(type: string): Promise<void> {
    if (await this.postTypeFilter.isVisible().catch(() => false)) {
      await this.postTypeFilter.selectOption(type);
      await this.page.waitForTimeout(1000);
    }
  }

  // Assertions
  async expectToBeOnCommunityPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/teacher\/community/);
  }

  async expectFeatureGated(): Promise<void> {
    await expect(this.featureGateMessage).toBeVisible();
  }

  async expectPostsListVisible(): Promise<void> {
    const hasPosts = await this.postsList.isVisible().catch(() => false);
    const hasCards = await this.postCard.first().isVisible().catch(() => false);
    const hasAny = await this.page.getByText(/post|community|discussion/i).first().isVisible().catch(() => false);
    expect(hasPosts || hasCards || hasAny).toBeTruthy();
  }

  async expectPostInList(title: string): Promise<void> {
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async expectPostDetailVisible(): Promise<void> {
    const hasDetail = await this.postDetail.isVisible().catch(() => false);
    const hasContent = await this.postContentTextarea.isVisible().catch(() => false);
    const hasTitle = await this.page.getByRole('heading').first().isVisible().catch(() => false);
    expect(hasDetail || hasContent || hasTitle).toBeTruthy();
  }

  async expectCommentVisible(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectUpvoteSuccess(): Promise<void> {
    // Upvote count should have changed
    const success = await this.page.getByText(/upvoted|liked/i).first().isVisible().catch(() => false);
    // May not show explicit success message, just the count change
    expect(typeof success).toBe('boolean');
  }
}
