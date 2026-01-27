import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

/**
 * GET /api/subscription
 * Get current school subscription
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const subscription = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    })

    // Calculate usage stats
    const studentsCount = await prisma.student.count({
      where: { user: { schoolId } },
    })

    const teachersCount = await prisma.user.count({
      where: { schoolId, role: 'TEACHER' },
    })

    return NextResponse.json({
      subscription: subscription || {
        tier: 'AFFORDABLE',
        features: {},
        maxStudents: 500,
        maxTeachers: 50,
      },
      school: {
        ...school,
        studentsCount,
        teachersCount,
      },
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/subscription
 * Update school subscription (admin only)
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tier, maxStudents, maxTeachers, features, endDate } = body

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Find existing subscription or create new
    const existingSubscription = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        endDate: { gte: new Date() },
      },
    })

    let subscription
    if (existingSubscription) {
      subscription = await prisma.schoolSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          ...(tier && { tier }),
          ...(maxStudents !== undefined && { maxStudents }),
          ...(maxTeachers !== undefined && { maxTeachers }),
          ...(features && { features }),
          ...(endDate && { endDate: new Date(endDate) }),
        },
      })
    } else {
      subscription = await prisma.schoolSubscription.create({
        data: {
          schoolId,
          tier: tier || 'AFFORDABLE',
          startDate: new Date(),
          endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
          maxStudents: maxStudents || 500,
          maxTeachers: maxTeachers || 50,
          features: features || {},
        },
      })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}
