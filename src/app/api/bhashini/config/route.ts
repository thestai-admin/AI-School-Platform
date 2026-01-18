import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { getPipelineConfig, isBhashiniConfigured } from '@/lib/bhashini/config'
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
  const rateLimit = rateLimiters.bhashiniNmt(clientIp)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  try {
    const body = await request.json()
    const { sourceLanguage, targetLanguage, tasks } = body

    // Validate languages
    if (!sourceLanguage || !isLanguageSupported(sourceLanguage)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported source language' },
        { status: 400 }
      )
    }

    if (!targetLanguage || !isLanguageSupported(targetLanguage)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported target language' },
        { status: 400 }
      )
    }

    // Check if BHASHINI is configured
    if (!isBhashiniConfigured()) {
      // Return mock config for development
      return NextResponse.json({
        mode: 'mock',
        message: 'BHASHINI credentials not configured. Using mock mode.',
        config: {
          asrServiceId: 'mock-asr',
          nmtServiceId: 'mock-nmt',
          ttsServiceId: 'mock-tts',
          callbackUrl: '/api/bhashini/mock',
        },
      })
    }

    // Fetch pipeline config from BHASHINI
    const config = await getPipelineConfig(
      sourceLanguage as BhashiniLanguageCode,
      targetLanguage as BhashiniLanguageCode,
      tasks
    )

    return NextResponse.json({
      mode: 'live',
      config: {
        asrServiceId: config.asrServiceId,
        nmtServiceId: config.nmtServiceId,
        ttsServiceId: config.ttsServiceId,
        // Don't expose the actual API key to client
        // Client should always go through our API
      },
    })
  } catch (error) {
    console.error('BHASHINI config error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline configuration' },
      { status: 500 }
    )
  }
}
