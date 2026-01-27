import { prisma } from '@/lib/db/prisma'
import { ProductTier } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Feature definitions by tier
 * Each tier includes all features from lower tiers
 */
export const TIER_FEATURES: Record<ProductTier, string[]> = {
  STARTER: [
    'basic_lessons',
    'basic_worksheets',
    'student_chat_limited', // 10 messages/day
  ],
  AFFORDABLE: [
    // All STARTER features plus:
    'ai_lesson_planning',
    'ai_worksheet_generation',
    'ai_homework_grading',
    'student_chatbot', // Unlimited chat
    'teacher_training_basic',
    'community_read',
    'basic_analytics',
    'bhashini_classroom',
    'diagrams',
  ],
  ELITE: [
    // All AFFORDABLE features plus:
    'ai_study_companion_24x7',
    'competitive_exam_prep',
    'personalized_learning_paths',
    'advanced_analytics',
    'practice_question_generation',
    'teacher_training_advanced',
    'community_full', // Post, comment, upvote
    'performance_insights',
    'ai_teaching_tips',
    'mock_tests',
    'offline_support',
    'priority_support',
  ],
  ENTERPRISE: [
    // All ELITE features plus:
    'custom_integrations',
    'white_label',
    'dedicated_support',
    'sla_guarantee',
    'custom_ai_models',
    'bulk_import_export',
    'api_access',
    'multi_school_management',
  ],
}

/**
 * Get all features available for a tier (including inherited features)
 */
export function getFeaturesForTier(tier: ProductTier): string[] {
  const tierOrder: ProductTier[] = ['STARTER', 'AFFORDABLE', 'ELITE', 'ENTERPRISE']
  const tierIndex = tierOrder.indexOf(tier)

  const features: string[] = []
  for (let i = 0; i <= tierIndex; i++) {
    features.push(...TIER_FEATURES[tierOrder[i]])
  }

  return [...new Set(features)] // Remove duplicates
}

/**
 * Check if a school has access to a specific feature
 */
export async function checkFeatureAccess(
  schoolId: string,
  feature: string
): Promise<{ hasAccess: boolean; tier: ProductTier | null; reason?: string }> {
  try {
    const subscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
    })

    if (!subscription) {
      return {
        hasAccess: false,
        tier: null,
        reason: 'No active subscription found',
      }
    }

    if (!subscription.isActive) {
      return {
        hasAccess: false,
        tier: subscription.tier,
        reason: 'Subscription is not active',
      }
    }

    if (subscription.endDate && subscription.endDate < new Date()) {
      return {
        hasAccess: false,
        tier: subscription.tier,
        reason: 'Subscription has expired',
      }
    }

    // Check for feature overrides in subscription
    const featureOverrides = subscription.features as Record<string, boolean> | null
    if (featureOverrides && feature in featureOverrides) {
      return {
        hasAccess: featureOverrides[feature],
        tier: subscription.tier,
        reason: featureOverrides[feature] ? undefined : 'Feature disabled by override',
      }
    }

    // Check tier-based access
    const tierFeatures = getFeaturesForTier(subscription.tier)
    const hasAccess = tierFeatures.includes(feature)

    return {
      hasAccess,
      tier: subscription.tier,
      reason: hasAccess ? undefined : `Feature '${feature}' not available in ${subscription.tier} tier`,
    }
  } catch (error) {
    console.error('Error checking feature access:', error)
    return {
      hasAccess: false,
      tier: null,
      reason: 'Error checking feature access',
    }
  }
}

/**
 * Get school subscription details
 */
export async function getSchoolSubscription(schoolId: string) {
  return prisma.schoolSubscription.findUnique({
    where: { schoolId },
    include: {
      school: {
        select: { name: true, slug: true },
      },
    },
  })
}

/**
 * Track feature usage for a school
 */
export async function trackFeatureUsage(schoolId: string, feature: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    await prisma.featureUsage.upsert({
      where: {
        schoolId_feature_usageDate: {
          schoolId,
          feature,
          usageDate: today,
        },
      },
      create: {
        schoolId,
        feature,
        usageDate: today,
        usageCount: 1,
      },
      update: {
        usageCount: { increment: 1 },
      },
    })
  } catch (error) {
    // Log but don't fail the request for usage tracking errors
    console.error('Error tracking feature usage:', error)
  }
}

/**
 * Get feature usage statistics for a school
 */
export async function getFeatureUsageStats(
  schoolId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: { schoolId: string; usageDate?: { gte?: Date; lte?: Date } } = { schoolId }

  if (startDate || endDate) {
    where.usageDate = {}
    if (startDate) where.usageDate.gte = startDate
    if (endDate) where.usageDate.lte = endDate
  }

  const usage = await prisma.featureUsage.groupBy({
    by: ['feature'],
    where,
    _sum: { usageCount: true },
    orderBy: { _sum: { usageCount: 'desc' } },
  })

  return usage.map((u) => ({
    feature: u.feature,
    totalUsage: u._sum.usageCount ?? 0,
  }))
}

/**
 * Higher-order function to wrap API routes with feature gating
 */
export function withFeatureGate(feature: string) {
  return function <T extends (...args: unknown[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (request: NextRequest, ...args: unknown[]) => {
      const session = await getServerSession(authOptions)

      if (!session?.user?.schoolId) {
        return NextResponse.json(
          { error: 'Unauthorized - No school context' },
          { status: 401 }
        )
      }

      const access = await checkFeatureAccess(session.user.schoolId, feature)

      if (!access.hasAccess) {
        return NextResponse.json(
          {
            error: 'Feature not available',
            reason: access.reason,
            tier: access.tier,
            requiredFeature: feature,
          },
          { status: 403 }
        )
      }

      // Track feature usage
      await trackFeatureUsage(session.user.schoolId, feature)

      // Call the original handler
      return handler(request, ...args)
    }) as T
  }
}

/**
 * Helper to check feature access from API routes
 */
export async function requireFeature(
  schoolId: string,
  feature: string
): Promise<NextResponse | null> {
  const access = await checkFeatureAccess(schoolId, feature)

  if (!access.hasAccess) {
    return NextResponse.json(
      {
        error: 'Feature not available',
        reason: access.reason,
        tier: access.tier,
        requiredFeature: feature,
      },
      { status: 403 }
    )
  }

  // Track usage
  await trackFeatureUsage(schoolId, feature)

  return null // No error, proceed with request
}

/**
 * Feature categories for UI display
 */
export const FEATURE_CATEGORIES = {
  teaching: {
    name: 'Teaching Tools',
    features: [
      { id: 'ai_lesson_planning', name: 'AI Lesson Planning', description: 'Generate lesson plans with AI' },
      { id: 'ai_worksheet_generation', name: 'AI Worksheet Generation', description: 'Create worksheets automatically' },
      { id: 'ai_homework_grading', name: 'AI Homework Grading', description: 'Automated homework feedback' },
      { id: 'diagrams', name: 'Visual Diagrams', description: 'Create flowcharts and concept maps' },
    ],
  },
  student: {
    name: 'Student Features',
    features: [
      { id: 'student_chatbot', name: 'AI Chatbot', description: 'Ask doubts anytime' },
      { id: 'ai_study_companion_24x7', name: '24/7 Study Companion', description: 'Advanced AI tutoring' },
      { id: 'personalized_learning_paths', name: 'Learning Paths', description: 'Personalized study plans' },
      { id: 'competitive_exam_prep', name: 'Competitive Exam Prep', description: 'JEE/NEET preparation' },
      { id: 'practice_question_generation', name: 'Practice Questions', description: 'AI-generated practice' },
      { id: 'mock_tests', name: 'Mock Tests', description: 'Timed practice tests' },
    ],
  },
  training: {
    name: 'Teacher Training',
    features: [
      { id: 'teacher_training_basic', name: 'Basic Training', description: 'Core teaching modules' },
      { id: 'teacher_training_advanced', name: 'Advanced Training', description: 'Specialized courses' },
      { id: 'ai_teaching_tips', name: 'AI Teaching Tips', description: 'Personalized teaching advice' },
      { id: 'performance_insights', name: 'Performance Insights', description: 'AI-powered analytics' },
    ],
  },
  community: {
    name: 'Community',
    features: [
      { id: 'community_read', name: 'View Community', description: 'Browse posts and discussions' },
      { id: 'community_full', name: 'Full Community Access', description: 'Post, comment, and vote' },
    ],
  },
  analytics: {
    name: 'Analytics',
    features: [
      { id: 'basic_analytics', name: 'Basic Analytics', description: 'Student progress tracking' },
      { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Detailed insights and trends' },
    ],
  },
  infrastructure: {
    name: 'Infrastructure',
    features: [
      { id: 'bhashini_classroom', name: 'Live Classroom', description: 'Multi-language live classes' },
      { id: 'offline_support', name: 'Offline Support', description: 'Study without internet' },
      { id: 'priority_support', name: 'Priority Support', description: 'Faster response times' },
    ],
  },
}

/**
 * Get features available in a tier with metadata
 */
export function getTierFeaturesWithMetadata(tier: ProductTier) {
  const availableFeatures = getFeaturesForTier(tier)
  const result: {
    category: string
    categoryName: string
    features: Array<{
      id: string
      name: string
      description: string
      available: boolean
    }>
  }[] = []

  for (const [category, data] of Object.entries(FEATURE_CATEGORIES)) {
    result.push({
      category,
      categoryName: data.name,
      features: data.features.map((f) => ({
        ...f,
        available: availableFeatures.includes(f.id),
      })),
    })
  }

  return result
}
