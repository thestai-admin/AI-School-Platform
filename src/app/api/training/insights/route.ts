import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

/**
 * GET /api/training/insights
 * Get teacher performance insights
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'performance_insights')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId') || session.user.id
  const period = searchParams.get('period') // e.g., "2024-01" or "2024-Q1"

  try {
    // Get performance snapshots
    const snapshots = await prisma.teacherPerformanceSnapshot.findMany({
      where: {
        teacherId,
        ...(period && { period }),
      },
      orderBy: { createdAt: 'desc' },
      take: 12, // Last 12 periods
    })

    // Get current metrics
    const currentMetrics = await calculateTeacherMetrics(teacherId)

    return NextResponse.json({
      snapshots,
      currentMetrics,
    })
  } catch (error) {
    console.error('Error fetching insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}

/**
 * Calculate teacher metrics from database
 */
async function calculateTeacherMetrics(teacherId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get counts for various activities
  const [
    lessonsCount,
    worksheetsCount,
    homeworkCount,
    trainingProgress,
    communityPosts,
  ] = await Promise.all([
    prisma.lesson.count({
      where: {
        teacherId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.worksheet.count({
      where: {
        createdById: teacherId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.homework.count({
      where: {
        teacherId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.teacherTrainingProgress.count({
      where: {
        teacherId,
        status: 'COMPLETED',
      },
    }),
    prisma.communityPost.count({
      where: {
        authorId: teacherId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ])

  // Get student outcome metrics
  const homeworkSubmissions = await prisma.homeworkSubmission.findMany({
    where: {
      homework: { teacherId },
      gradedAt: { gte: thirtyDaysAgo },
    },
    select: {
      totalScore: true,
      percentage: true,
    },
  })

  const avgStudentScore =
    homeworkSubmissions.length > 0
      ? homeworkSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) /
        homeworkSubmissions.length
      : 0

  return {
    lessonsCreated: lessonsCount,
    worksheetsGenerated: worksheetsCount,
    homeworkAssigned: homeworkCount,
    avgStudentScore: Math.round(avgStudentScore),
    trainingModulesCompleted: trainingProgress,
    communityPosts,
    period: 'Last 30 days',
  }
}
