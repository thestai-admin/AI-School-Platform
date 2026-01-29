/**
 * Script to fix test account passwords in production
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/fix-test-passwords.ts
 *
 * Run via Cloud SQL Proxy:
 *   1. Start proxy: ./cloud-sql-proxy ai-pathshala-prod:asia-south1:ai-pathshala-db
 *   2. Run: DATABASE_URL="postgresql://ai_pathshala_user:PASSWORD@localhost:5432/ai_pathshala" npx tsx scripts/fix-test-passwords.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Test accounts with their expected passwords
const testAccounts = [
  { email: 'admin@thestai.com', password: 'AIPathshala2026!' },
  { email: 'testteacher@thestai.com', password: 'TestTeacher2026!' },
  { email: 'teststudent@thestai.com', password: 'TestStudent2026!' },
]

async function main() {
  console.log('\n🔐 AI School Platform - Fix Test Account Passwords\n')

  for (const { email, password } of testAccounts) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      console.log(`⚠️  User not found: ${email}`)
      continue
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update the password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })

    console.log(`✅ Updated password for ${email} (${user.role})`)
  }

  console.log('\n🎉 Password update complete!\n')
  console.log('Test accounts:')
  for (const { email, password } of testAccounts) {
    console.log(`   - ${email} / ${password}`)
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
