import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateToken } from '@/lib/auth'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { sendEmail, getBaseUrl } from '@/lib/email/email-service'
import { passwordResetTemplate } from '@/lib/email/templates'

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

    // Find user - always return success to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // Generic success message
    const successMessage = 'If an account exists with this email, a password reset link has been sent.'

    if (!user) {
      return NextResponse.json({ message: successMessage })
    }

    // Check if user has a password (OAuth-only users can't reset password)
    if (!user.password) {
      return NextResponse.json({ message: successMessage })
    }

    // Generate reset token
    const resetToken = generateToken()
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    })

    // Send reset email
    const baseUrl = getBaseUrl()
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    await sendEmail({
      to: normalizedEmail,
      subject: 'Reset Your Password - AI School Platform',
      html: passwordResetTemplate({
        userName: user.name,
        resetUrl,
        expiresIn: '1 hour',
      }),
    })

    return NextResponse.json({ message: successMessage })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}
