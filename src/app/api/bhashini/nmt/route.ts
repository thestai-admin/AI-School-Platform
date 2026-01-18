import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { translate, translateToMultiple } from '@/lib/bhashini/nmt'
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
    const { text, sourceLanguage, targetLanguage, targetLanguages } = body

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    if (!sourceLanguage || !isLanguageSupported(sourceLanguage)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported source language' },
        { status: 400 }
      )
    }

    // Translate to multiple languages if array provided
    if (Array.isArray(targetLanguages) && targetLanguages.length > 0) {
      // Validate all target languages
      const invalidLangs = targetLanguages.filter((lang) => !isLanguageSupported(lang))
      if (invalidLangs.length > 0) {
        return NextResponse.json(
          { error: `Invalid languages: ${invalidLangs.join(', ')}` },
          { status: 400 }
        )
      }

      const translations = await translateToMultiple(
        text,
        sourceLanguage as BhashiniLanguageCode,
        targetLanguages as BhashiniLanguageCode[]
      )

      // Convert Map to object for JSON response
      const translationsObj: Record<string, string> = {}
      translations.forEach((value, key) => {
        translationsObj[key] = value
      })

      return NextResponse.json({
        sourceText: text,
        sourceLanguage,
        translations: translationsObj,
      })
    }

    // Single language translation
    if (!targetLanguage || !isLanguageSupported(targetLanguage)) {
      return NextResponse.json(
        { error: 'Invalid or unsupported target language' },
        { status: 400 }
      )
    }

    const result = await translate(
      text,
      sourceLanguage as BhashiniLanguageCode,
      targetLanguage as BhashiniLanguageCode
    )

    return NextResponse.json({
      sourceText: result.sourceText,
      translatedText: result.translatedText,
      sourceLanguage,
      targetLanguage,
    })
  } catch (error) {
    console.error('BHASHINI NMT error:', error)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}
