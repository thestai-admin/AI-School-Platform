import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Language, Difficulty, UserRole } from '@prisma/client'

// GET /api/homework - List homework based on user role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const subjectId = searchParams.get('subjectId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    const userRole = session.user.role as UserRole

    // Teachers see homework they created
    if (userRole === 'TEACHER') {
      const homework = await prisma.homework.findMany({
        where: {
          teacherId: session.user.id,
          ...(classId && { classId }),
          ...(subjectId && { subjectId }),
        },
        include: {
          class: true,
          subject: true,
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { dueDate: 'desc' },
        ...(limit && { take: parseInt(limit) }),
      })

      // Calculate submission stats for each homework
      const homeworkWithStats = await Promise.all(
        homework.map(async (hw) => {
          const totalStudents = await prisma.student.count({
            where: { classId: hw.classId },
          })
          const submittedCount = await prisma.homeworkSubmission.count({
            where: { homeworkId: hw.id, status: { in: ['SUBMITTED', 'GRADED'] } },
          })
          const gradedCount = await prisma.homeworkSubmission.count({
            where: { homeworkId: hw.id, status: 'GRADED' },
          })

          return {
            ...hw,
            stats: {
              totalStudents,
              submittedCount,
              gradedCount,
              pendingCount: totalStudents - submittedCount,
            },
          }
        })
      )

      return NextResponse.json({ homework: homeworkWithStats })
    }

    // Students see homework assigned to their class
    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
      })

      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
      }

      const homework = await prisma.homework.findMany({
        where: {
          classId: student.classId,
          ...(subjectId && { subjectId }),
        },
        include: {
          subject: true,
          teacher: { select: { name: true } },
          submissions: {
            where: { studentId: student.id },
            select: {
              id: true,
              status: true,
              totalScore: true,
              percentage: true,
              submittedAt: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      })

      // Categorize homework
      const now = new Date()
      const homeworkWithStatus = homework.map((hw) => {
        const submission = hw.submissions[0]
        let displayStatus = 'pending'

        if (submission) {
          displayStatus = submission.status.toLowerCase()
        } else if (new Date(hw.dueDate) < now) {
          displayStatus = 'overdue'
        }

        return {
          ...hw,
          submission: submission || null,
          displayStatus,
          isOverdue: new Date(hw.dueDate) < now && !submission,
        }
      })

      // Filter by status if provided
      let filtered = homeworkWithStatus
      if (status === 'pending') {
        filtered = homeworkWithStatus.filter(h => h.displayStatus === 'pending' || h.displayStatus === 'overdue')
      } else if (status === 'submitted') {
        filtered = homeworkWithStatus.filter(h => h.displayStatus === 'submitted')
      } else if (status === 'graded') {
        filtered = homeworkWithStatus.filter(h => h.displayStatus === 'graded')
      }

      return NextResponse.json({ homework: filtered })
    }

    // Parents see homework for their children
    if (userRole === 'PARENT') {
      const children = await prisma.student.findMany({
        where: { parentId: session.user.id },
        include: {
          user: { select: { name: true } },
          class: true,
        },
      })

      const childrenHomework = await Promise.all(
        children.map(async (child) => {
          const homework = await prisma.homework.findMany({
            where: { classId: child.classId },
            include: {
              subject: true,
              submissions: {
                where: { studentId: child.id },
                select: {
                  status: true,
                  totalScore: true,
                  percentage: true,
                  submittedAt: true,
                },
              },
            },
            orderBy: { dueDate: 'desc' },
            take: 10,
          })

          return {
            child: {
              id: child.id,
              name: child.user.name,
              class: child.class.name,
            },
            homework: homework.map((hw) => ({
              ...hw,
              submission: hw.submissions[0] || null,
            })),
          }
        })
      )

      return NextResponse.json({ childrenHomework })
    }

    // Admins see all homework in their school
    if (userRole === 'ADMIN') {
      const homework = await prisma.homework.findMany({
        where: {
          class: { schoolId: session.user.schoolId! },
          ...(classId && { classId }),
          ...(subjectId && { subjectId }),
        },
        include: {
          class: true,
          subject: true,
          teacher: { select: { name: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...(limit && { take: parseInt(limit) }),
      })

      return NextResponse.json({ homework })
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 403 })
  } catch (error) {
    console.error('Error fetching homework:', error)
    return NextResponse.json(
      { error: 'Failed to fetch homework' },
      { status: 500 }
    )
  }
}

// POST /api/homework - Create new homework (Teacher only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only teachers can create homework' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      instructions,
      questions,
      totalMarks,
      difficulty,
      language,
      dueDate,
      classId,
      subjectId,
      worksheetId,
    } = body

    // Validate required fields
    if (!title || !questions || !dueDate || !classId || !subjectId) {
      return NextResponse.json(
        { error: 'Title, questions, dueDate, classId, and subjectId are required' },
        { status: 400 }
      )
    }

    // Verify class exists and teacher has access
    const teacherClass = await prisma.teacherClass.findFirst({
      where: {
        teacherId: session.user.id,
        classId,
        subjectId,
      },
    })

    // Allow if teacher is assigned to this class/subject OR if admin
    if (!teacherClass && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You are not assigned to teach this class/subject' },
        { status: 403 }
      )
    }

    // Calculate total marks from questions if not provided
    const calculatedTotalMarks = totalMarks || questions.reduce(
      (sum: number, q: { maxMarks?: number }) => sum + (q.maxMarks || 1),
      0
    )

    // Add IDs to questions if not present
    const questionsWithIds = questions.map((q: Record<string, unknown>, idx: number) => ({
      ...q,
      id: q.id || `q${idx + 1}`,
      maxMarks: q.maxMarks || 1,
    }))

    const homework = await prisma.homework.create({
      data: {
        title,
        instructions,
        questions: questionsWithIds,
        totalMarks: calculatedTotalMarks,
        difficulty: (difficulty as Difficulty) || 'MEDIUM',
        language: (language as Language) || 'ENGLISH',
        dueDate: new Date(dueDate),
        teacherId: session.user.id,
        classId,
        subjectId,
        worksheetId: worksheetId || null,
      },
      include: {
        class: true,
        subject: true,
      },
    })

    // Create pending submissions for all students in the class
    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    })

    if (students.length > 0) {
      await prisma.homeworkSubmission.createMany({
        data: students.map((student) => ({
          studentId: student.id,
          homeworkId: homework.id,
          answers: [],
          status: 'PENDING',
        })),
      })
    }

    return NextResponse.json({ homework }, { status: 201 })
  } catch (error) {
    console.error('Error creating homework:', error)
    return NextResponse.json(
      { error: 'Failed to create homework' },
      { status: 500 }
    )
  }
}
