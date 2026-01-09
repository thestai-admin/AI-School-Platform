import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { UserRole } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/homework/[id] - Get homework details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const homework = await prisma.homework.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        teacher: { select: { id: true, name: true } },
        submissions: {
          include: {
            student: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 })
    }

    const userRole = session.user.role as UserRole

    // Teachers can only view their own homework
    if (userRole === 'TEACHER' && homework.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can only view homework in their school
    if (userRole === 'ADMIN' && homework.class.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Students can only view homework assigned to their class
    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
      })

      if (!student || student.classId !== homework.classId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Return only the student's submission
      const submission = homework.submissions.find(s => s.studentId === student.id)

      // Hide correct answers if not graded yet
      const questionsForStudent = (homework.questions as Array<Record<string, unknown>>).map(q => {
        if (submission?.status !== 'GRADED') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { correctAnswer, ...rest } = q
          return rest
        }
        return q
      })

      return NextResponse.json({
        homework: {
          ...homework,
          questions: questionsForStudent,
          submissions: submission ? [submission] : [],
        },
      })
    }

    // Parents can view homework for their children
    if (userRole === 'PARENT') {
      const children = await prisma.student.findMany({
        where: { parentId: session.user.id },
        select: { id: true, classId: true },
      })

      const childInClass = children.find(c => c.classId === homework.classId)
      if (!childInClass) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Return only the child's submission
      const submission = homework.submissions.find(s => s.studentId === childInClass.id)
      return NextResponse.json({
        homework: {
          ...homework,
          submissions: submission ? [submission] : [],
        },
      })
    }

    // Teachers and admins get full view with all submissions
    return NextResponse.json({ homework })
  } catch (error) {
    console.error('Error fetching homework:', error)
    return NextResponse.json(
      { error: 'Failed to fetch homework' },
      { status: 500 }
    )
  }
}

// PATCH /api/homework/[id] - Update homework (Teacher only)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.homework.findUnique({
      where: { id },
      include: {
        class: { select: { schoolId: true } },
        submissions: { where: { status: { not: 'PENDING' } } }
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 })
    }

    // Teachers can only modify their own homework
    if (session.user.role === 'TEACHER' && existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can only modify homework in their school
    if (session.user.role === 'ADMIN' && existing.class.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Don't allow major changes if submissions exist
    if (existing.submissions.length > 0 && (body.questions || body.totalMarks)) {
      return NextResponse.json(
        { error: 'Cannot modify questions after submissions have been received' },
        { status: 400 }
      )
    }

    const { title, instructions, dueDate, difficulty, language } = body

    const homework = await prisma.homework.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(instructions !== undefined && { instructions }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(difficulty && { difficulty }),
        ...(language && { language }),
      },
      include: {
        class: true,
        subject: true,
      },
    })

    return NextResponse.json({ homework })
  } catch (error) {
    console.error('Error updating homework:', error)
    return NextResponse.json(
      { error: 'Failed to update homework' },
      { status: 500 }
    )
  }
}

// DELETE /api/homework/[id] - Delete homework (Teacher only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params

    // Verify ownership
    const existing = await prisma.homework.findUnique({
      where: { id },
      include: { class: { select: { schoolId: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 })
    }

    // Teachers can only delete their own homework
    if (session.user.role === 'TEACHER' && existing.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can only delete homework in their school
    if (session.user.role === 'ADMIN' && existing.class.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete homework (submissions will cascade delete)
    await prisma.homework.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting homework:', error)
    return NextResponse.json(
      { error: 'Failed to delete homework' },
      { status: 500 }
    )
  }
}
