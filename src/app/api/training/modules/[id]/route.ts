import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { UserRole, TrainingModuleStatus, Difficulty, Language } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/training/modules/[id]
 * Get a specific training module with full content
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

  const { id } = await params

  try {
    const trainingModule = await prisma.trainingModule.findUnique({
      where: { id },
      include: {
        category: true,
        _count: {
          select: { progress: true },
        },
      },
    })

    if (!trainingModule) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Check if module is published or user is admin
    if (trainingModule.status !== 'PUBLISHED' && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Module not available' }, { status: 403 })
    }

    // Get user's progress for this module
    const userProgress = await prisma.teacherTrainingProgress.findUnique({
      where: {
        teacherId_moduleId: {
          teacherId: session.user.id,
          moduleId: id,
        },
      },
    })

    // Get prerequisite modules info
    let prerequisites: { id: string; title: string; completed: boolean }[] = []
    if (trainingModule.prerequisites.length > 0) {
      const prereqModules = await prisma.trainingModule.findMany({
        where: { id: { in: trainingModule.prerequisites } },
        select: { id: true, title: true },
      })

      const prereqProgress = await prisma.teacherTrainingProgress.findMany({
        where: {
          teacherId: session.user.id,
          moduleId: { in: trainingModule.prerequisites },
          status: 'COMPLETED',
        },
        select: { moduleId: true },
      })

      const completedSet = new Set(prereqProgress.map((p) => p.moduleId))

      prerequisites = prereqModules.map((m) => ({
        id: m.id,
        title: m.title,
        completed: completedSet.has(m.id),
      }))
    }

    return NextResponse.json({
      module: {
        ...trainingModule,
        enrolledCount: trainingModule._count.progress,
        userProgress,
        prerequisites,
      },
    })
  } catch (error) {
    console.error('Error fetching training module:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training module' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/training/modules/[id]
 * Update a training module (Admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const {
      title,
      description,
      subject,
      gradeRange,
      content,
      duration,
      difficulty,
      language,
      status,
      prerequisites,
      tags,
      categoryId,
    } = body

    const existingModule = await prisma.trainingModule.findUnique({
      where: { id },
    })

    if (!existingModule) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    const trainingModule = await prisma.trainingModule.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(subject !== undefined && { subject }),
        ...(gradeRange !== undefined && { gradeRange }),
        ...(content !== undefined && { content }),
        ...(duration !== undefined && { duration }),
        ...(difficulty !== undefined && { difficulty: difficulty as Difficulty }),
        ...(language !== undefined && { language: language as Language }),
        ...(status !== undefined && { status: status as TrainingModuleStatus }),
        ...(prerequisites !== undefined && { prerequisites }),
        ...(tags !== undefined && { tags }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json({ module })
  } catch (error) {
    console.error('Error updating training module:', error)
    return NextResponse.json(
      { error: 'Failed to update training module' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/training/modules/[id]
 * Delete a training module (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
  }

  const { id } = await params

  try {
    // Check if module exists
    const existingModule = await prisma.trainingModule.findUnique({
      where: { id },
      include: { _count: { select: { progress: true } } },
    })

    if (!existingModule) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Soft delete by archiving if there's progress
    if (existingModule._count.progress > 0) {
      await prisma.trainingModule.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      })
      return NextResponse.json({
        message: 'Module archived (has existing progress)',
      })
    }

    // Hard delete if no progress
    await prisma.trainingModule.delete({ where: { id } })

    return NextResponse.json({ message: 'Module deleted' })
  } catch (error) {
    console.error('Error deleting training module:', error)
    return NextResponse.json(
      { error: 'Failed to delete training module' },
      { status: 500 }
    )
  }
}
