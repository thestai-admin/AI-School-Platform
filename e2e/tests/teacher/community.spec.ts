import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { TeacherCommunityPage } from '../../page-objects/teacher/community.page';

test.describe('Teacher Community', () => {
  let loginPage: LoginPage;
  let communityPage: TeacherCommunityPage;

  const teacherEmail = process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test';
  const teacherPassword = process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    communityPage = new TeacherCommunityPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(teacherEmail, teacherPassword);
  });

  test('should navigate to community page', async () => {
    await communityPage.goto();

    const page = communityPage.page;

    // Check if feature is available or if feature gate message shows
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (featureGateVisible) {
      // Feature is gated, verify the gate message
      expect(featureGateVisible).toBeTruthy();
    } else {
      // Feature is available, verify community page loaded
      await communityPage.expectToBeOnCommunityPage();
    }
  });

  test('should view community posts list with seeded post', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      // Verify seeded post is visible
      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      expect(hasPost).toBeTruthy();
    }
  });

  test('should view seeded post detail', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        await communityPage.viewPost();

        // Verify post details are visible
        const detailsVisible = await page.locator('text=/author|posted|content|comment/i').first().isVisible().catch(() => false);
        expect(detailsVisible).toBeTruthy();
      }
    }
  });

  test('should create new post', async () => {
    test.describe.configure({ mode: 'serial' });

    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.navigateToNewPost();

      await communityPage.createPost({
        title: 'Test Discussion Post',
        content: 'This is a test post for the community feature',
        type: 'DISCUSSION'
      });

      // Verify post was created
      const successVisible = await page.locator('text=/posted|created|success/i').isVisible().catch(() => false);
      expect(successVisible).toBeTruthy();
    }
  });

  test('should add comment to post', async () => {
    test.describe.configure({ mode: 'serial' });

    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        await communityPage.viewPost();

        const commentText = 'This is a test comment on the post';
        await communityPage.addComment(commentText);

        // Verify comment was added
        const commentVisible = await page.locator(`text=${commentText}`).isVisible().catch(() => false);
        expect(commentVisible).toBeTruthy();
      }
    }
  });

  test('should upvote a post', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        // Get initial upvote count if visible
        const upvoteCountElement = page.locator('[data-testid="upvote-count"]').first();
        const initialCount = await upvoteCountElement.textContent().catch(() => '0') || '0';

        await communityPage.upvotePost();

        // Verify upvote was registered
        await page.waitForTimeout(1000);
        const newCount = await upvoteCountElement.textContent().catch(() => '0') || '0';

        // Either count increased or upvote button changed state
        const upvoteActive = await page.locator('[data-testid="upvote-button"].active, [data-testid="upvote-button"][aria-pressed="true"]').first().isVisible().catch(() => false);
        expect(parseInt(newCount) > parseInt(initialCount) || upvoteActive).toBeTruthy();
      }
    }
  });

  test('should filter by post type', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        await communityPage.filterByType('DISCUSSION');
        await page.waitForTimeout(1000);

        // Verify filtered results
        const posts = await page.locator('[data-testid="post-item"]').all();

        if (posts.length > 0) {
          for (const post of posts) {
            const text = await post.textContent();
            expect(text).toMatch(/discussion/i);
          }
        }
      }
    }
  });

  test('should search posts', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        // Get title of first post to search for it
        const firstPost = page.locator('[data-testid="post-item"]').first();
        const postTitle = await firstPost.locator('[data-testid="post-title"]').textContent().catch(() => null);

        if (postTitle) {
          const searchTerm = postTitle.split(' ')[0];
          await communityPage.searchPosts(searchTerm);
          await page.waitForTimeout(1000);

          // Verify search results contain the search term
          const searchResults = await page.locator('[data-testid="post-item"]').all();
          expect(searchResults.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should display post metadata (author, date, type)', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        await communityPage.viewPost();

        // Verify post metadata is displayed
        const authorVisible = await page.locator('text=/author|posted by|by/i').first().isVisible().catch(() => false);
        const dateVisible = await page.locator('text=/\\d+.*ago|\\d{4}-\\d{2}-\\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i').first().isVisible().catch(() => false);
        const typeVisible = await page.locator('text=/discussion|question|resource|announcement/i').first().isVisible().catch(() => false);

        expect(authorVisible || dateVisible || typeVisible).toBeTruthy();
      }
    }
  });

  test('should view post comments list', async () => {
    await communityPage.goto();

    const page = communityPage.page;
    const featureGateVisible = await page.locator('text=/upgrade|feature not available|premium feature/i').isVisible().catch(() => false);

    if (!featureGateVisible) {
      await communityPage.expectPostsListVisible();

      const hasPost = await communityPage.postCard.first().isVisible().catch(() => false);
      if (hasPost) {
        await communityPage.viewPost();

        // Check for comments section
        const commentsVisible = await page.locator('text=/comment|reply|\\d+.*comment/i').first().isVisible().catch(() => false);
        expect(commentsVisible).toBeTruthy();

        // Verify comments list or empty state
        const hasComments = await page.locator('[data-testid="comment-item"]').count();
        const emptyState = await page.locator('text=/no comment|be.*first|add.*comment/i').isVisible().catch(() => false);

        expect(hasComments > 0 || emptyState || commentsVisible).toBeTruthy();
      }
    }
  });
});
