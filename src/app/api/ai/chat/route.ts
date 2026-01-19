import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { chatWithAI, ChatMessage } from '@/lib/ai/provider'
import { getChatSystemPrompt } from '@/lib/prompts/chat'
import { Language } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

interface ChatRequest {
  message: string
  subject?: string
  language: Language
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (AI endpoints are expensive)
    const clientIp = getClientIp(request)
    const rateLimit = rateLimiters.ai(clientIp)
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime)
    }

    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a student
    if (session.user.role !== 'STUDENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only students can use the chat feature' },
        { status: 403 }
      )
    }

    const body: ChatRequest = await request.json()
    const { message, subject, language, history = [] } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Sanitize subject input to prevent prompt injection
    const sanitizedSubject = subject
      ? subject.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 50)
      : undefined

    // Get actual student grade from database
    let grade = 5 // Default fallback
    if (session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        include: { class: true },
      })
      if (student?.class) {
        grade = student.class.grade
      }
    }

    const systemPrompt = getChatSystemPrompt({
      grade,
      language: language || Language.ENGLISH,
      subject: sanitizedSubject,
    })

    const messages: ChatMessage[] = [
      ...history.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await chatWithAI(systemPrompt, messages, {
      maxTokens: 1024,
    })

    return NextResponse.json({
      success: true,
      response,
      metadata: {
        subject: sanitizedSubject,
        language,
        grade,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
