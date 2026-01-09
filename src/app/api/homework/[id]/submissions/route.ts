import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/homework/[id]/submissions - Get all submissions for a homework (Teacher only)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: homeworkId } = await context.params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Verify teacher owns this homework
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: true,
        subject: true,
      },
    })

    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 })
    }

    // Teachers can only view their own homework
    if (session.user.role === 'TEACHER' && homework.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can only view homework in their school
    if (session.user.role === 'ADMIN' && homework.class.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all submissions with student details
    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        homeworkId,
        ...(status && { status: status as 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE' }),
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { submittedAt: 'desc' },
      ],
    })

    // Get class stats
    const totalStudents = await prisma.student.count({
      where: { classId: homework.classId },
    })

    const statusCounts = {
      pending: submissions.filter(s => s.status === 'PENDING').length,
      submitted: submissions.filter(s => s.status === 'SUBMITTED').length,
      graded: submissions.filter(s => s.status === 'GRADED').length,
      late: submissions.filter(s => s.isLate).length,
    }

    // Calculate average score for graded submissions
    const gradedSubmissions = submissions.filter(s => s.status === 'GRADED' && s.percentage !== null)
    const averageScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubmissions.length
      : null

    return NextResponse.json({
      homework: {
        id: homework.id,
        title: homework.title,
        dueDate: homework.dueDate,
        totalMarks: homework.totalMarks,
        class: homework.class,
        subject: homework.subject,
      },
      submissions: submissions.map(s => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student.user.name,
        rollNumber: s.student.rollNumber,
        status: s.status,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
        totalScore: s.totalScore,
        percentage: s.percentage,
        isLate: s.isLate,
        answers: s.answers,
        aiFeedback: s.aiFeedback,
        teacherReview: s.teacherReview,
      })),
      stats: {
        totalStudents,
        ...statusCounts,
        averageScore: averageScore ? Math.round(averageScore * 100) / 100 : null,
      },
    })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}

// PATCH /api/homework/[id]/submissions - Update a submission (Teacher review)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: homeworkId } = await context.params
    const body = await request.json()
    const { submissionId, teacherReview, adjustedScore } = body

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })
    }

    // Verify teacher owns this homework
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { class: { select: { schoolId: true } } },
    })

    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 })
    }

    // Teachers can only modify their own homework
    if (session.user.role === 'TEACHER' && homework.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can only modify homework in their school
    if (session.user.role === 'ADMIN' && homework.class.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update submission
    const submission = await prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        ...(teacherReview !== undefined && { teacherReview }),
        ...(adjustedScore !== undefined && {
          totalScore: adjustedScore,
          percentage: (adjustedScore / homework.totalMarks) * 100,
        }),
        status: 'GRADED',
        gradedAt: new Date(),
      },
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error updating submission:', error)
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    )
  }
}
