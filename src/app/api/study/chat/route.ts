import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { chatWithAI } from '@/lib/ai/provider'
import { getStudyCompanionSystemPrompt } from '@/lib/prompts/study-companion'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { Language, ExamType, Prisma } from '@prisma/client'

/**
 * POST /api/study/chat
 * Enhanced AI chat for study companion
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'ai_study_companion_24x7')
    if (featureError) return featureError
  }

  // Rate limiting - higher for elite tier
  const identifier = session.user.id || getClientIp(request)
  const limit = rateLimiters.ai(identifier)
  if (!limit.success) {
    return rateLimitResponse(limit.resetTime)
  }

  try {
    const body = await request.json()
    const {
      message,
      sessionId,
      subject,
      topic,
      examType,
      messages = [],
      language = 'ENGLISH',
    } = body

    if (!message || !subject) {
      return NextResponse.json(
        { error: 'Message and subject are required' },
        { status: 400 }
      )
    }

    // Get student info for context
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        class: true,
        progress: {
          where: { subject: { name: subject } },
          include: { subject: true },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Build student context
    const studentContext = {
      grade: student.class.grade,
      weakAreas: student.progress[0]?.metrics
        ? (student.progress[0].metrics as { weaknesses?: string[] }).weaknesses
        : undefined,
      strongAreas: student.progress[0]?.metrics
        ? (student.progress[0].metrics as { strengths?: string[] }).strengths
        : undefined,
    }

    // Generate system prompt
    const systemPrompt = getStudyCompanionSystemPrompt({
      grade: student.class.grade,
      language: language as Language,
      subject,
      examType: examType as ExamType | undefined,
      studentContext,
    })

    // Prepare chat messages
    const chatMessages = [
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Call AI
    const aiResponse = await chatWithAI(systemPrompt, chatMessages, {
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Extract concepts and weak areas from response (simple heuristic)
    const concepts = extractConcepts(aiResponse, subject)
    const weakAreas = extractWeakAreas(message, aiResponse)

    // Update session if provided
    if (sessionId) {
      const allMessages = [
        ...messages,
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: aiResponse, timestamp: new Date() },
      ]

      await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          messages: allMessages as Prisma.InputJsonValue,
          topic: topic || undefined,
          ...(concepts.length > 0 && {
            conceptsCovered: {
              push: concepts,
            },
          }),
          ...(weakAreas.length > 0 && {
            weakAreasFound: {
              push: weakAreas,
            },
          }),
        },
      })
    }

    return NextResponse.json({
      response: aiResponse,
      concepts,
      weakAreas,
    })
  } catch (error) {
    console.error('Error in study chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}

/**
 * Extract concepts mentioned in the AI response
 */
function extractConcepts(response: string, subject: string): string[] {
  const concepts: string[] = []

  // Look for common concept indicators
  const conceptPatterns = [
    /concept of ([^.]+)/gi,
    /understanding ([^.]+)/gi,
    /principle of ([^.]+)/gi,
    /formula for ([^.]+)/gi,
    /law of ([^.]+)/gi,
  ]

  for (const pattern of conceptPatterns) {
    const matches = response.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && match[1].length < 50) {
        concepts.push(match[1].trim())
      }
    }
  }

  return [...new Set(concepts)].slice(0, 5) // Dedupe and limit
}

/**
 * Detect potential weak areas from conversation
 */
function extractWeakAreas(question: string, response: string): string[] {
  const weakIndicators = [
    'confused about',
    'struggling with',
    'don\'t understand',
    'not clear',
    'need help with',
    'having trouble',
  ]

  const questionLower = question.toLowerCase()
  const weakAreas: string[] = []

  for (const indicator of weakIndicators) {
    if (questionLower.includes(indicator)) {
      // Extract the topic after the indicator
      const afterIndicator = questionLower.split(indicator)[1]
      if (afterIndicator) {
        const topic = afterIndicator.split(/[.?!,]/)[0].trim()
        if (topic && topic.length < 50) {
          weakAreas.push(topic)
        }
      }
    }
  }

  // Also check if AI mentions common mistakes
  if (response.toLowerCase().includes('common mistake') ||
      response.toLowerCase().includes('students often')) {
    // This indicates the topic might be a weak area
  }

  return [...new Set(weakAreas)]
}
