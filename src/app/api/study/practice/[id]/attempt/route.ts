import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { generateWithAI } from '@/lib/ai/provider'
import { getPracticeFeedbackPrompt } from '@/lib/prompts/practice'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/study/practice/[id]/attempt
 * Submit an attempt for a practice question
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'practice_question_generation')
    if (featureError) return featureError
  }

  const { id: questionId } = await params

  try {
    const body = await request.json()
    const { answer, timeTaken, hintsUsed = 0 } = body

    if (!answer || timeTaken === undefined) {
      return NextResponse.json(
        { error: 'Answer and timeTaken are required' },
        { status: 400 }
      )
    }

    // Get student
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get question
    const question = await prisma.practiceQuestion.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Check if correct
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer)

    // Generate AI feedback
    let aiFeedback = null
    try {
      const feedbackPrompt = getPracticeFeedbackPrompt({
        question: question.question,
        correctAnswer: question.correctAnswer,
        studentAnswer: answer,
        isCorrect,
        timeTaken,
        expectedTime: question.solveTimeAvg || 90,
      })

      aiFeedback = await generateWithAI(
        'You are a helpful tutor providing feedback on practice attempts.',
        feedbackPrompt,
        { temperature: 0.5, maxTokens: 500 }
      )
    } catch (error) {
      console.error('Error generating feedback:', error)
    }

    // Save attempt
    const attempt = await prisma.practiceAttempt.create({
      data: {
        studentId: student.id,
        questionId,
        answer,
        isCorrect,
        timeTaken,
        hintsUsed,
        aiFeedback,
      },
    })

    // Update question stats
    const allAttempts = await prisma.practiceAttempt.findMany({
      where: { questionId },
      select: { isCorrect: true, timeTaken: true },
    })

    const correctCount = allAttempts.filter((a) => a.isCorrect).length
    const avgTime = Math.round(
      allAttempts.reduce((sum, a) => sum + a.timeTaken, 0) / allAttempts.length
    )

    await prisma.practiceQuestion.update({
      where: { id: questionId },
      data: {
        successRate: correctCount / allAttempts.length,
        solveTimeAvg: avgTime,
      },
    })

    // Update daily analytics
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.studyAnalytics.upsert({
      where: {
        studentId_date: {
          studentId: student.id,
          date: today,
        },
      },
      create: {
        studentId: student.id,
        date: today,
        questionsAttempted: 1,
        questionsCorrect: isCorrect ? 1 : 0,
      },
      update: {
        questionsAttempted: { increment: 1 },
        questionsCorrect: { increment: isCorrect ? 1 : 0 },
      },
    })

    return NextResponse.json({
      attempt,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      aiFeedback,
    })
  } catch (error) {
    console.error('Error submitting attempt:', error)
    return NextResponse.json(
      { error: 'Failed to submit attempt' },
      { status: 500 }
    )
  }
}

/**
 * Normalize answer for comparison
 */
function normalizeAnswer(answer: string): string {
  return answer
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
}
