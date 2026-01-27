import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { trackFeatureUsage } from '@/lib/features/feature-gate'

/**
 * GET /api/subscription/usage
 * Get feature usage statistics
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  try {
    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get usage statistics
    const usageStats = await prisma.featureUsage.findMany({
      where: {
        schoolId,
        usageDate: { gte: startDate },
      },
      orderBy: { usageDate: 'desc' },
    })

    // Aggregate by feature
    const featureAggregates: Record<string, { total: number; daily: number[] }> = {}
    usageStats.forEach((usage) => {
      if (!featureAggregates[usage.feature]) {
        featureAggregates[usage.feature] = { total: 0, daily: [] }
      }
      featureAggregates[usage.feature].total += usage.usageCount
      featureAggregates[usage.feature].daily.push(usage.usageCount)
    })

    // Get daily totals
    const dailyTotals: Record<string, number> = {}
    usageStats.forEach((usage) => {
      const dateKey = usage.usageDate.toISOString().split('T')[0]
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + usage.usageCount
    })

    // Get subscription limits
    const subscription = await prisma.schoolSubscription.findFirst({
      where: {
        schoolId,
        endDate: { gte: new Date() },
      },
    })

    return NextResponse.json({
      usage: {
        byFeature: featureAggregates,
        daily: dailyTotals,
        totalRequests: usageStats.reduce((sum, u) => sum + u.usageCount, 0),
      },
      subscription: {
        tier: subscription?.tier || 'AFFORDABLE',
        maxStudents: subscription?.maxStudents || 500,
        maxTeachers: subscription?.maxTeachers || 50,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscription/usage
 * Track feature usage
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { feature } = body

    if (!feature) {
      return NextResponse.json({ error: 'Feature required' }, { status: 400 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    await trackFeatureUsage(schoolId, feature)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking usage:', error)
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    )
  }
}
