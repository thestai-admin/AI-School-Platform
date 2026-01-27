import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkFeatureAccess } from '@/lib/features/feature-gate'

/**
 * POST /api/subscription/features/check
 * Check if a specific feature is available
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { feature, features } = body

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Check single feature
    if (feature) {
      const result = await checkFeatureAccess(schoolId, feature)
      return NextResponse.json({ feature, hasAccess: result.hasAccess, tier: result.tier })
    }

    // Check multiple features
    if (features && Array.isArray(features)) {
      const results: Record<string, boolean> = {}
      for (const f of features) {
        const result = await checkFeatureAccess(schoolId, f)
        results[f] = result.hasAccess
      }
      return NextResponse.json({ features: results })
    }

    return NextResponse.json(
      { error: 'Feature or features array required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error checking feature access:', error)
    return NextResponse.json(
      { error: 'Failed to check feature access' },
      { status: 500 }
    )
  }
}
