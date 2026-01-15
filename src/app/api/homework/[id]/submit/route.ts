import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { generateWithClaude } from '@/lib/ai/qwen'
import {
  getGradingSystemPrompt,
  getGradingUserPrompt,
  GradingQuestion,
  StudentAnswer,
  GradingResult,
} from '@/lib/prompts/grading'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/homework/[id]/submit - Submit homework answers (Student only)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit homework' }, { status: 403 })
    }

    const { id: homeworkId } = await context.params
    const body = await request.json()
    const { answers, autoGrade = true } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Answers array is required' },
        { status: 400 }
      )
    }

    // Get student profile
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: { class: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // Get homework
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { subject: true },
    })

    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 })
    }

    // Verify student is in the correct class
    if (student.classId !== homework.classId) {
      return NextResponse.json({ error: 'This homework is not assigned to your class' }, { status: 403 })
    }

    // Check if already submitted and graded
    const existingSubmission = await prisma.homeworkSubmission.findUnique({
      where: {
        studentId_homeworkId: {
          studentId: student.id,
          homeworkId,
        },
      },
    })

    if (existingSubmission?.status === 'GRADED') {
      return NextResponse.json(
        { error: 'Homework already submitted and graded' },
        { status: 400 }
      )
    }

    // Check if submission is late
    const now = new Date()
    const isLate = now > new Date(homework.dueDate)

    // Format answers
    const formattedAnswers: StudentAnswer[] = answers.map((a: { questionId: string; answer: string }) => ({
      questionId: a.questionId,
      answer: a.answer,
    }))

    let gradingResult: GradingResult | null = null

    // Auto-grade using AI if requested
    if (autoGrade) {
      try {
        const questions = homework.questions as unknown as GradingQuestion[]

        const systemPrompt = getGradingSystemPrompt(homework.language)
        const userPrompt = getGradingUserPrompt({
          grade: student.class.grade,
          subject: homework.subject.name,
          topic: homework.title,
          questions,
          studentAnswers: formattedAnswers,
        })

        const response = await generateWithClaude(systemPrompt, userPrompt, {
          maxTokens: 4096,
        })

        // Parse AI response
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          gradingResult = JSON.parse(jsonMatch[0]) as GradingResult
        }
      } catch (error) {
        console.error('Auto-grading failed:', error)
        // Continue without grading - teacher can grade manually
      }
    }

    // Build the answers data
    const answersData = gradingResult
      ? gradingResult.gradedAnswers.map((ga) => {
          const original = formattedAnswers.find(a => a.questionId === ga.questionId)
          return {
            questionId: ga.questionId,
            answer: original?.answer || '',
            isCorrect: ga.isCorrect,
            marksAwarded: ga.marksAwarded,
            feedback: ga.feedback,
          }
        })
      : formattedAnswers.map(a => ({ questionId: a.questionId, answer: a.answer }))

    // Update or create submission
    const submission = await prisma.homeworkSubmission.upsert({
      where: {
        studentId_homeworkId: {
          studentId: student.id,
          homeworkId,
        },
      },
      update: {
        answers: answersData,
        status: gradingResult ? 'GRADED' : 'SUBMITTED',
        submittedAt: now,
        gradedAt: gradingResult ? now : null,
        totalScore: gradingResult?.totalScore || null,
        percentage: gradingResult?.percentage || null,
        aiFeedback: gradingResult
          ? {
              overallFeedback: gradingResult.overallFeedback,
              strengths: gradingResult.strengths,
              weaknesses: gradingResult.weaknesses,
              suggestedTopics: gradingResult.suggestedTopics,
            }
          : Prisma.JsonNull,
        isLate,
      },
      create: {
        studentId: student.id,
        homeworkId,
        answers: answersData,
        status: gradingResult ? 'GRADED' : 'SUBMITTED',
        submittedAt: now,
        gradedAt: gradingResult ? now : null,
        totalScore: gradingResult?.totalScore || null,
        percentage: gradingResult?.percentage || null,
        aiFeedback: gradingResult
          ? {
              overallFeedback: gradingResult.overallFeedback,
              strengths: gradingResult.strengths,
              weaknesses: gradingResult.weaknesses,
              suggestedTopics: gradingResult.suggestedTopics,
            }
          : Prisma.JsonNull,
        isLate,
      },
    })

    // Update student progress if graded
    if (gradingResult) {
      await updateStudentProgress(student.id, homework.subjectId, gradingResult)
    }

    return NextResponse.json({
      submission,
      graded: !!gradingResult,
      message: gradingResult
        ? 'Homework submitted and graded successfully!'
        : 'Homework submitted successfully. Awaiting grading.',
    })
  } catch (error) {
    console.error('Error submitting homework:', error)
    return NextResponse.json(
      { error: 'Failed to submit homework' },
      { status: 500 }
    )
  }
}

// Helper function to update student progress
async function updateStudentProgress(
  studentId: string,
  subjectId: string,
  gradingResult: GradingResult
) {
  try {
    const existing = await prisma.studentProgress.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
    })

    const currentMetrics = (existing?.metrics as Record<string, unknown>) || {
      topicsCompleted: 0,
      totalHomework: 0,
      averageScore: 0,
      strengths: [],
      weaknesses: [],
    }

    // Calculate new average
    const totalHomework = ((currentMetrics.totalHomework as number) || 0) + 1
    const oldAverage = (currentMetrics.averageScore as number) || 0
    const newAverage = ((oldAverage * (totalHomework - 1)) + gradingResult.percentage) / totalHomework

    // Merge strengths and weaknesses (keep unique)
    const strengths = Array.from(new Set([
      ...((currentMetrics.strengths as string[]) || []),
      ...gradingResult.strengths,
    ])).slice(-5) // Keep last 5

    const weaknesses = Array.from(new Set([
      ...((currentMetrics.weaknesses as string[]) || []),
      ...gradingResult.weaknesses,
    ])).slice(-5) // Keep last 5

    await prisma.studentProgress.upsert({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId,
        },
      },
      update: {
        metrics: {
          topicsCompleted: ((currentMetrics.topicsCompleted as number) || 0) + 1,
          totalHomework,
          averageScore: Math.round(newAverage * 100) / 100,
          strengths,
          weaknesses,
        },
      },
      create: {
        studentId,
        subjectId,
        metrics: {
          topicsCompleted: 1,
          totalHomework: 1,
          averageScore: gradingResult.percentage,
          strengths: gradingResult.strengths,
          weaknesses: gradingResult.weaknesses,
        },
      },
    })
  } catch (error) {
    console.error('Failed to update student progress:', error)
  }
}
