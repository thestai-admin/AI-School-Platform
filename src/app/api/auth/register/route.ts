import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { UserRole, UserStatus, Language } from '@prisma/client'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { sendEmail, getBaseUrl } from '@/lib/email/email-service'
import { emailVerificationTemplate } from '@/lib/email/templates'

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

    // Validate role - ADMIN cannot self-register
    const allowedRoles: UserRole[] = [UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Please select Teacher, Student, or Parent.' },
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

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please login or use a different email.' },
        { status: 409 }
      )
    }

    // Verify school exists if provided
    let school = null
    if (schoolId) {
      school = await prisma.school.findUnique({
        where: { id: schoolId },
      })
      if (!school) {
        return NextResponse.json(
          { error: 'Invalid school selected' },
          { status: 400 }
        )
      }
      if (!school.isActive) {
        return NextResponse.json(
          { error: 'This school is not currently accepting registrations' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate email verification token
    const verificationToken = generateToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user with PENDING_VERIFICATION status
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        status: UserStatus.PENDING_VERIFICATION,
        languagePreference: languagePreference || Language.ENGLISH,
        phone: phone?.replace(/[^\d+\-\s()]/g, '').slice(0, 20),
        schoolId,
        emailVerifyToken: verificationToken,
        emailVerifyExpires: verificationExpires,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    })

    // Send verification email
    const baseUrl = getBaseUrl()
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your email - AI School Platform',
      html: emailVerificationTemplate({
        userName: sanitizedName,
        verificationUrl,
        expiresIn: '24 hours',
      }),
    })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail registration, but log the error
    }

    return NextResponse.json(
      {
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        requiresVerification: true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    )
  }
}
