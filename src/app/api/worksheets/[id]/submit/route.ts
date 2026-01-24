import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/worksheets/[id]/submit - Submit worksheet response
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: worksheetId } = await params
    const body = await request.json()
    const { answers } = body

    if (!answers) {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      )
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // Get worksheet with questions
    const worksheet = await prisma.worksheet.findUnique({
      where: { id: worksheetId },
      include: {
        class: true,
      },
    })

    if (!worksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 })
    }

    // Verify worksheet is assigned to student's class
    if (worksheet.classId !== student.classId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate score
    const questions = worksheet.questions as Array<{
      id: string
      question: string
      correctAnswer: string
      type?: string
      options?: string[]
      marks?: number
    }>

    const studentAnswers = answers as Array<{ questionId: string; answer: string }>
    let totalScore = 0
    let maxScore = 0

    const gradedAnswers = studentAnswers.map((studentAnswer) => {
      const question = questions.find(q => q.id === studentAnswer.questionId)
      if (!question) {
        return { ...studentAnswer, isCorrect: false, marks: 0 }
      }

      const marks = question.marks || 1
      maxScore += marks

      const isCorrect = studentAnswer.answer.trim().toLowerCase() ===
                        question.correctAnswer.trim().toLowerCase()

      if (isCorrect) {
        totalScore += marks
      }

      return {
        ...studentAnswer,
        isCorrect,
        marks: isCorrect ? marks : 0,
      }
    })

    const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

    // Create or update worksheet response
    const response = await prisma.worksheetResponse.upsert({
      where: {
        studentId_worksheetId: {
          studentId: student.id,
          worksheetId,
        },
      },
      create: {
        studentId: student.id,
        worksheetId,
        answers: gradedAnswers,
        score: scorePercentage,
      },
      update: {
        answers: gradedAnswers,
        score: scorePercentage,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      response,
      totalScore,
      maxScore,
      percentage: Math.round(scorePercentage),
    })
  } catch (error) {
    console.error('Error submitting worksheet:', error)
    return NextResponse.json(
      { error: 'Failed to submit worksheet' },
      { status: 500 }
    )
  }
}
