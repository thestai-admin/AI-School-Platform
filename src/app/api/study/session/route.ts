import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { StudySessionType, ExamType, Prisma } from '@prisma/client'

/**
 * GET /api/study/session
 * List user's study sessions
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'ai_study_companion_24x7')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const sessions = await prisma.studySession.findMany({
      where: {
        studentId: student.id,
        ...(subject && { subject }),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study/session
 * Create or update a study session
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'ai_study_companion_24x7')
    if (featureError) return featureError
  }

  try {
    const body = await request.json()
    const {
      sessionId,
      type = 'DOUBT_SOLVING',
      subject,
      topic,
      examType,
      messages = [],
      conceptsCovered = [],
      weakAreasFound = [],
      duration,
    } = body

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Create or update session
    const studySession = sessionId
      ? await prisma.studySession.update({
          where: { id: sessionId },
          data: {
            messages: messages as Prisma.InputJsonValue,
            conceptsCovered,
            weakAreasFound,
            duration,
          },
        })
      : await prisma.studySession.create({
          data: {
            type: type as StudySessionType,
            subject,
            topic,
            examType: examType as ExamType | undefined,
            messages: messages as Prisma.InputJsonValue,
            conceptsCovered,
            weakAreasFound,
            studentId: student.id,
          },
        })

    return NextResponse.json({ session: studySession }, { status: sessionId ? 200 : 201 })
  } catch (error) {
    console.error('Error saving session:', error)
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    )
  }
}
