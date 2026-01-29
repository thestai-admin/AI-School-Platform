import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/email-service'
import { passwordChangedTemplate } from '@/lib/email/templates'

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
    return { valid: false, message: 'Password must contain at least one special character' }
  }
  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const clientIp = getClientIp(request)
    const rateLimit = rateLimiters.auth(clientIp)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime)
    }

    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Find user with this reset token
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(password)

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed - AI School Platform',
      html: passwordChangedTemplate({
        userName: user.name,
        changedAt: new Date().toLocaleString(),
        ipAddress: clientIp !== 'unknown' ? clientIp : undefined,
      }),
    })

    return NextResponse.json({
      message: 'Password reset successful. You can now login with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}

// Validate reset token (for UI to check before showing form)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is required' })
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: { id: true, passwordResetExpires: true },
    })

    if (!user) {
      return NextResponse.json({ valid: false, error: 'Invalid token' })
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      return NextResponse.json({ valid: false, error: 'Token expired' })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Validate reset token error:', error)
    return NextResponse.json({ valid: false, error: 'Validation failed' })
  }
}
