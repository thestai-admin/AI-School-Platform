import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Seed default subjects (gradeLevel null means applicable to all grades)
  const subjectNames = [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Science',
    'Computer Science',
  ]

  for (const name of subjectNames) {
    // Check if subject already exists with null gradeLevel
    const existing = await prisma.subject.findFirst({
      where: { name, gradeLevel: null },
    })

    if (!existing) {
      await prisma.subject.create({
        data: { name, gradeLevel: null },
      })
      console.log(`  Created subject: ${name}`)
    } else {
      console.log(`  Subject already exists: ${name}`)
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
