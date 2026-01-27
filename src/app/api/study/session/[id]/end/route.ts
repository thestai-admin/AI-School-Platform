import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { generateWithAI } from '@/lib/ai/provider'
import { getSessionSummaryPrompt } from '@/lib/prompts/study-companion'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/study/session/[id]/end
 * End a study session and generate summary
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!studySession || studySession.studentId !== student.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (studySession.endedAt) {
      return NextResponse.json({ error: 'Session already ended' }, { status: 400 })
    }

    // Calculate duration
    const endedAt = new Date()
    const duration = Math.round(
      (endedAt.getTime() - studySession.startedAt.getTime()) / (1000 * 60)
    )

    // Generate AI summary
    let summary = null
    const messages = studySession.messages as Array<{ role: string; content: string }> | null

    if (messages && messages.length > 2) {
      try {
        const summaryPrompt = getSessionSummaryPrompt({
          messages,
          subject: studySession.subject,
          duration,
        })

        const aiResponse = await generateWithAI(
          'You are an educational analyst. Provide session summaries in JSON format.',
          summaryPrompt,
          { temperature: 0.5 }
        )

        // Try to parse as JSON
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            summary = JSON.parse(jsonMatch[0])
          }
        } catch {
          // If JSON parsing fails, use text summary
          summary = { rawSummary: aiResponse }
        }
      } catch (error) {
        console.error('Error generating summary:', error)
      }
    }

    // Update session
    const updatedSession = await prisma.studySession.update({
      where: { id },
      data: {
        endedAt,
        duration,
        summary: summary as Prisma.InputJsonValue,
      },
    })

    // Update daily analytics
    await updateDailyAnalytics(student.id, duration, studySession.subject)

    return NextResponse.json({
      session: updatedSession,
      summary,
    })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    )
  }
}

/**
 * Update daily study analytics
 */
async function updateDailyAnalytics(studentId: string, duration: number, subject: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    await prisma.studyAnalytics.upsert({
      where: {
        studentId_date: {
          studentId,
          date: today,
        },
      },
      create: {
        studentId,
        date: today,
        totalStudyTime: duration,
        sessionsCount: 1,
        topicsStudied: [subject],
        peakStudyHour: new Date().getHours(),
      },
      update: {
        totalStudyTime: { increment: duration },
        sessionsCount: { increment: 1 },
        topicsStudied: {
          push: subject,
        },
      },
    })
  } catch (error) {
    console.error('Error updating analytics:', error)
  }
}
