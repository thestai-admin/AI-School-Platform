import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { chatWithClaude, ChatMessage } from '@/lib/ai/ollama'
import { getChatSystemPrompt } from '@/lib/prompts/chat'
import { Language } from '@prisma/client'

interface ChatRequest {
  message: string
  subject?: string
  language: Language
  history?: { role: 'user' | 'assistant'; content: string }[]
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

    const body: ChatRequest = await request.json()
    const { message, subject, language, history = [] } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // For now, assume grade 5 as default. In production, get from student profile
    const grade = 5

    const systemPrompt = getChatSystemPrompt({
      grade,
      language: language || Language.ENGLISH,
      subject,
    })

    const messages: ChatMessage[] = [
      ...history.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await chatWithClaude(systemPrompt, messages, {
      maxTokens: 1024,
    })

    return NextResponse.json({
      success: true,
      response,
      metadata: {
        subject,
        language,
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
