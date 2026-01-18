import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { textToSpeech } from '@/lib/bhashini/tts'
import { isLanguageSupported } from '@/lib/bhashini/languages'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const clientIp = getClientIp(request)
  const rateLimit = rateLimiters.bhashiniTts(clientIp)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  try {
    const body = await request.json()
    const { text, language, gender, samplingRate } = body

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!language || !isLanguageSupported(language)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported language' },
        { status: 400 }
      )
    }

    // Validate optional parameters
    if (gender && !['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be "male" or "female"' },
        { status: 400 }
      )
    }

    if (samplingRate && typeof samplingRate !== 'number') {
      return NextResponse.json(
        { error: 'Sampling rate must be a number' },
        { status: 400 }
      )
    }

    const result = await textToSpeech(
      text,
      language as BhashiniLanguageCode,
      {
        gender: gender || 'female',
        samplingRate: samplingRate || 22050,
      }
    )

    return NextResponse.json({
      audioBase64: result.audioBase64,
      audioUri: result.audioUri,
      language,
    })
  } catch (error) {
    console.error('BHASHINI TTS error:', error)
    return NextResponse.json(
      { error: 'Text-to-speech conversion failed' },
      { status: 500 }
    )
  }
}
