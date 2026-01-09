import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth'
import { UserRole, Language } from '@prisma/client'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

interface RegisterRequest {
  name: string
  email: string
  password: string
  role: UserRole
  languagePreference?: Language
  phone?: string
  schoolId?: string
}

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  if (!/[@$!%*?&#^()_+=\-]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&#^()_+=-)' }
  }
  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit registration attempts
    const clientIp = getClientIp(request)
    const rateLimit = rateLimiters.register(clientIp)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime)
    }

    const body: RegisterRequest = await request.json()

    const { name, email, password, role, languagePreference, phone, schoolId } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Sanitize name (prevent XSS)
    const sanitizedName = name.replace(/<[^>]*>/g, '').trim().slice(0, 100)
    if (sanitizedName.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    // Note: Using generic error to prevent user enumeration
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      // Return generic success to prevent user enumeration
      // In production, you might want to send an email saying "account already exists"
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Verify school exists if provided
    if (schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
      })
      if (!school) {
        return NextResponse.json(
          { error: 'Invalid school' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        languagePreference: languagePreference || Language.ENGLISH,
        phone: phone?.replace(/[^\d+\-\s()]/g, '').slice(0, 20),
        schoolId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
