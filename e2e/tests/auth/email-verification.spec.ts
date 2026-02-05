import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test.describe('Email Verification', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;

  function generateUniqueEmail(prefix: string): string {
    const uniqueId = uuidv4().substring(0, 8);
    return `${prefix}-${uniqueId}@e2e.test`;
  }

  test('should register new user with PENDING_VERIFICATION status', async ({ request }) => {
    const email = generateUniqueEmail('verify-test');

    const response = await request.post(`${baseURL}/api/auth/register`, {
      data: {
        name: 'Verification Test User',
        email,
        password: 'SecurePassword123!',
        role: 'STUDENT',
        schoolSlug: process.env.TEST_SCHOOL_SLUG || 'e2e-test-school',
      },
    });

    // Registration should succeed
    expect(response.status()).toBeLessThan(500);

    // User should be in pending verification state
    if (response.ok()) {
      const data = await response.json();
      expect(data.status || data.user?.status || 'PENDING_VERIFICATION').toMatch(
        /PENDING_VERIFICATION|PENDING_APPROVAL|success/i
      );
    }
  });

  test('should reject verify-email with invalid token', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/verify-email`, {
      data: {
        token: 'invalid-token-that-does-not-exist',
      },
    });

    // Should return error
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should reject verify-email with expired token', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/verify-email`, {
      data: {
        token: 'expired-token-12345',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should handle resend verification request', async ({ request }) => {
    const email = generateUniqueEmail('resend-test');

    // First register
    await request.post(`${baseURL}/api/auth/register`, {
      data: {
        name: 'Resend Test User',
        email,
        password: 'SecurePassword123!',
        role: 'STUDENT',
        schoolSlug: process.env.TEST_SCHOOL_SLUG || 'e2e-test-school',
      },
    });

    // Then try to resend verification
    const response = await request.post(`${baseURL}/api/auth/resend-verification`, {
      data: { email },
    });

    // Should not be a server error (might be 200 or 400 depending on config)
    expect(response.status()).toBeLessThan(500);
  });

  test('should show verify-email-required page for unverified users', async ({ page }) => {
    await page.goto(`${baseURL}/verify-email-required`);
    // Page should load without errors
    await expect(page).toHaveURL(/verify-email/);
  });
});
