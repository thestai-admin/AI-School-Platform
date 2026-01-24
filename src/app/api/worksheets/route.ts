import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Language, Difficulty } from '@prisma/client'

// GET /api/worksheets - List worksheets for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const difficulty = searchParams.get('difficulty')
    const limit = searchParams.get('limit')

    // Teachers see worksheets they created
    if (session.user.role === 'TEACHER') {
      const worksheets = await prisma.worksheet.findMany({
        where: {
          createdById: session.user.id,
          ...(subjectId && { subjectId }),
          ...(difficulty && { difficulty: difficulty as Difficulty }),
        },
        include: {
          subject: true,
        },
        orderBy: { createdAt: 'desc' },
        ...(limit && { take: parseInt(limit) }),
      })

      return NextResponse.json({ worksheets })
    }

    // Students see worksheets assigned to their class
    if (session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
      })

      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
      }

      const worksheets = await prisma.worksheet.findMany({
        where: {
          classId: student.classId,
          ...(subjectId && { subjectId }),
          ...(difficulty && { difficulty: difficulty as Difficulty }),
        },
        include: {
          subject: true,
          createdBy: { select: { name: true } },
          responses: {
            where: { studentId: student.id },
            select: {
              id: true,
              score: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...(limit && { take: parseInt(limit) }),
      })

      // Add completion status
      const worksheetsWithStatus = worksheets.map(worksheet => ({
        ...worksheet,
        response: worksheet.responses[0] || null,
        isCompleted: worksheet.responses.length > 0,
      }))

      return NextResponse.json({ worksheets: worksheetsWithStatus })
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  } catch (error) {
    console.error('Error fetching worksheets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch worksheets' },
      { status: 500 }
    )
  }
}

// POST /api/worksheets - Save a new worksheet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, questions, difficulty, language, subjectId, classId } = body

    // Validate required fields
    if (!title || !questions || !subjectId) {
      return NextResponse.json(
        { error: 'Title, questions, and subjectId are required' },
        { status: 400 }
      )
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    const worksheet = await prisma.worksheet.create({
      data: {
        title,
        questions,
        difficulty: difficulty as Difficulty || 'MEDIUM',
        language: language as Language || 'ENGLISH',
        createdById: session.user.id,
        subjectId,
        classId: classId || null,
      },
      include: {
        subject: true,
      },
    })

    return NextResponse.json({ worksheet }, { status: 201 })
  } catch (error) {
    console.error('Error creating worksheet:', error)
    return NextResponse.json(
      { error: 'Failed to create worksheet' },
      { status: 500 }
    )
  }
}
