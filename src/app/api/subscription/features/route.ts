import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { TIER_FEATURES, checkFeatureAccess } from '@/lib/features/feature-gate'

/**
 * GET /api/subscription/features
 * Get available features for current subscription
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
    })

    const tier = (subscription?.tier || 'AFFORDABLE') as keyof typeof TIER_FEATURES
    const enabledFeatures = TIER_FEATURES[tier] || TIER_FEATURES.AFFORDABLE

    // All possible features with their status
    const allFeatures = [
      { id: 'ai_lesson_planning', name: 'AI Lesson Planning', description: 'Generate AI-powered lesson plans' },
      { id: 'ai_worksheet_generation', name: 'AI Worksheet Generation', description: 'Create worksheets with AI' },
      { id: 'ai_homework_grading', name: 'AI Homework Grading', description: 'Automated homework grading' },
      { id: 'student_chatbot', name: 'Student AI Chatbot', description: 'Basic AI chat for students' },
      { id: 'teacher_training_basic', name: 'Teacher Training (Basic)', description: 'Basic training modules' },
      { id: 'community_read', name: 'Community (Read)', description: 'View community posts' },
      { id: 'ai_study_companion_24x7', name: '24/7 AI Study Companion', description: 'Round-the-clock AI tutoring' },
      { id: 'competitive_exam_prep', name: 'Competitive Exam Prep', description: 'JEE, NEET, Olympiad preparation' },
      { id: 'personalized_learning_paths', name: 'Personalized Learning Paths', description: 'AI-generated study plans' },
      { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Detailed performance analytics' },
      { id: 'practice_question_generation', name: 'Practice Question Generation', description: 'AI-generated practice questions' },
      { id: 'teacher_training_advanced', name: 'Teacher Training (Advanced)', description: 'Advanced training & certifications' },
      { id: 'community_full', name: 'Community (Full Access)', description: 'Post, comment, and interact' },
      { id: 'performance_insights', name: 'Performance Insights', description: 'AI-powered teaching insights' },
    ]

    const featuresWithStatus = allFeatures.map((feature) => ({
      ...feature,
      enabled: enabledFeatures.includes(feature.id),
      tier: getTierForFeature(feature.id),
    }))

    return NextResponse.json({
      currentTier: tier,
      features: featuresWithStatus,
      enabledCount: enabledFeatures.length,
      totalCount: allFeatures.length,
    })
  } catch (error) {
    console.error('Error fetching features:', error)
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    )
  }
}

function getTierForFeature(featureId: string): string {
  // Basic features available in affordable tier
  const affordableFeatures = [
    'ai_lesson_planning', 'ai_worksheet_generation', 'ai_homework_grading',
    'student_chatbot', 'teacher_training_basic', 'community_read'
  ]

  if (affordableFeatures.includes(featureId)) {
    return 'AFFORDABLE'
  }
  return 'ELITE'
}
