import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateWithClaude } from '@/lib/ai/claude'
import { getLessonSystemPrompt, getLessonUserPrompt } from '@/lib/prompts/lesson'
import { Language } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'

interface LessonRequest {
  grade: number
  subject: string
  topic: string
  language: Language
  duration?: number
  // Optional fields for saving
  save?: boolean
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

    const body: LessonRequest = await request.json()
    const { grade, subject, topic, language, duration, save, subjectId, classId } = body

    // Validate required fields
    if (!grade || !subject || !topic || !language) {
      return NextResponse.json(
        { error: 'Grade, subject, topic, and language are required' },
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

    // Generate lesson plan
    const systemPrompt = getLessonSystemPrompt(language)
    const userPrompt = getLessonUserPrompt({
      grade,
      subject,
      topic,
      duration: duration || 45,
    })

    const lessonPlan = await generateWithClaude(systemPrompt, userPrompt, {
      maxTokens: 4096,
    })

    // Handle saving if requested
    let savedLesson = null
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

      // Get or create class for this teacher
      let finalClassId = classId
      if (!finalClassId) {
        const teacherClass = await prisma.teacherClass.findFirst({
          where: { teacherId: session.user.id },
          select: { classId: true },
        })

        if (teacherClass) {
          finalClassId = teacherClass.classId
        } else {
          // Create a default class if none exists
          let defaultSchool = await prisma.school.findFirst()
          if (!defaultSchool) {
            defaultSchool = await prisma.school.create({
              data: { name: 'Default School', slug: 'default' },
            })
          }

          const defaultClass = await prisma.class.create({
            data: {
              name: 'General',
              grade,
              schoolId: defaultSchool.id,
            },
          })
          finalClassId = defaultClass.id
        }
      }

      savedLesson = await prisma.lesson.create({
        data: {
          topic,
          generatedPlan: lessonPlan,
          language,
          date: new Date(),
          status: 'draft',
          teacherId: session.user.id,
          subjectId: dbSubject.id,
          classId: finalClassId,
        },
        include: {
          subject: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      lessonPlan,
      metadata: {
        grade,
        subject,
        topic,
        language,
        generatedAt: new Date().toISOString(),
      },
      ...(savedLesson && { savedLesson }),
    })
  } catch (error) {
    console.error('Lesson generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson plan' },
      { status: 500 }
    )
  }
}
