import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './db/prisma'
import { UserRole, UserStatus } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      status: UserStatus
      schoolId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    status: UserStatus
    schoolId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    status: UserStatus
    schoolId?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user) {
          throw new Error('No user found with this email')
        }

        // Check if user has a password (might be OAuth-only user)
        if (!user.password) {
          throw new Error('Please sign in with Google')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error('Invalid password')
        }

        // Check user status
        if (user.status === 'PENDING_VERIFICATION') {
          throw new Error('Please verify your email before logging in. Check your inbox for the verification link.')
        }

        if (user.status === 'PENDING_APPROVAL') {
          throw new Error('Your account is pending administrator approval. You will receive an email once approved.')
        }

        if (user.status === 'SUSPENDED') {
          throw new Error('Your account has been suspended. Please contact support.')
        }

        if (user.status === 'REJECTED') {
          throw new Error('Your registration was not approved. Please contact support for more information.')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          schoolId: user.schoolId ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only handle OAuth providers (Google)
      if (account?.provider === 'google') {
        const email = user.email
        if (!email) return false

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { accounts: true },
        })

        if (existingUser) {
          // Check user status for existing users
          if (existingUser.status === 'PENDING_VERIFICATION') {
            return '/login?error=PendingVerification'
          }

          if (existingUser.status === 'SUSPENDED') {
            return '/login?error=AccountSuspended'
          }

          if (existingUser.status === 'REJECTED') {
            return '/login?error=AccountRejected'
          }

          // For pending approval (teachers), allow login but they'll see restricted access
          // Check if this Google account is already linked
          const existingAccount = existingUser.accounts.find(
            (acc) => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
          )

          if (!existingAccount) {
            // Link Google account to existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | undefined,
              },
            })
          }

          // Update the user object with DB values for jwt callback
          user.id = existingUser.id
          user.role = existingUser.role
          user.status = existingUser.status
          user.schoolId = existingUser.schoolId ?? undefined
        } else {
          // Create new user with STUDENT role - Google OAuth users are auto-verified
          const newUser = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              name: user.name || email.split('@')[0],
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE, // Google OAuth users are auto-verified
              emailVerified: new Date(),
              accounts: {
                create: {
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state as string | undefined,
                },
              },
            },
          })

          // Update the user object with DB values for jwt callback
          user.id = newUser.id
          user.role = newUser.role
          user.status = newUser.status
          user.schoolId = newUser.schoolId ?? undefined
        }
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status
        token.schoolId = user.schoolId
      }

      // For OAuth users, fetch role from database on subsequent requests
      // if role is missing (can happen on first OAuth sign-in before signIn callback completes)
      if (account?.provider === 'google' && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true, status: true, schoolId: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.status = dbUser.status
          token.schoolId = dbUser.schoolId ?? undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.status = token.status
        session.user.schoolId = token.schoolId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate secure random token
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const randomValues = new Uint8Array(64)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < 64; i++) {
    token += chars[randomValues[i] % chars.length]
  }
  return token
}
