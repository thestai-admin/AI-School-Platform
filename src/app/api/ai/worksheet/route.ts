import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateWithClaude } from '@/lib/ai/ollama'
import { getWorksheetSystemPrompt, getWorksheetUserPrompt, WorksheetQuestion } from '@/lib/prompts/worksheet'
import { Language, Difficulty } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

interface WorksheetRequest {
  grade: number
  subject: string
  topic: string
  difficulty: Difficulty
  questionCount: number
  language: Language
  questionTypes?: string[]
  // Optional fields for saving
  save?: boolean
  title?: string
  subjectId?: string
  classId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: WorksheetRequest = await request.json()
    const { grade, subject, topic, difficulty, questionCount, language, questionTypes, save, title, subjectId, classId } = body

    // Validate required fields
    if (!grade || !subject || !topic || !difficulty || !questionCount || !language) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate grade
    if (grade < 1 || grade > 10) {
      return NextResponse.json(
        { error: 'Grade must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Validate question count
    if (questionCount < 5 || questionCount > 20) {
      return NextResponse.json(
        { error: 'Question count must be between 5 and 20' },
        { status: 400 }
      )
    }

    const systemPrompt = getWorksheetSystemPrompt(language)
    const userPrompt = getWorksheetUserPrompt({
      grade,
      subject,
      topic,
      difficulty,
      questionCount,
      questionTypes,
    })

    const response = await generateWithClaude(systemPrompt, userPrompt, {
      maxTokens: 4096,
    })

    // Parse the JSON response
    let questions: WorksheetQuestion[]
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No valid JSON found in response')
      }
    } catch {
      console.error('Failed to parse worksheet response:', response)
      return NextResponse.json(
        { error: 'Failed to parse generated worksheet' },
        { status: 500 }
      )
    }

    // Handle saving if requested
    let savedWorksheet = null
    if (save) {
      // Find or create the subject by name
      let dbSubject = subjectId
        ? await prisma.subject.findUnique({ where: { id: subjectId } })
        : await prisma.subject.findFirst({ where: { name: subject, gradeLevel: null } })

      if (!dbSubject) {
        dbSubject = await prisma.subject.create({
          data: { name: subject, gradeLevel: null },
        })
      }

      savedWorksheet = await prisma.worksheet.create({
        data: {
          title: title || `${topic} - Worksheet`,
          questions: JSON.parse(JSON.stringify(questions)),
          difficulty,
          language,
          createdById: session.user.id,
          subjectId: dbSubject.id,
          classId: classId || null,
        },
        include: {
          subject: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        grade,
        subject,
        topic,
        difficulty,
        language,
        totalQuestions: questions.length,
        totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
        generatedAt: new Date().toISOString(),
      },
      ...(savedWorksheet && { savedWorksheet }),
    })
  } catch (error) {
    console.error('Worksheet generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate worksheet' },
      { status: 500 }
    )
  }
}
