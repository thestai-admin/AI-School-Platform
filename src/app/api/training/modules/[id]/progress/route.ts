import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { TrainingProgressStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/training/modules/[id]/progress
 * Get user's progress for a specific module
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'teacher_training_basic')
    if (featureError) return featureError
  }

  const { id: moduleId } = await params

  try {
    const progress = await prisma.teacherTrainingProgress.findUnique({
      where: {
        teacherId_moduleId: {
          teacherId: session.user.id,
          moduleId,
        },
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            duration: true,
            content: true,
          },
        },
      },
    })

    if (!progress) {
      return NextResponse.json({
        progress: null,
        message: 'Not enrolled in this module',
      })
    }

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/training/modules/[id]/progress
 * Start or update progress for a module
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'teacher_training_basic')
    if (featureError) return featureError
  }

  const { id: moduleId } = await params

  try {
    const body = await request.json()
    const { progress, quizScores, timeSpentMins, action } = body

    // Verify module exists and is published
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        status: true,
        prerequisites: true,
        content: true,
      },
    })

    if (!module || module.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Module not found or not available' },
        { status: 404 }
      )
    }

    // Check prerequisites are completed
    if (module.prerequisites.length > 0) {
      const completedPrereqs = await prisma.teacherTrainingProgress.count({
        where: {
          teacherId: session.user.id,
          moduleId: { in: module.prerequisites },
          status: 'COMPLETED',
        },
      })

      if (completedPrereqs < module.prerequisites.length) {
        return NextResponse.json(
          { error: 'Please complete prerequisite modules first' },
          { status: 400 }
        )
      }
    }

    // Get existing progress
    const existingProgress = await prisma.teacherTrainingProgress.findUnique({
      where: {
        teacherId_moduleId: {
          teacherId: session.user.id,
          moduleId,
        },
      },
    })

    // Determine new status based on progress
    let newStatus: TrainingProgressStatus = 'IN_PROGRESS'
    if (progress === 100 || action === 'complete') {
      newStatus = 'COMPLETED'
    } else if (progress === 0 && !existingProgress) {
      newStatus = 'NOT_STARTED'
    }

    // Merge quiz scores if provided
    let mergedQuizScores = existingProgress?.quizScores || {}
    if (quizScores) {
      mergedQuizScores = {
        ...(mergedQuizScores as Record<string, number>),
        ...quizScores,
      }
    }

    const updatedProgress = await prisma.teacherTrainingProgress.upsert({
      where: {
        teacherId_moduleId: {
          teacherId: session.user.id,
          moduleId,
        },
      },
      create: {
        teacherId: session.user.id,
        moduleId,
        progress: progress ?? 0,
        status: newStatus,
        startedAt: new Date(),
        quizScores: mergedQuizScores,
        timeSpentMins: timeSpentMins ?? 0,
        lastAccessedAt: new Date(),
      },
      update: {
        ...(progress !== undefined && { progress }),
        status: newStatus,
        ...(newStatus === 'COMPLETED' && !existingProgress?.completedAt && {
          completedAt: new Date(),
        }),
        quizScores: mergedQuizScores,
        ...(timeSpentMins && {
          timeSpentMins: { increment: timeSpentMins },
        }),
        lastAccessedAt: new Date(),
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Check if user earned a new certification
    let certification = null
    if (newStatus === 'COMPLETED') {
      certification = await checkAndAwardCertification(session.user.id)
    }

    return NextResponse.json({
      progress: updatedProgress,
      certification,
      message:
        newStatus === 'COMPLETED'
          ? 'Congratulations! Module completed!'
          : 'Progress updated',
    })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    )
  }
}

/**
 * Check if user has earned a new certification level
 */
async function checkAndAwardCertification(teacherId: string) {
  // Count completed modules
  const completedCount = await prisma.teacherTrainingProgress.count({
    where: {
      teacherId,
      status: 'COMPLETED',
    },
  })

  // Get current highest certification
  const currentCert = await prisma.teacherCertification.findFirst({
    where: { teacherId },
    orderBy: { earnedAt: 'desc' },
  })

  // Certification thresholds
  const certThresholds = {
    BRONZE: 3,
    SILVER: 7,
    GOLD: 15,
    PLATINUM: 25,
  } as const

  type CertLevel = keyof typeof certThresholds

  // Determine new certification level
  let newLevel: CertLevel | null = null
  const levels: CertLevel[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE']

  for (const level of levels) {
    if (completedCount >= certThresholds[level]) {
      newLevel = level
      break
    }
  }

  if (!newLevel) return null

  // Check if this is a new or higher certification
  const levelOrder = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 }
  const currentLevelOrder = currentCert ? levelOrder[currentCert.level] : 0

  if (levelOrder[newLevel] > currentLevelOrder) {
    // Award new certification
    const certification = await prisma.teacherCertification.create({
      data: {
        teacherId,
        level: newLevel,
        metadata: {
          modulesCompleted: completedCount,
          awardedFor: 'Training completion milestone',
        },
      },
    })

    return {
      ...certification,
      isNew: true,
      message: `Congratulations! You've earned the ${newLevel} certification!`,
    }
  }

  return null
}
