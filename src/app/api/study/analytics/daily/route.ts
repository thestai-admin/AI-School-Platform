import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

/**
 * POST /api/study/analytics/daily
 * Record or update daily study analytics
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      studyTime,
      sessionsCount,
      questionsAttempted,
      questionsCorrect,
      topicsStudied = [],
      weeklyGoalMinutes,
    } = body

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get yesterday's analytics for streak calculation
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayAnalytics = await prisma.studyAnalytics.findUnique({
      where: {
        studentId_date: {
          studentId: student.id,
          date: yesterday,
        },
      },
    })

    // Calculate streak
    let streakDays = 1
    if (yesterdayAnalytics && yesterdayAnalytics.totalStudyTime > 0) {
      streakDays = yesterdayAnalytics.streakDays + 1
    }

    // Check if weekly goal is met
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    const weekAnalytics = await prisma.studyAnalytics.findMany({
      where: {
        studentId: student.id,
        date: { gte: weekStart },
      },
    })

    const weeklyStudyTime = weekAnalytics.reduce((sum, d) => sum + d.totalStudyTime, 0) + (studyTime || 0)
    const weeklyGoal = weeklyGoalMinutes || 300 // 5 hours default
    const weeklyGoalMet = weeklyStudyTime >= weeklyGoal

    const analytics = await prisma.studyAnalytics.upsert({
      where: {
        studentId_date: {
          studentId: student.id,
          date: today,
        },
      },
      create: {
        studentId: student.id,
        date: today,
        totalStudyTime: studyTime || 0,
        sessionsCount: sessionsCount || 0,
        questionsAttempted: questionsAttempted || 0,
        questionsCorrect: questionsCorrect || 0,
        topicsStudied,
        peakStudyHour: new Date().getHours(),
        streakDays,
        weeklyGoalMet,
        weeklyGoalMinutes: weeklyGoal,
      },
      update: {
        ...(studyTime !== undefined && {
          totalStudyTime: { increment: studyTime },
        }),
        ...(sessionsCount !== undefined && {
          sessionsCount: { increment: sessionsCount },
        }),
        ...(questionsAttempted !== undefined && {
          questionsAttempted: { increment: questionsAttempted },
        }),
        ...(questionsCorrect !== undefined && {
          questionsCorrect: { increment: questionsCorrect },
        }),
        ...(topicsStudied.length > 0 && {
          topicsStudied: { push: topicsStudied },
        }),
        peakStudyHour: new Date().getHours(),
        streakDays,
        weeklyGoalMet,
      },
    })

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error updating daily analytics:', error)
    return NextResponse.json(
      { error: 'Failed to update analytics' },
      { status: 500 }
    )
  }
}
