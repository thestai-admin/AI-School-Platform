/**
 * BHASHINI TTS (Text-to-Speech)
 * Speech synthesis service
 */

import type { BhashiniLanguageCode, TTSRequest, TTSResponse } from './types'
import { getPipelineConfig, getBhashiniHeaders, BHASHINI_CONFIG } from './config'
import { mockTextToSpeech, shouldUseMock } from './mock'

export interface TTSResult {
  audioBase64: string
  audioUri?: string
}

export interface TTSOptions {
  gender?: 'male' | 'female'
  samplingRate?: number
}

/**
 * Convert text to speech using BHASHINI TTS
 */
export async function textToSpeech(
  text: string,
  language: BhashiniLanguageCode,
  options: TTSOptions = {}
): Promise<TTSResult> {
  // Use mock in development
  if (shouldUseMock()) {
    const mockResponse = await mockTextToSpeech(text, language)
    const audio = mockResponse.pipelineResponse[0].audio[0]
    return {
      audioBase64: audio.audioContent,
      audioUri: audio.audioUri,
    }
  }

  // Get pipeline configuration
  const pipelineConfig = await getPipelineConfig(language, 'en', ['tts'])

  // Build request
  const request: TTSRequest = {
    pipelineTasks: [
      {
        taskType: 'tts',
        config: {
          language: {
            sourceLanguage: language,
          },
          serviceId: pipelineConfig.ttsServiceId,
          gender: options.gender || 'female',
          samplingRate: options.samplingRate || 22050,
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
    throw new Error(`BHASHINI TTS request failed: ${response.status} - ${errorText}`)
  }

  const result: TTSResponse = await response.json()
  const audio = result.pipelineResponse[0]?.audio[0]

  if (!audio) {
    throw new Error('No audio output received from BHASHINI')
  }

  return {
    audioBase64: audio.audioContent,
    audioUri: audio.audioUri,
  }
}

/**
 * Convert base64 audio to Blob
 */
export function base64ToAudioBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

/**
 * Create audio URL from base64
 */
export function createAudioUrl(base64: string, mimeType: string = 'audio/wav'): string {
  const blob = base64ToAudioBlob(base64, mimeType)
  return URL.createObjectURL(blob)
}

/**
 * Play audio from base64 string
 */
export function playAudio(base64: string, mimeType: string = 'audio/wav'): HTMLAudioElement {
  const url = createAudioUrl(base64, mimeType)
  const audio = new Audio(url)
  audio.play()

  // Clean up URL after playback
  audio.addEventListener('ended', () => {
    URL.revokeObjectURL(url)
  })

  return audio
}
