import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { UserRole, UserStatus } from '@prisma/client'
import { sendEmail, getBaseUrl } from '@/lib/email/email-service'
import {
  welcomeEmailTemplate,
  teacherPendingApprovalTemplate,
  adminNewTeacherTemplate,
  adminNewStudentTemplate,
} from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=InvalidToken', request.url))
    }

    // Find user with this verification token
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
      include: {
        school: {
          include: {
            users: {
              where: { role: UserRole.ADMIN },
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=InvalidToken', request.url))
    }

    // Check if token has expired
    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
      return NextResponse.redirect(new URL('/login?error=TokenExpired', request.url))
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.redirect(new URL('/login?message=AlreadyVerified', request.url))
    }

    const baseUrl = getBaseUrl()
    const loginUrl = `${baseUrl}/login`

    // Determine new status based on role
    let newStatus: UserStatus
    if (user.role === UserRole.TEACHER) {
      // Teachers require admin approval
      newStatus = UserStatus.PENDING_APPROVAL
    } else {
      // Students and Parents are auto-approved
      newStatus = UserStatus.ACTIVE
    }

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerifyToken: null,
        emailVerifyExpires: null,
        status: newStatus,
      },
    })

    // Send appropriate email based on role and status
    if (user.role === UserRole.TEACHER) {
      // Send pending approval email to teacher
      await sendEmail({
        to: user.email,
        subject: 'Account Pending Approval - AI School Platform',
        html: teacherPendingApprovalTemplate({
          userName: user.name,
          schoolName: user.school?.name,
        }),
      })

      // Notify school admins about new teacher registration
      if (user.school?.users && user.school.users.length > 0) {
        const approvalUrl = `${baseUrl}/admin/teachers?pending=true`

        for (const admin of user.school.users) {
          await sendEmail({
            to: admin.email,
            subject: `New Teacher Registration - ${user.name}`,
            html: adminNewTeacherTemplate({
              adminName: admin.name,
              teacherName: user.name,
              teacherEmail: user.email,
              schoolName: user.school.name,
              approvalUrl,
              registeredAt: new Date().toLocaleString(),
            }),
          })
        }
      }

      return NextResponse.redirect(
        new URL('/login?message=EmailVerified&status=PendingApproval', request.url)
      )
    } else {
      // Send welcome email to students/parents
      await sendEmail({
        to: user.email,
        subject: 'Welcome to AI School Platform!',
        html: welcomeEmailTemplate({
          userName: user.name,
          role: user.role,
          loginUrl,
          schoolName: user.school?.name,
        }),
      })

      // Notify school admins about new student registration
      if (user.role === UserRole.STUDENT && user.school?.users && user.school.users.length > 0) {
        for (const admin of user.school.users) {
          await sendEmail({
            to: admin.email,
            subject: `New Student Registration - ${user.name}`,
            html: adminNewStudentTemplate({
              adminName: admin.name,
              studentName: user.name,
              studentEmail: user.email,
              schoolName: user.school.name,
              registeredAt: new Date().toLocaleString(),
            }),
          })
        }
      }

      return NextResponse.redirect(new URL('/login?message=EmailVerified', request.url))
    }
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/login?error=VerificationFailed', request.url))
  }
}
