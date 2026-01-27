import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

/**
 * GET /api/training/certifications
 * Get user's certifications
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'teacher_training_basic')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId') || session.user.id

  try {
    const certifications = await prisma.teacherCertification.findMany({
      where: { teacherId },
      orderBy: { earnedAt: 'desc' },
    })

    // Get progress statistics
    const progressStats = await prisma.teacherTrainingProgress.groupBy({
      by: ['status'],
      where: { teacherId },
      _count: { status: true },
    })

    const stats = {
      total: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
    }

    progressStats.forEach((s) => {
      stats.total += s._count.status
      switch (s.status) {
        case 'NOT_STARTED':
          stats.notStarted = s._count.status
          break
        case 'IN_PROGRESS':
          stats.inProgress = s._count.status
          break
        case 'COMPLETED':
        case 'CERTIFIED':
          stats.completed += s._count.status
          break
      }
    })

    // Get next certification level
    const certThresholds = {
      BRONZE: 3,
      SILVER: 7,
      GOLD: 15,
      PLATINUM: 25,
    }

    const levels = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const
    const currentLevel = certifications[0]?.level
    const currentLevelIndex = currentLevel ? levels.indexOf(currentLevel) : -1
    const nextLevel = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null

    const nextCertification = nextLevel
      ? {
          level: nextLevel,
          requiredModules: certThresholds[nextLevel],
          currentProgress: stats.completed,
          remaining: certThresholds[nextLevel] - stats.completed,
        }
      : null

    return NextResponse.json({
      certifications,
      stats,
      currentLevel: currentLevel || null,
      nextCertification,
    })
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certifications' },
      { status: 500 }
    )
  }
}
