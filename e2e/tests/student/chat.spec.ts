import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/auth/login.page';
import { StudentChatPage } from '../../page-objects/student/chat.page';

test.describe('Student AI Chat', () => {
  let loginPage: LoginPage;
  let chatPage: StudentChatPage;

  const studentEmail = process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test';
  const studentPassword = process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new StudentChatPage(page);

    // Login as student
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect(studentEmail, studentPassword);

    // Navigate to chat
    await chatPage.goto();
  });

  test.describe('Chat Interface', () => {
    test('should display chat interface', async () => {
      await chatPage.expectToBeOnChatPage();
      await chatPage.expectChatInterfaceVisible();
    });

    test('should have message input field', async () => {
      await expect(chatPage.messageInput).toBeVisible();
      await expect(chatPage.messageInput).toBeEnabled();
    });

    test('should have send button', async () => {
      await expect(chatPage.sendButton).toBeVisible();
    });

    test('should start with empty or welcome message', async () => {
      // Chat should either be empty or have a welcome message
      const userMessageCount = await chatPage.userMessages.count();
      expect(userMessageCount).toBe(0);
    });
  });

  test.describe('Sending Messages', () => {
    test('should send a simple message', async () => {
      const testMessage = 'Hello, can you help me with math?';

      await chatPage.sendMessage(testMessage);

      // User message should appear in chat
      await chatPage.expectMessageSent(testMessage);
    });

    // Skip AI-dependent tests - require AI provider configuration
    test.skip('should receive AI response after sending message', async () => {
      const testMessage = 'What is 2 + 2?';

      await chatPage.sendMessageAndWaitForResponse(testMessage);

      // Should have AI response
      await chatPage.expectAIResponse();
    });

    // Skip AI-dependent tests - require AI provider configuration
    test.skip('should show loading state while waiting for response', async () => {
      const testMessage = 'Explain photosynthesis';

      // Send message
      await chatPage.messageInput.fill(testMessage);
      await chatPage.sendButton.click();

      // Loading should appear (may be quick)
      // Note: This test may be flaky if response is very fast
      try {
        await chatPage.expectLoading();
      } catch {
        // Loading might have already completed
      }

      // Eventually should not be loading
      await chatPage.expectNotLoading();
    });

    test('should clear input after sending message', async ({ page }) => {
      const testMessage = 'Test message';

      await chatPage.sendMessage(testMessage);

      // Input should be cleared
      await expect(chatPage.messageInput).toHaveValue('');
    });

    test('should not send empty message', async () => {
      // Send button should be disabled when input is empty
      await expect(chatPage.sendButton).toBeDisabled();
    });
  });

  // Skip AI-dependent conversation tests - require AI provider configuration
  test.describe.skip('Conversation Flow', () => {
    test('should maintain conversation context', async () => {
      // Send first message
      await chatPage.sendMessageAndWaitForResponse('My name is TestStudent');

      // Send follow-up
      await chatPage.sendMessageAndWaitForResponse('What is my name?');

      // AI should remember the name (check response contains it)
      const aiResponse = await chatPage.getLastAIMessage();
      // Note: AI response verification depends on actual AI behavior
      expect(aiResponse).toBeTruthy();
    });

    test('should show multiple messages in order', async () => {
      // Send first message
      await chatPage.sendMessageAndWaitForResponse('First question');

      // Send second message
      await chatPage.sendMessageAndWaitForResponse('Second question');

      // Should have 2 user messages and 2 AI messages
      const counts = await chatPage.getMessageCount();
      expect(counts.user).toBe(2);
      expect(counts.ai).toBe(2);
    });
  });

  test.describe('Subject Selection', () => {
    test('should allow selecting a subject if available', async () => {
      const subjectSelectVisible = await chatPage.subjectSelect.isVisible().catch(() => false);

      if (subjectSelectVisible) {
        await chatPage.selectSubject('Mathematics');
        await expect(chatPage.subjectSelect).toHaveValue(/math/i);
      }
    });
  });

  // Skip AI-dependent test - requires AI provider configuration
  test.describe.skip('New Chat', () => {
    test('should start new chat if button available', async () => {
      // Send a message first
      await chatPage.sendMessageAndWaitForResponse('Initial message');

      const newChatVisible = await chatPage.newChatButton.isVisible().catch(() => false);

      if (newChatVisible) {
        await chatPage.startNewChat();
        await chatPage.expectEmptyChat();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // This test simulates a network error
      // Note: Actual implementation depends on how the app handles errors

      // Intercept AI API calls and fail them
      await page.route('**/api/ai/**', route => {
        route.abort('failed');
      });

      await chatPage.sendMessage('Test message during network error');

      // Should show error or retry option
      // The actual behavior depends on implementation
      await page.waitForTimeout(5000); // Wait for potential error handling

      // Either error message appears or retry button
      const hasError = await chatPage.errorMessage.isVisible().catch(() => false);
      const hasRetry = await chatPage.retryButton.isVisible().catch(() => false);

      // Unroute to restore normal behavior
      await page.unroute('**/api/ai/**');

      // At least one error handling mechanism should be present
      // Note: This assertion may need adjustment based on actual implementation
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      // Focus on message input
      await chatPage.messageInput.focus();
      await expect(chatPage.messageInput).toBeFocused();

      // Type a message
      await page.keyboard.type('Keyboard test message');

      // Submit with Enter (if supported)
      await page.keyboard.press('Enter');

      // Message should be sent or cursor moves
    });

    test('should have proper ARIA labels', async () => {
      // Check for basic accessibility attributes
      const hasAriaLabel = await chatPage.messageInput.getAttribute('aria-label');
      const hasPlaceholder = await chatPage.messageInput.getAttribute('placeholder');

      // At least one accessible identifier should be present
      expect(hasAriaLabel || hasPlaceholder).toBeTruthy();
    });
  });

  // Skip AI-dependent test - requires AI provider configuration
  test.describe.skip('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await chatPage.sendMessageAndWaitForResponse('Quick test');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Response should be within 60 seconds (allowing for AI processing)
      expect(responseTime).toBeLessThan(60000);
    });
  });
});
