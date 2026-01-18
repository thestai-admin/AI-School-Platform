import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { UserRole, SessionStatus } from '@prisma/client'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

// GET - List sessions for teacher
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only teachers and admins can list sessions
  if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as SessionStatus | null
    const classId = searchParams.get('classId')

    const sessions = await prisma.classroomSession.findMany({
      where: {
        teacherId: session.user.id,
        ...(status && { status }),
        ...(classId && { classId }),
      },
      include: {
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { participants: true, transcripts: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST - Create new classroom session
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only teachers can create sessions
  if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limiting
  const clientIp = getClientIp(request)
  const rateLimit = rateLimiters.bhashiniRealtime(clientIp)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  try {
    const body = await request.json()
    const { classId, subjectId, sourceLanguage, targetLanguages } = body

    // Validate required fields
    if (!classId || !subjectId) {
      return NextResponse.json(
        { error: 'classId and subjectId are required' },
        { status: 400 }
      )
    }

    // Verify teacher is assigned to this class/subject
    const teacherClass = await prisma.teacherClass.findFirst({
      where: {
        teacherId: session.user.id,
        classId,
        subjectId,
      },
    })

    if (!teacherClass && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'You are not assigned to this class/subject' },
        { status: 403 }
      )
    }

    // Check for existing active session
    const existingSession = await prisma.classroomSession.findFirst({
      where: {
        teacherId: session.user.id,
        status: SessionStatus.ACTIVE,
      },
    })

    if (existingSession) {
      return NextResponse.json(
        { error: 'You already have an active session', existingSessionId: existingSession.id },
        { status: 409 }
      )
    }

    // Create new session
    const classroomSession = await prisma.classroomSession.create({
      data: {
        teacherId: session.user.id,
        classId,
        subjectId,
        sourceLanguage: (sourceLanguage || 'hi') as BhashiniLanguageCode,
        targetLanguages: (targetLanguages || ['en']) as BhashiniLanguageCode[],
        status: SessionStatus.ACTIVE,
      },
      include: {
        class: { select: { id: true, name: true, grade: true } },
        subject: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      session: classroomSession,
      message: 'Session created successfully',
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// PATCH - Update session (pause/resume/end)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId, action } = body

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'sessionId and action are required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const classroomSession = await prisma.classroomSession.findUnique({
      where: { id: sessionId },
    })

    if (!classroomSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (classroomSession.teacherId !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let newStatus: SessionStatus
    let endedAt: Date | null = null

    switch (action) {
      case 'pause':
        newStatus = SessionStatus.PAUSED
        break
      case 'resume':
        newStatus = SessionStatus.ACTIVE
        break
      case 'end':
        newStatus = SessionStatus.ENDED
        endedAt = new Date()
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updatedSession = await prisma.classroomSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        ...(endedAt && { endedAt }),
      },
    })

    return NextResponse.json({
      session: updatedSession,
      message: `Session ${action}d successfully`,
    })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
