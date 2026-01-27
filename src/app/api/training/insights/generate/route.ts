import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { generateWithAI } from '@/lib/ai/provider'
import { getPerformanceInsightSystemPrompt, getPerformanceInsightUserPrompt, TeacherMetrics } from '@/lib/prompts/training'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { Prisma } from '@prisma/client'

/**
 * POST /api/training/insights/generate
 * Generate AI-powered performance insights for a teacher
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'performance_insights')
    if (featureError) return featureError
  }

  // Rate limiting
  const identifier = session.user.id || getClientIp(request)
  const limit = rateLimiters.ai(identifier)
  if (!limit.success) {
    return rateLimitResponse(limit.resetTime)
  }

  try {
    const body = await request.json()
    const { teacherId = session.user.id, period, save = true } = body

    // Calculate metrics for the teacher
    const metrics = await calculateFullMetrics(teacherId, period)

    // Generate AI insights
    const systemPrompt = getPerformanceInsightSystemPrompt()
    const userPrompt = getPerformanceInsightUserPrompt(metrics)

    const aiResponse = await generateWithAI(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Parse the AI response
    const parsedInsights = parseInsightsResponse(aiResponse)

    // Save snapshot if requested
    let snapshot = null
    if (save) {
      const periodStr = period || getCurrentPeriod()

      snapshot = await prisma.teacherPerformanceSnapshot.upsert({
        where: {
          teacherId_period: {
            teacherId,
            period: periodStr,
          },
        },
        create: {
          teacherId,
          period: periodStr,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          studentOutcomes: {
            avgScore: metrics.avgStudentScore,
            progressRate: metrics.studentProgressRate,
            completionRate: metrics.homeworkCompletionRate,
          },
          aiInsights: parsedInsights,
          recommendations: parsedInsights.recommendedActions || [],
        },
        update: {
          metrics: metrics as unknown as Prisma.InputJsonValue,
          studentOutcomes: {
            avgScore: metrics.avgStudentScore,
            progressRate: metrics.studentProgressRate,
            completionRate: metrics.homeworkCompletionRate,
          },
          aiInsights: parsedInsights,
          recommendations: parsedInsights.recommendedActions || [],
        },
      })
    }

    return NextResponse.json({
      metrics,
      generatedContent: aiResponse,
      parsedInsights,
      snapshot,
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

/**
 * Calculate full metrics for a teacher
 */
async function calculateFullMetrics(teacherId: string, period?: string): Promise<TeacherMetrics> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const dateFilter = { gte: thirtyDaysAgo }

  // Get all metrics in parallel
  const [
    lessonsCount,
    worksheetsCount,
    homeworkCount,
    trainingProgress,
    communityPosts,
    homeworkSubmissions,
    teacherClasses,
  ] = await Promise.all([
    prisma.lesson.count({
      where: { teacherId, createdAt: dateFilter },
    }),
    prisma.worksheet.count({
      where: { createdById: teacherId, createdAt: dateFilter },
    }),
    prisma.homework.count({
      where: { teacherId, createdAt: dateFilter },
    }),
    prisma.teacherTrainingProgress.count({
      where: { teacherId, status: 'COMPLETED' },
    }),
    prisma.communityPost.count({
      where: { authorId: teacherId, createdAt: dateFilter },
    }),
    prisma.homeworkSubmission.findMany({
      where: {
        homework: { teacherId },
        gradedAt: dateFilter,
      },
      select: {
        totalScore: true,
        percentage: true,
        status: true,
      },
    }),
    prisma.teacherClass.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            students: true,
          },
        },
      },
    }),
  ])

  // Calculate student metrics
  const avgStudentScore =
    homeworkSubmissions.length > 0
      ? homeworkSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) /
        homeworkSubmissions.length
      : 0

  const submittedCount = homeworkSubmissions.filter(
    (s) => s.status !== 'PENDING'
  ).length
  const homeworkCompletionRate =
    homeworkSubmissions.length > 0
      ? (submittedCount / homeworkSubmissions.length) * 100
      : 0

  // Count active students
  const activeStudents = new Set(
    teacherClasses.flatMap((tc) => tc.class.students.map((s) => s.id))
  ).size

  return {
    lessonsCreated: lessonsCount,
    worksheetsGenerated: worksheetsCount,
    homeworkAssigned: homeworkCount,
    avgGradingTime: 2, // Placeholder - would need actual tracking
    avgStudentScore: Math.round(avgStudentScore),
    studentProgressRate: Math.round(avgStudentScore * 0.9), // Simplified calculation
    homeworkCompletionRate: Math.round(homeworkCompletionRate),
    activeStudents,
    aiToolsUsage: lessonsCount + worksheetsCount, // Simplified
    trainingModulesCompleted: trainingProgress,
    communityPosts,
    period: period || 'Last 30 days',
  }
}

/**
 * Get current period string
 */
function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Parse AI insights response
 */
function parseInsightsResponse(response: string): {
  summary: string
  strengths: string[]
  growthAreas: string[]
  recommendedActions: string[]
  suggestedTraining: string[]
} {
  // Extract summary
  const summaryMatch = response.match(/## Performance Summary\n([\s\S]*?)(?=\n## |$)/)
  const summary = summaryMatch ? summaryMatch[1].trim() : ''

  // Extract strengths
  const strengthsMatch = response.match(/## Key Strengths\n([\s\S]*?)(?=\n## |$)/)
  const strengths = strengthsMatch
    ? strengthsMatch[1]
        .split(/\n[-•*]\s*/)
        .filter(Boolean)
        .map((s) => s.trim())
    : []

  // Extract growth areas
  const growthMatch = response.match(/## Growth Opportunities\n([\s\S]*?)(?=\n## |$)/)
  const growthAreas = growthMatch
    ? growthMatch[1]
        .split(/\n[-•*]\s*/)
        .filter(Boolean)
        .map((s) => s.trim())
    : []

  // Extract recommended actions
  const actionsMatch = response.match(/## Recommended Actions\n([\s\S]*?)(?=\n## |$)/)
  const recommendedActions = actionsMatch
    ? actionsMatch[1]
        .split(/\n[-•*]\s*/)
        .filter(Boolean)
        .map((s) => s.trim())
    : []

  // Extract suggested training
  const trainingMatch = response.match(/## Suggested Training\n([\s\S]*?)(?=\n## |$)/)
  const suggestedTraining = trainingMatch
    ? trainingMatch[1]
        .split(/\n[-•*]\s*/)
        .filter(Boolean)
        .map((s) => s.trim())
    : []

  return {
    summary,
    strengths,
    growthAreas,
    recommendedActions,
    suggestedTraining,
  }
}
