import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'

/**
 * GET /api/training/tips
 * Get teaching tips with filters
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
  const topic = searchParams.get('topic')
  const subject = searchParams.get('subject')
  const gradeLevel = searchParams.get('gradeLevel')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const tips = await prisma.teachingTip.findMany({
      where: {
        ...(topic && { topic: { contains: topic, mode: 'insensitive' } }),
        ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
        ...(gradeLevel && { gradeLevel: { contains: gradeLevel, mode: 'insensitive' } }),
      },
      orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    })

    const total = await prisma.teachingTip.count({
      where: {
        ...(topic && { topic: { contains: topic, mode: 'insensitive' } }),
        ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
        ...(gradeLevel && { gradeLevel: { contains: gradeLevel, mode: 'insensitive' } }),
      },
    })

    return NextResponse.json({
      tips,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tips.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching teaching tips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teaching tips' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/training/tips
 * Create a manual teaching tip
 */
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { topic, subject, gradeLevel, tip, methodology, commonMistake } = body

    if (!topic || !subject || !gradeLevel || !tip) {
      return NextResponse.json(
        { error: 'Topic, subject, gradeLevel, and tip are required' },
        { status: 400 }
      )
    }

    const teachingTip = await prisma.teachingTip.create({
      data: {
        topic,
        subject,
        gradeLevel,
        tip,
        methodology,
        commonMistake,
        aiGenerated: false,
      },
    })

    return NextResponse.json({ tip: teachingTip }, { status: 201 })
  } catch (error) {
    console.error('Error creating teaching tip:', error)
    return NextResponse.json(
      { error: 'Failed to create teaching tip' },
      { status: 500 }
    )
  }
}
