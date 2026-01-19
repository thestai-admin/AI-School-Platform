import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { UserRole, SessionStatus, BhashiniLanguage } from '@prisma/client'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { translate } from '@/lib/bhashini/nmt'
import { sendTranscriptToSession, sendTranslationUpdate } from '@/app/api/realtime/classroom/route'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

// Helper to convert string to BhashiniLanguage enum
function toBhashiniLanguage(code: string): BhashiniLanguage {
  const langMap: Record<string, BhashiniLanguage> = {
    'hi': BhashiniLanguage.hi,
    'en': BhashiniLanguage.en,
    'bn': BhashiniLanguage.bn,
    'ta': BhashiniLanguage.ta,
    'te': BhashiniLanguage.te,
    'mr': BhashiniLanguage.mr,
    'gu': BhashiniLanguage.gu,
    'kn': BhashiniLanguage.kn,
    'ml': BhashiniLanguage.ml,
    'pa': BhashiniLanguage.pa,
    'or': BhashiniLanguage.or,
    'as': BhashiniLanguage.as,
  }
  return langMap[code] || BhashiniLanguage.en
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Fetch transcripts for a session
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sessionId } = await params

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify session exists
    const classroomSession = await prisma.classroomSession.findUnique({
      where: { id: sessionId },
    })

    if (!classroomSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch transcripts with translations
    const transcripts = await prisma.sessionTranscript.findMany({
      where: { sessionId },
      include: {
        translations: true,
      },
      orderBy: { sequence: 'asc' },
      skip: offset,
      take: limit,
    })

    // Transform to expected format
    const formattedTranscripts = transcripts.map((t) => ({
      id: t.id,
      sequence: t.sequence,
      originalText: t.originalText,
      language: t.language,
      timestamp: t.timestamp,
      confidence: t.confidence,
      translations: t.translations.reduce(
        (acc, trans) => ({
          ...acc,
          [trans.language]: trans.translatedText,
        }),
        {} as Record<string, string>
      ),
    }))

    return NextResponse.json({
      transcripts: formattedTranscripts,
      total: await prisma.sessionTranscript.count({ where: { sessionId } }),
    })
  } catch (error) {
    console.error('Error fetching transcripts:', error)
    return NextResponse.json({ error: 'Failed to fetch transcripts' }, { status: 500 })
  }
}

// POST - Add new transcript (from teacher ASR)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const clientIp = getClientIp(request)
  const rateLimit = rateLimiters.bhashiniAsr(clientIp)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  const { id: sessionId } = await params

  try {
    const body = await request.json()
    const { text, language, confidence } = body

    if (!text || !language) {
      return NextResponse.json(
        { error: 'text and language are required' },
        { status: 400 }
      )
    }

    // Verify session and ownership
    const classroomSession = await prisma.classroomSession.findUnique({
      where: { id: sessionId },
    })

    if (!classroomSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (classroomSession.teacherId !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (classroomSession.status !== SessionStatus.ACTIVE) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Get next sequence number
    const lastTranscript = await prisma.sessionTranscript.findFirst({
      where: { sessionId },
      orderBy: { sequence: 'desc' },
    })
    const sequence = (lastTranscript?.sequence || 0) + 1

    // Create transcript
    const transcript = await prisma.sessionTranscript.create({
      data: {
        sessionId,
        sequence,
        originalText: text,
        language: toBhashiniLanguage(language),
        confidence,
      },
    })

    // Broadcast original text immediately
    const translations: Record<string, string> = {
      [language]: text,
    }

    await sendTranscriptToSession(sessionId, {
      id: transcript.id,
      sequence,
      originalText: text,
      language: language as BhashiniLanguageCode,
      translations,
      confidence,
    })

    // Translate to target languages asynchronously
    const targetLanguages = classroomSession.targetLanguages.filter(
      (lang) => lang !== language
    ) as BhashiniLanguageCode[]

    // Don't await - let translations complete in background
    translateAndBroadcast(sessionId, transcript.id, text, language as BhashiniLanguageCode, targetLanguages)

    return NextResponse.json({
      transcript: {
        id: transcript.id,
        sequence,
        originalText: text,
        language,
        timestamp: transcript.timestamp,
        confidence,
      },
    })
  } catch (error) {
    console.error('Error creating transcript:', error)
    return NextResponse.json({ error: 'Failed to create transcript' }, { status: 500 })
  }
}

// Background translation function
async function translateAndBroadcast(
  sessionId: string,
  transcriptId: string,
  text: string,
  sourceLanguage: BhashiniLanguageCode,
  targetLanguages: BhashiniLanguageCode[]
) {
  for (const targetLang of targetLanguages) {
    try {
      const result = await translate(text, sourceLanguage, targetLang)

      // Store translation
      await prisma.transcriptTranslation.create({
        data: {
          transcriptId,
          language: targetLang,
          translatedText: result.translatedText,
        },
      })

      // Broadcast to clients
      await sendTranslationUpdate(sessionId, transcriptId, targetLang, result.translatedText)
    } catch (error) {
      console.error(`Failed to translate to ${targetLang}:`, error)
    }
  }
}
