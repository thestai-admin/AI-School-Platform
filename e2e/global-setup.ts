import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

import { seedTestData, prisma } from './fixtures/database.fixture';

const AUTH_DIR = path.join(__dirname, '.auth');

// Test user credentials
const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
    storageFile: 'admin.json',
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!',
    storageFile: 'teacher.json',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test',
    password: process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!',
    storageFile: 'student.json',
  },
  parent: {
    email: process.env.TEST_PARENT_EMAIL || 'test-parent@e2e.test',
    password: process.env.TEST_PARENT_PASSWORD || 'TestParent123!',
    storageFile: 'parent.json',
  },
  // Note: pendingTeacher is seeded in the DB but NOT authenticated here.
  // The credentials provider blocks PENDING_APPROVAL users from logging in
  // (shows error message instead of redirecting). Tests verify the error.
};

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup...');

  // Get base URL from config (must be set via PLAYWRIGHT_BASE_URL)
  const baseURL = config.projects[0]?.use?.baseURL;

  if (!baseURL) {
    throw new Error(
      'PLAYWRIGHT_BASE_URL environment variable is required. ' +
        'Set it to your deployed cloud environment URL (e.g., https://test.thestai.com)'
    );
  }

  console.log(`Running E2E tests against: ${baseURL}`);

  // Step 1: Seed test data to cloud database
  console.log('Seeding test database...');
  try {
    await seedTestData();
    console.log('Test data seeded successfully');
  } catch (error) {
    console.error('Failed to seed test data:', error);
    // Continue anyway - data might already exist
  }

  // Step 2: Create auth directory
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Create a default empty storage state for unauthenticated tests
  const defaultStorage = { cookies: [], origins: [] };
  fs.writeFileSync(
    path.join(AUTH_DIR, 'user.json'),
    JSON.stringify(defaultStorage)
  );

  // Step 3: Authenticate test users and save their session state
  console.log('Authenticating test users...');

  const browser = await chromium.launch();

  for (const [role, user] of Object.entries(TEST_USERS)) {
    console.log(`Authenticating ${role}...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login page
      await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });

      // Fill login form
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);

      // Submit
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      // Wait for redirect
      await page.waitForURL(url => {
        const pathname = url.pathname;
        return !pathname.includes('/login') && (
          pathname.includes('/dashboard') ||
          pathname.includes('/admin') ||
          pathname.includes('/teacher') ||
          pathname.includes('/student') ||
          pathname.includes('/parent') ||
          pathname.includes('/pending-approval') ||
          pathname.includes('/verify-email-required')
        );
      }, { timeout: 15000 });

      // Save storage state
      await context.storageState({
        path: path.join(AUTH_DIR, user.storageFile),
      });

      console.log(`${role} authenticated and session saved`);
    } catch (error) {
      console.error(`Failed to authenticate ${role}:`, error);
      // Create empty storage state to prevent test failures
      fs.writeFileSync(
        path.join(AUTH_DIR, user.storageFile),
        JSON.stringify(defaultStorage)
      );
    } finally {
      await context.close();
    }
  }

  await browser.close();

  // Disconnect Prisma
  await prisma.$disconnect();

  console.log('Global setup completed');
}

export default globalSetup;
