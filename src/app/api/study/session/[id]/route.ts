import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/study/session/[id]
 * Get a specific study session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'ai_study_companion_24x7')
    if (featureError) return featureError
  }

  const { id } = await params

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const studySession = await prisma.studySession.findUnique({
      where: { id },
    })

    if (!studySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (studySession.studentId !== student.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ session: studySession })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/study/session/[id]
 * Update a study session
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const existingSession = await prisma.studySession.findUnique({
      where: { id },
    })

    if (!existingSession || existingSession.studentId !== student.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { messages, conceptsCovered, weakAreasFound, topic } = body

    const updatedSession = await prisma.studySession.update({
      where: { id },
      data: {
        ...(messages && { messages: messages as unknown as Record<string, unknown> }),
        ...(conceptsCovered && { conceptsCovered }),
        ...(weakAreasFound && { weakAreasFound }),
        ...(topic && { topic }),
      },
    })

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
