import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

import { cleanTestData, prisma } from './fixtures/database.fixture';

const AUTH_DIR = path.join(__dirname, '.auth');

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown...');

  // Option 1: Keep test data for debugging (default in development)
  // Option 2: Clean test data (useful for CI/CD)
  const shouldCleanData = process.env.CLEAN_TEST_DATA === 'true' || process.env.CI === 'true';

  if (shouldCleanData) {
    console.log('Cleaning test data...');
    try {
      await cleanTestData();
      console.log('Test data cleaned successfully');
    } catch (error) {
      console.error('Failed to clean test data:', error);
    }
  } else {
    console.log('Skipping test data cleanup (set CLEAN_TEST_DATA=true to clean)');
  }

  // Clean up auth storage files
  const cleanAuthFiles = process.env.CLEAN_AUTH_FILES === 'true';
  if (cleanAuthFiles) {
    console.log('Cleaning auth storage files...');
    try {
      if (fs.existsSync(AUTH_DIR)) {
        const files = fs.readdirSync(AUTH_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(AUTH_DIR, file));
        }
        console.log('Auth storage files cleaned');
      }
    } catch (error) {
      console.error('Failed to clean auth files:', error);
    }
  }

  // Disconnect Prisma
  await prisma.$disconnect();

  console.log('Global teardown completed');
}

export default globalTeardown;
