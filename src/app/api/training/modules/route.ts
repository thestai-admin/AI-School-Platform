import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { UserRole, TrainingModuleStatus, Difficulty, Language } from '@prisma/client'

/**
 * GET /api/training/modules
 * List training modules with filters
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
  const categoryId = searchParams.get('categoryId')
  const subject = searchParams.get('subject')
  const status = searchParams.get('status') as TrainingModuleStatus | null
  const difficulty = searchParams.get('difficulty') as Difficulty | null
  const search = searchParams.get('search')

  try {
    const modules = await prisma.trainingModule.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(subject && { subject }),
        ...(status && { status }),
        ...(difficulty && { difficulty }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { tags: { has: search } },
          ],
        }),
        // Only show published modules unless user is admin
        ...(session.user.role !== UserRole.ADMIN && { status: 'PUBLISHED' }),
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
        _count: {
          select: { progress: true },
        },
      },
      orderBy: [{ category: { order: 'asc' } }, { title: 'asc' }],
    })

    // Get user's progress for each module
    const progressRecords = await prisma.teacherTrainingProgress.findMany({
      where: {
        teacherId: session.user.id,
        moduleId: { in: modules.map((m) => m.id) },
      },
      select: {
        moduleId: true,
        progress: true,
        status: true,
      },
    })

    const progressMap = new Map(progressRecords.map((p) => [p.moduleId, p]))

    const modulesWithProgress = modules.map((module) => ({
      ...module,
      userProgress: progressMap.get(module.id) || null,
      enrolledCount: module._count.progress,
    }))

    return NextResponse.json({ modules: modulesWithProgress })
  } catch (error) {
    console.error('Error fetching training modules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training modules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/training/modules
 * Create a new training module (Admin only)
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
    const {
      title,
      description,
      subject,
      gradeRange,
      content,
      duration,
      difficulty = 'MEDIUM',
      language = 'ENGLISH',
      status = 'DRAFT',
      prerequisites = [],
      tags = [],
      categoryId,
    } = body

    if (!title || !content || !duration) {
      return NextResponse.json(
        { error: 'Title, content, and duration are required' },
        { status: 400 }
      )
    }

    const module = await prisma.trainingModule.create({
      data: {
        title,
        description,
        subject,
        gradeRange,
        content,
        duration,
        difficulty: difficulty as Difficulty,
        language: language as Language,
        status: status as TrainingModuleStatus,
        prerequisites,
        tags,
        categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    })

    return NextResponse.json({ module }, { status: 201 })
  } catch (error) {
    console.error('Error creating training module:', error)
    return NextResponse.json(
      { error: 'Failed to create training module' },
      { status: 500 }
    )
  }
}
