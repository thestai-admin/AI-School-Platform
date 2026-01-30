import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test user credentials from environment
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test',
    password: process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!',
  },
  parent: {
    email: process.env.TEST_PARENT_EMAIL || 'test-parent@e2e.test',
    password: process.env.TEST_PARENT_PASSWORD || 'TestParent123!',
  },
  pendingTeacher: {
    email: process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test',
    password: process.env.TEST_PENDING_TEACHER_PASSWORD || 'TestPendingTeacher123!',
  },
};

// Storage state file paths
const AUTH_DIR = path.join(__dirname, '../.auth');
const storageStatePaths = {
  admin: path.join(AUTH_DIR, 'admin.json'),
  teacher: path.join(AUTH_DIR, 'teacher.json'),
  student: path.join(AUTH_DIR, 'student.json'),
  parent: path.join(AUTH_DIR, 'parent.json'),
};

export type UserType = 'admin' | 'teacher' | 'student' | 'parent';

// Extend the base test with authenticated fixtures
export interface AuthFixtures {
  adminPage: Page;
  teacherPage: Page;
  studentPage: Page;
  parentPage: Page;
  adminContext: BrowserContext;
  teacherContext: BrowserContext;
  studentContext: BrowserContext;
  parentContext: BrowserContext;
}

// Helper to authenticate a user and save storage state
async function authenticateUser(
  page: Page,
  userType: UserType,
  baseURL: string
): Promise<void> {
  const user = TEST_USERS[userType];

  // Go to login page
  await page.goto(`${baseURL}/login`);

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  // Submit the form
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(url => {
    const path = url.pathname;
    return path.includes('/dashboard') ||
           path.includes('/admin') ||
           path.includes('/teacher') ||
           path.includes('/student') ||
           path.includes('/parent');
  }, { timeout: 15000 });
}

// Setup authentication for all users
export async function setupAuthentication(
  browser: typeof import('@playwright/test').chromium
): Promise<void> {
  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  for (const [userType, storagePath] of Object.entries(storageStatePaths)) {
    console.log(`Setting up authentication for ${userType}...`);

    const context = await browser.launch().then(b => b.newContext());
    const page = await context.newPage();

    try {
      await authenticateUser(page, userType as UserType, baseURL);

      // Save storage state
      await context.storageState({ path: storagePath });
      console.log(`Authentication saved for ${userType}`);
    } catch (error) {
      console.error(`Failed to authenticate ${userType}:`, error);
      // Create empty storage state to prevent test failures
      fs.writeFileSync(storagePath, JSON.stringify({ cookies: [], origins: [] }));
    } finally {
      await context.close();
    }
  }
}

// Create extended test with authenticated fixtures
export const test = base.extend<AuthFixtures>({
  // Admin authenticated context and page
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: storageStatePaths.admin,
    });
    await use(context);
    await context.close();
  },
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },

  // Teacher authenticated context and page
  teacherContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: storageStatePaths.teacher,
    });
    await use(context);
    await context.close();
  },
  teacherPage: async ({ teacherContext }, use) => {
    const page = await teacherContext.newPage();
    await use(page);
    await page.close();
  },

  // Student authenticated context and page
  studentContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: storageStatePaths.student,
    });
    await use(context);
    await context.close();
  },
  studentPage: async ({ studentContext }, use) => {
    const page = await studentContext.newPage();
    await use(page);
    await page.close();
  },

  // Parent authenticated context and page
  parentContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: storageStatePaths.parent,
    });
    await use(context);
    await context.close();
  },
  parentPage: async ({ parentContext }, use) => {
    const page = await parentContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
export { TEST_USERS, storageStatePaths, AUTH_DIR };
