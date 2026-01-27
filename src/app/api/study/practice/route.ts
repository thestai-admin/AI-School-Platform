import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { Difficulty, ExamType } from '@prisma/client'

/**
 * GET /api/study/practice
 * Get practice questions with filters
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'practice_question_generation')
    if (featureError) return featureError
  }

  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const topic = searchParams.get('topic')
  const difficulty = searchParams.get('difficulty') as Difficulty | null
  const examType = searchParams.get('examType') as ExamType | null
  const limit = parseInt(searchParams.get('limit') || '10')
  const excludeAttempted = searchParams.get('excludeAttempted') === 'true'

  try {
    // Get student for filtering attempted questions
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    let attemptedIds: string[] = []
    if (excludeAttempted && student) {
      const attempts = await prisma.practiceAttempt.findMany({
        where: { studentId: student.id },
        select: { questionId: true },
      })
      attemptedIds = attempts.map((a) => a.questionId)
    }

    const questions = await prisma.practiceQuestion.findMany({
      where: {
        ...(subject && { subject }),
        ...(topic && { topic }),
        ...(difficulty && { difficulty }),
        ...(examType && { examType }),
        ...(excludeAttempted && attemptedIds.length > 0 && {
          id: { notIn: attemptedIds },
        }),
      },
      orderBy: [{ successRate: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching practice questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
