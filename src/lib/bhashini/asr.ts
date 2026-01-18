/**
 * BHASHINI ASR (Automatic Speech Recognition)
 * Speech-to-text transcription service
 */

import type {
  BhashiniLanguageCode,
  ASRRequest,
  ASRResponse,
  AudioFormat,
} from './types'
import { getPipelineConfig, getBhashiniHeaders, BHASHINI_CONFIG } from './config'
import { mockTranscribe, shouldUseMock } from './mock'

export interface TranscriptionResult {
  text: string
  confidence: number
}

export interface TranscribeOptions {
  audioFormat?: AudioFormat
  samplingRate?: number
}

/**
 * Transcribe audio to text using BHASHINI ASR
 */
export async function transcribe(
  audioBase64: string,
  language: BhashiniLanguageCode,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  // Use mock in development
  if (shouldUseMock()) {
    const mockResponse = await mockTranscribe(audioBase64, language)
    const output = mockResponse.pipelineResponse[0].output[0]
    return {
      text: output.source,
      confidence: output.confidence ?? 0.9,
    }
  }

  // Get pipeline configuration
  const pipelineConfig = await getPipelineConfig(language, 'en', ['asr'])

  // Build request
  const request: ASRRequest = {
    pipelineTasks: [
      {
        taskType: 'asr',
        config: {
          language: {
            sourceLanguage: language,
          },
          serviceId: pipelineConfig.asrServiceId,
          audioFormat: options.audioFormat || 'wav',
          samplingRate: options.samplingRate || 16000,
        },
      },
    ],
    inputData: {
      audio: [
        {
          audioContent: audioBase64,
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
    throw new Error(`BHASHINI ASR request failed: ${response.status} - ${errorText}`)
  }

  const result: ASRResponse = await response.json()
  const output = result.pipelineResponse[0]?.output[0]

  if (!output) {
    throw new Error('No transcription output received from BHASHINI')
  }

  return {
    text: output.source,
    confidence: output.confidence ?? 0.9,
  }
}

/**
 * Convert audio blob to base64 string
 */
export async function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      // Remove data URL prefix (e.g., "data:audio/wav;base64,")
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(audioBlob)
  })
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
