import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateToken } from '@/lib/auth'
import { UserStatus } from '@prisma/client'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { sendEmail, getBaseUrl } from '@/lib/email/email-service'
import { emailVerificationTemplate } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const clientIp = getClientIp(request)
    const rateLimit = rateLimiters.auth(clientIp)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime)
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, a verification link has been sent.',
      })
    }

    // Check if already verified
    if (user.emailVerified || user.status !== UserStatus.PENDING_VERIFICATION) {
      return NextResponse.json({
        message: 'Your email is already verified. Please login.',
        alreadyVerified: true,
      })
    }

    // Generate new verification token
    const verificationToken = generateToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verificationToken,
        emailVerifyExpires: verificationExpires,
      },
    })

    // Send verification email
    const baseUrl = getBaseUrl()
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`

    await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your email - AI School Platform',
      html: emailVerificationTemplate({
        userName: user.name,
        verificationUrl,
        expiresIn: '24 hours',
      }),
    })

    return NextResponse.json({
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    )
  }
}
