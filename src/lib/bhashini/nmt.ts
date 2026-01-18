/**
 * BHASHINI NMT (Neural Machine Translation)
 * Text translation service
 */

import type { BhashiniLanguageCode, NMTRequest, NMTResponse } from './types'
import { getPipelineConfig, getBhashiniHeaders, BHASHINI_CONFIG } from './config'
import { mockTranslate, shouldUseMock } from './mock'

export interface TranslationResult {
  sourceText: string
  translatedText: string
}

/**
 * Translate text from source to target language
 */
export async function translate(
  text: string,
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode
): Promise<TranslationResult> {
  // Skip translation if source and target are the same
  if (sourceLanguage === targetLanguage) {
    return {
      sourceText: text,
      translatedText: text,
    }
  }

  // Use mock in development
  if (shouldUseMock()) {
    const mockResponse = await mockTranslate(text, sourceLanguage, targetLanguage)
    const output = mockResponse.pipelineResponse[0].output[0]
    return {
      sourceText: output.source,
      translatedText: output.target,
    }
  }

  // Get pipeline configuration
  const pipelineConfig = await getPipelineConfig(sourceLanguage, targetLanguage, ['translation'])

  // Build request
  const request: NMTRequest = {
    pipelineTasks: [
      {
        taskType: 'translation',
        config: {
          language: {
            sourceLanguage,
            targetLanguage,
          },
          serviceId: pipelineConfig.nmtServiceId,
        },
      },
    ],
    inputData: {
      input: [
        {
          source: text,
        },
      ],
    },
  }

  // Make API call
  const response = await fetch(pipelineConfig.callbackUrl, {
    method: 'POST',
    headers: getBhashiniHeaders(pipelineConfig.apiKey),
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(BHASHINI_CONFIG.timeout),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BHASHINI NMT request failed: ${response.status} - ${errorText}`)
  }

  const result: NMTResponse = await response.json()
  const output = result.pipelineResponse[0]?.output[0]

  if (!output) {
    throw new Error('No translation output received from BHASHINI')
  }

  return {
    sourceText: output.source,
    translatedText: output.target,
  }
}

/**
 * Translate text to multiple target languages
 */
export async function translateToMultiple(
  text: string,
  sourceLanguage: BhashiniLanguageCode,
  targetLanguages: BhashiniLanguageCode[]
): Promise<Map<BhashiniLanguageCode, string>> {
  const results = new Map<BhashiniLanguageCode, string>()

  // Filter out source language from targets
  const uniqueTargets = targetLanguages.filter((lang) => lang !== sourceLanguage)

  // Translate in parallel
  const translations = await Promise.all(
    uniqueTargets.map(async (targetLang) => {
      try {
        const result = await translate(text, sourceLanguage, targetLang)
        return { lang: targetLang, text: result.translatedText }
      } catch (error) {
        console.error(`Translation to ${targetLang} failed:`, error)
        return { lang: targetLang, text: text } // Fallback to original text
      }
    })
  )

  // Add source language original text
  results.set(sourceLanguage, text)

  // Add translations
  for (const { lang, text: translatedText } of translations) {
    results.set(lang, translatedText)
  }

  return results
}

/**
 * Batch translate multiple texts
 */
export async function batchTranslate(
  texts: string[],
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode
): Promise<TranslationResult[]> {
  // For now, translate sequentially
  // In production, BHASHINI may support batch in single request
  const results: TranslationResult[] = []

  for (const text of texts) {
    const result = await translate(text, sourceLanguage, targetLanguage)
    results.push(result)
  }

  return results
}
