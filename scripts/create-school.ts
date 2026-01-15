/**
 * Script to create a school with an admin user for the AI School Platform
 *
 * Usage:
 *   npx tsx scripts/create-school.ts
 *
 * Or with custom values:
 *   SCHOOL_NAME="My School" SCHOOL_SLUG="myschool" ADMIN_EMAIL="admin@example.com" npx tsx scripts/create-school.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as readline from 'readline'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Default values (can be overridden via environment variables)
const defaults = {
  schoolName: process.env.SCHOOL_NAME || 'Demo School',
  schoolSlug: process.env.SCHOOL_SLUG || 'demo',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@thestai.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!',
  adminName: process.env.ADMIN_NAME || 'School Admin',
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    const defaultText = defaultValue ? ` (${defaultValue})` : ''
    rl.question(`${question}${defaultText}: `, (answer) => {
      rl.close()
      resolve(answer || defaultValue || '')
    })
  })
}

async function main() {
  console.log('\n🏫 AI School Platform - School Setup\n')
  console.log('This script will create a new school with an admin user.\n')

  // Check if running interactively or with defaults
  const isInteractive = process.stdin.isTTY && !process.env.SCHOOL_NAME

  let schoolName: string
  let schoolSlug: string
  let adminEmail: string
  let adminPassword: string
  let adminName: string

  if (isInteractive) {
    schoolName = await prompt('School name', defaults.schoolName)
    schoolSlug = await prompt('School slug (subdomain)', defaults.schoolSlug)
    adminEmail = await prompt('Admin email', defaults.adminEmail)
    adminPassword = await prompt('Admin password', defaults.adminPassword)
    adminName = await prompt('Admin name', defaults.adminName)
  } else {
    schoolName = defaults.schoolName
    schoolSlug = defaults.schoolSlug
    adminEmail = defaults.adminEmail
    adminPassword = defaults.adminPassword
    adminName = defaults.adminName
  }

  // Normalize slug
  schoolSlug = schoolSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  console.log('\n📝 Creating school and admin user...\n')

  // Check if school with this slug already exists
  const existingSchool = await prisma.school.findUnique({
    where: { slug: schoolSlug },
  })

  if (existingSchool) {
    console.log(`⚠️  School with slug "${schoolSlug}" already exists.`)
    console.log(`   School ID: ${existingSchool.id}`)
    console.log(`   School Name: ${existingSchool.name}`)
    console.log('\n   To create a new school, use a different slug.\n')
    return
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (existingUser) {
    console.log(`⚠️  User with email "${adminEmail}" already exists.`)
    console.log('\n   To create a new admin, use a different email.\n')
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  // Create school and admin in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create school
    const school = await tx.school.create({
      data: {
        name: schoolName,
        slug: schoolSlug,
        email: adminEmail,
        settings: {
          language: 'ENGLISH',
          timezone: 'Asia/Kolkata',
        },
      },
    })

    // Create admin user
    const admin = await tx.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN',
        languagePreference: 'ENGLISH',
        schoolId: school.id,
      },
    })

    // Create default classes (1-10)
    const classes = []
    for (let grade = 1; grade <= 10; grade++) {
      const cls = await tx.class.create({
        data: {
          name: `Class ${grade}`,
          grade,
          section: 'A',
          schoolId: school.id,
        },
      })
      classes.push(cls)
    }

    return { school, admin, classes }
  })

  console.log('✅ School created successfully!\n')
  console.log('   School Details:')
  console.log(`   - ID: ${result.school.id}`)
  console.log(`   - Name: ${result.school.name}`)
  console.log(`   - Slug: ${result.school.slug}`)
  console.log(`   - URL: https://${schoolSlug}.thestai.com\n`)

  console.log('   Admin Details:')
  console.log(`   - ID: ${result.admin.id}`)
  console.log(`   - Email: ${result.admin.email}`)
  console.log(`   - Name: ${result.admin.name}`)
  console.log(`   - Password: ${adminPassword}\n`)

  console.log(`   Created ${result.classes.length} classes (Grades 1-10)\n`)

  console.log('🚀 Next steps:')
  console.log(`   1. Visit https://${schoolSlug}.thestai.com`)
  console.log(`   2. Login with email: ${adminEmail}`)
  console.log(`   3. Add teachers and students from the admin dashboard\n`)
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
