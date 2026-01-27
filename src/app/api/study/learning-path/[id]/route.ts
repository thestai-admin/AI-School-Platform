import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/study/learning-path/[id]
 * Get a specific learning path
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'personalized_learning_paths')
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

    const path = await prisma.personalizedLearningPath.findUnique({
      where: { id },
    })

    if (!path || path.studentId !== student.id) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    return NextResponse.json({ path })
  } catch (error) {
    console.error('Error fetching learning path:', error)
    return NextResponse.json(
      { error: 'Failed to fetch learning path' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/study/learning-path/[id]
 * Update learning path progress
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

    const existingPath = await prisma.personalizedLearningPath.findUnique({
      where: { id },
    })

    if (!existingPath || existingPath.studentId !== student.id) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      currentLevel,
      milestones,
      weakAreas,
      strongAreas,
      progress,
      completeMilestone,
      isActive,
    } = body

    // Handle milestone completion
    let updatedMilestones = existingPath.milestones as Array<{
      id: string
      completed: boolean
      completedAt?: string
    }>
    if (completeMilestone) {
      updatedMilestones = updatedMilestones.map((m) =>
        m.id === completeMilestone
          ? { ...m, completed: true, completedAt: new Date().toISOString() }
          : m
      )
    } else if (milestones) {
      updatedMilestones = milestones
    }

    // Calculate progress based on completed milestones
    const totalMilestones = updatedMilestones.length
    const completedMilestones = updatedMilestones.filter((m) => m.completed).length
    const calculatedProgress =
      progress !== undefined
        ? progress
        : Math.round((completedMilestones / totalMilestones) * 100)

    const path = await prisma.personalizedLearningPath.update({
      where: { id },
      data: {
        ...(currentLevel !== undefined && { currentLevel }),
        milestones: updatedMilestones as unknown as Record<string, unknown>,
        ...(weakAreas && { weakAreas }),
        ...(strongAreas && { strongAreas }),
        progress: calculatedProgress,
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ path })
  } catch (error) {
    console.error('Error updating learning path:', error)
    return NextResponse.json(
      { error: 'Failed to update learning path' },
      { status: 500 }
    )
  }
}
