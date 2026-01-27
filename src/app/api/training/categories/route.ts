import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { UserRole } from '@prisma/client'

/**
 * GET /api/training/categories
 * List all training categories with module counts
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

  try {
    const categories = await prisma.trainingCategory.findMany({
      include: {
        modules: {
          where: {
            // Only count published modules unless admin
            ...(session.user.role !== UserRole.ADMIN && { status: 'PUBLISHED' }),
          },
          select: {
            id: true,
            title: true,
            duration: true,
            difficulty: true,
          },
        },
        _count: {
          select: {
            modules: {
              where: {
                ...(session.user.role !== UserRole.ADMIN && { status: 'PUBLISHED' }),
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    // Get user's progress stats per category
    const progressStats = await prisma.teacherTrainingProgress.groupBy({
      by: ['moduleId'],
      where: {
        teacherId: session.user.id,
        status: 'COMPLETED',
      },
    })

    const completedModuleIds = new Set(progressStats.map((p) => p.moduleId))

    const categoriesWithProgress = categories.map((category) => {
      const moduleIds = category.modules.map((m) => m.id)
      const completedInCategory = moduleIds.filter((id) =>
        completedModuleIds.has(id)
      ).length

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        order: category.order,
        moduleCount: category._count.modules,
        completedCount: completedInCategory,
        totalDuration: category.modules.reduce((sum, m) => sum + m.duration, 0),
      }
    })

    return NextResponse.json({ categories: categoriesWithProgress })
  } catch (error) {
    console.error('Error fetching training categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training categories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/training/categories
 * Create a new training category (Admin only)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, icon, order } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await prisma.trainingCategory.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      )
    }

    // Get max order if not provided
    let categoryOrder = order
    if (categoryOrder === undefined) {
      const maxOrder = await prisma.trainingCategory.aggregate({
        _max: { order: true },
      })
      categoryOrder = (maxOrder._max.order ?? 0) + 1
    }

    const category = await prisma.trainingCategory.create({
      data: {
        name,
        description,
        icon,
        order: categoryOrder,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating training category:', error)
    return NextResponse.json(
      { error: 'Failed to create training category' },
      { status: 500 }
    )
  }
}
