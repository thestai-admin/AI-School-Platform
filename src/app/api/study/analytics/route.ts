import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

/**
 * GET /api/study/analytics
 * Get study analytics for the student
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'advanced_analytics')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get daily analytics
    const dailyAnalytics = await prisma.studyAnalytics.findMany({
      where: {
        studentId: student.id,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    })

    // Calculate summary stats
    const totalStudyTime = dailyAnalytics.reduce((sum, d) => sum + d.totalStudyTime, 0)
    const totalSessions = dailyAnalytics.reduce((sum, d) => sum + d.sessionsCount, 0)
    const totalQuestions = dailyAnalytics.reduce((sum, d) => sum + d.questionsAttempted, 0)
    const totalCorrect = dailyAnalytics.reduce((sum, d) => sum + d.questionsCorrect, 0)
    const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

    // Get streak
    const currentStreak = dailyAnalytics.length > 0
      ? dailyAnalytics[dailyAnalytics.length - 1].streakDays
      : 0

    // Find peak study hour
    const hourCounts: Record<number, number> = {}
    dailyAnalytics.forEach((d) => {
      if (d.peakStudyHour !== null) {
        hourCounts[d.peakStudyHour] = (hourCounts[d.peakStudyHour] || 0) + 1
      }
    })
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    // Get topics studied
    const allTopics = dailyAnalytics.flatMap((d) => d.topicsStudied)
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }))

    // Get study sessions
    const recentSessions = await prisma.studySession.findMany({
      where: {
        studentId: student.id,
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    })

    // Get practice performance
    const practiceAttempts = await prisma.practiceAttempt.findMany({
      where: {
        studentId: student.id,
        createdAt: { gte: startDate },
      },
      include: {
        question: {
          select: { subject: true, topic: true, difficulty: true },
        },
      },
    })

    // Calculate per-subject performance
    const subjectPerformance: Record<string, { attempted: number; correct: number }> = {}
    practiceAttempts.forEach((attempt) => {
      const subject = attempt.question.subject
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { attempted: 0, correct: 0 }
      }
      subjectPerformance[subject].attempted++
      if (attempt.isCorrect) {
        subjectPerformance[subject].correct++
      }
    })

    const subjectStats = Object.entries(subjectPerformance).map(([subject, stats]) => ({
      subject,
      attempted: stats.attempted,
      correct: stats.correct,
      accuracy: Math.round((stats.correct / stats.attempted) * 100),
    }))

    return NextResponse.json({
      summary: {
        totalStudyTime,
        totalSessions,
        totalQuestions,
        totalCorrect,
        avgAccuracy,
        currentStreak,
        peakStudyHour: peakHour ? parseInt(peakHour) : null,
        daysActive: dailyAnalytics.filter((d) => d.totalStudyTime > 0).length,
      },
      dailyAnalytics,
      topTopics,
      subjectStats,
      recentSessions,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
