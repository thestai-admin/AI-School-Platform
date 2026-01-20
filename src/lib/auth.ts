import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './db/prisma'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      schoolId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    schoolId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    schoolId?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
          where: { email: credentials.email },
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
          where: { email },
          include: { accounts: true },
        })

        if (existingUser) {
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
          user.schoolId = existingUser.schoolId ?? undefined
        } else {
          // Create new user with STUDENT role
          const newUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split('@')[0],
              role: UserRole.STUDENT,
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
          user.schoolId = newUser.schoolId ?? undefined
        }
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.schoolId = user.schoolId
      }

      // For OAuth users, fetch role from database on subsequent requests
      // if role is missing (can happen on first OAuth sign-in before signIn callback completes)
      if (account?.provider === 'google' && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true, schoolId: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.schoolId = dbUser.schoolId ?? undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
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
  },
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
