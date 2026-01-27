import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { ExamType, Prisma } from '@prisma/client'

/**
 * GET /api/study/learning-path
 * Get user's learning paths
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'personalized_learning_paths')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const active = searchParams.get('active')

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const paths = await prisma.personalizedLearningPath.findMany({
      where: {
        studentId: student.id,
        ...(subject && { subject }),
        ...(active === 'true' && { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({ paths })
  } catch (error) {
    console.error('Error fetching learning paths:', error)
    return NextResponse.json(
      { error: 'Failed to fetch learning paths' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/study/learning-path
 * Create a new learning path
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'personalized_learning_paths')
    if (featureError) return featureError
  }

  try {
    const body = await request.json()
    const {
      subject,
      examType,
      currentLevel = 1,
      targetLevel = 10,
      targetDate,
      milestones = [],
      weakAreas = [],
      strongAreas = [],
      recommendedTime = 60,
    } = body

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Deactivate existing paths for this subject
    await prisma.personalizedLearningPath.updateMany({
      where: {
        studentId: student.id,
        subject,
        isActive: true,
      },
      data: { isActive: false },
    })

    const path = await prisma.personalizedLearningPath.create({
      data: {
        studentId: student.id,
        subject,
        examType: examType as ExamType | undefined,
        currentLevel,
        targetLevel,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        milestones: milestones as Prisma.InputJsonValue,
        weakAreas,
        strongAreas,
        recommendedTime,
        isActive: true,
      },
    })

    return NextResponse.json({ path }, { status: 201 })
  } catch (error) {
    console.error('Error creating learning path:', error)
    return NextResponse.json(
      { error: 'Failed to create learning path' },
      { status: 500 }
    )
  }
}
