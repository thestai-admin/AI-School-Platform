import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { generateWithAI } from '@/lib/ai/provider'
import { getLearningPathSystemPrompt, getLearningPathUserPrompt } from '@/lib/prompts/learning-path'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { ExamType, Prisma } from '@prisma/client'

/**
 * POST /api/study/learning-path/generate
 * Generate AI-powered learning path
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

  // Rate limiting
  const identifier = session.user.id || getClientIp(request)
  const limit = rateLimiters.ai(identifier)
  if (!limit.success) {
    return rateLimitResponse(limit.resetTime)
  }

  try {
    const body = await request.json()
    const {
      subject,
      currentLevel = 3,
      targetLevel = 8,
      weakAreas = [],
      strongAreas = [],
      examType,
      targetDate,
      dailyAvailableTime = 120,
      save = true,
    } = body

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    // Get student
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: { class: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Generate learning path with AI
    const systemPrompt = getLearningPathSystemPrompt()
    const userPrompt = getLearningPathUserPrompt({
      subject,
      currentLevel,
      targetLevel,
      weakAreas,
      strongAreas,
      examType,
      targetDate,
      dailyAvailableTime,
    })

    const aiResponse = await generateWithAI(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 3000,
    })

    // Parse milestones from response
    let milestones: Array<{
      id: string
      title: string
      description?: string
      topics: string[]
      estimatedDays: number
      targetScore: number
      completed: boolean
    }> = []

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"milestones"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        milestones = (parsed.milestones || []).map((m: { id?: string; title: string; description?: string; topics?: string[]; estimatedDays?: number; targetScore?: number }, i: number) => ({
          ...m,
          id: m.id || `m${i + 1}`,
          completed: false,
          topics: m.topics || [],
          estimatedDays: m.estimatedDays || 14,
          targetScore: m.targetScore || 60,
        }))
      }
    } catch {
      // If parsing fails, create default milestones
      milestones = [
        {
          id: 'm1',
          title: 'Foundation',
          topics: weakAreas.slice(0, 3),
          estimatedDays: 14,
          targetScore: 50,
          completed: false,
        },
        {
          id: 'm2',
          title: 'Intermediate',
          topics: [],
          estimatedDays: 21,
          targetScore: 70,
          completed: false,
        },
        {
          id: 'm3',
          title: 'Advanced',
          topics: [],
          estimatedDays: 21,
          targetScore: 85,
          completed: false,
        },
      ]
    }

    // Save path if requested
    let savedPath = null
    if (save) {
      // Deactivate existing paths for this subject
      await prisma.personalizedLearningPath.updateMany({
        where: {
          studentId: student.id,
          subject,
          isActive: true,
        },
        data: { isActive: false },
      })

      savedPath = await prisma.personalizedLearningPath.create({
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
          recommendedTime: dailyAvailableTime,
          isActive: true,
          aiAdjustedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      generatedContent: aiResponse,
      milestones,
      path: savedPath,
    })
  } catch (error) {
    console.error('Error generating learning path:', error)
    return NextResponse.json(
      { error: 'Failed to generate learning path' },
      { status: 500 }
    )
  }
}
