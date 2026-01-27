import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { generateWithAI } from '@/lib/ai/provider'
import { getPracticeQuestionSystemPrompt, getPracticeQuestionUserPrompt } from '@/lib/prompts/practice'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { Difficulty, ExamType, Prisma } from '@prisma/client'

/**
 * POST /api/study/practice/generate
 * Generate AI practice questions
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'practice_question_generation')
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
      topic,
      subtopics,
      difficulty = 'MEDIUM',
      questionCount = 5,
      questionTypes = ['MCQ'],
      examType,
      save = true,
    } = body

    if (!subject || !topic) {
      return NextResponse.json(
        { error: 'Subject and topic are required' },
        { status: 400 }
      )
    }

    // Get student grade for context
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: { class: true },
    })

    const grade = student?.class.grade

    // Generate questions
    const systemPrompt = getPracticeQuestionSystemPrompt(examType as ExamType | undefined)
    const userPrompt = getPracticeQuestionUserPrompt({
      subject,
      topic,
      subtopics,
      difficulty: difficulty as Difficulty,
      questionCount,
      questionTypes,
      examType: examType as ExamType | undefined,
      grade,
    })

    const aiResponse = await generateWithAI(systemPrompt, userPrompt, {
      temperature: 0.8,
      maxTokens: 4000,
    })

    // Parse questions from response
    let questions: Array<{
      id?: string
      question: string
      type: string
      options?: Array<{ label: string; text: string }>
      correctAnswer: string
      explanation: string
      difficulty: string
      topic: string
      subtopic?: string
      estimatedTime?: number
      tags?: string[]
    }> = []

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        questions = parsed.questions || []
      }
    } catch {
      // If JSON parsing fails, return raw response
      return NextResponse.json({
        generatedContent: aiResponse,
        questions: [],
        error: 'Failed to parse questions from AI response',
      })
    }

    // Save questions to database if requested
    const savedQuestions = []
    if (save && questions.length > 0) {
      for (const q of questions) {
        try {
          const saved = await prisma.practiceQuestion.create({
            data: {
              question: q.question,
              options: q.options as Prisma.InputJsonValue,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: (q.difficulty?.toUpperCase() || difficulty) as Difficulty,
              subject,
              topic,
              subtopic: q.subtopic,
              examType: examType as ExamType | undefined,
              source: 'AI Generated',
              tags: q.tags || [],
              solveTimeAvg: q.estimatedTime,
            },
          })
          savedQuestions.push(saved)
        } catch (err) {
          console.error('Error saving question:', err)
        }
      }
    }

    return NextResponse.json({
      questions: save ? savedQuestions : questions,
      generatedCount: questions.length,
      savedCount: savedQuestions.length,
    })
  } catch (error) {
    console.error('Error generating practice questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
