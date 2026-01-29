import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { UserStatus } from '@prisma/client'
import { sendEmail, getBaseUrl } from '@/lib/email/email-service'
import { teacherApprovedTemplate, teacherRejectedTemplate } from '@/lib/email/templates'

// Approve a teacher
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { teacherId, action, rejectionReason } = await request.json()

    if (!teacherId || !action) {
      return NextResponse.json(
        { error: 'Teacher ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject".' },
        { status: 400 }
      )
    }

    // Find the teacher
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { school: true },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'User is not a teacher' }, { status: 400 })
    }

    // Verify admin belongs to same school
    if (teacher.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'You can only manage teachers in your school' },
        { status: 403 }
      )
    }

    if (teacher.status !== UserStatus.PENDING_APPROVAL) {
      return NextResponse.json(
        { error: 'Teacher is not pending approval' },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const loginUrl = `${baseUrl}/login`

    if (action === 'approve') {
      // Approve the teacher
      await prisma.user.update({
        where: { id: teacherId },
        data: {
          status: UserStatus.ACTIVE,
          approvedAt: new Date(),
          approvedBy: session.user.id,
        },
      })

      // Send approval email
      await sendEmail({
        to: teacher.email,
        subject: 'Your Account Has Been Approved - AI School Platform',
        html: teacherApprovedTemplate({
          userName: teacher.name,
          loginUrl,
          schoolName: teacher.school?.name,
        }),
      })

      return NextResponse.json({
        message: 'Teacher approved successfully',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          status: 'ACTIVE',
        },
      })
    } else {
      // Reject the teacher
      await prisma.user.update({
        where: { id: teacherId },
        data: {
          status: UserStatus.REJECTED,
          rejectionReason: rejectionReason || 'Registration not approved by administrator',
        },
      })

      // Send rejection email
      await sendEmail({
        to: teacher.email,
        subject: 'Registration Update - AI School Platform',
        html: teacherRejectedTemplate({
          userName: teacher.name,
          reason: rejectionReason,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@thestai.com',
        }),
      })

      return NextResponse.json({
        message: 'Teacher registration rejected',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          status: 'REJECTED',
        },
      })
    }
  } catch (error) {
    console.error('Teacher approval error:', error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
