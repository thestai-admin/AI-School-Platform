import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, PoolConfig } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function parseConnectionString(connectionString: string): PoolConfig {
  // Check if this is a Cloud SQL Unix socket connection
  // Format: postgresql://user:pass@/database?host=/cloudsql/project:region:instance
  const hostMatch = connectionString.match(/[?&]host=([^&]+)/)

  if (hostMatch) {
    // Unix socket connection (Cloud SQL)
    const socketPath = decodeURIComponent(hostMatch[1])

    // Parse credentials and database using regex (URL parsing fails for hostless URLs)
    // Format: postgresql://user:password@/database?host=...
    const credentialsMatch = connectionString.match(
      /postgresql:\/\/([^:]+):([^@]+)@\/([^?]+)/
    )

    if (credentialsMatch) {
      return {
        user: credentialsMatch[1],
        password: credentialsMatch[2],
        database: credentialsMatch[3],
        host: socketPath, // pg uses 'host' for Unix socket path
        port: undefined, // No port for Unix sockets
      }
    }
  }

  // Standard TCP connection
  return { connectionString }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const poolConfig = parseConnectionString(connectionString)
  const pool = new Pool(poolConfig)
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
