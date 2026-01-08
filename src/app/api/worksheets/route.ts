import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Language, Difficulty } from '@prisma/client'

// GET /api/worksheets - List worksheets for authenticated teacher
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
