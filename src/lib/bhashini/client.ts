/**
 * BHASHINI API Client
 * Main entry point for all BHASHINI services
 * Follows the same pattern as src/lib/ai/claude.ts
 */

import type { BhashiniLanguageCode, BhashiniClientOptions } from './types'
import { transcribe, TranscribeOptions, TranscriptionResult, audioToBase64, arrayBufferToBase64 } from './asr'
import { translate, translateToMultiple, batchTranslate, TranslationResult } from './nmt'
import { textToSpeech, TTSOptions, TTSResult, base64ToAudioBlob, createAudioUrl, playAudio } from './tts'
import { createStreamingASRClient, StreamingASRClient, StreamingASROptions } from './websocket-asr'
import { getPipelineConfig, isBhashiniConfigured, clearPipelineCache, BHASHINI_CONFIG } from './config'
import { shouldUseMock } from './mock'
import {
  SUPPORTED_LANGUAGES,
  ALL_INDIAN_LANGUAGES,
  getLanguageByCode,
  getLanguageName,
  getNativeName,
  isLanguageSupported,
  isTranslationPairSupported,
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from './languages'

// Sleep helper for exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Retry wrapper with exponential backoff (matches claude.ts pattern)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = BHASHINI_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const errorMessage = lastError.message || ''

      // Don't retry on authentication errors
      if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('invalid_api_key')
      ) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s...
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(
          `BHASHINI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
          errorMessage
        )
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('BHASHINI request failed after retries')
}

/**
 * BHASHINI API Client class
 * Provides a unified interface for all BHASHINI services
 */
export class BhashiniClient {
  private options: BhashiniClientOptions

  constructor(options: BhashiniClientOptions = {}) {
    this.options = options
  }

  /**
   * Check if BHASHINI is properly configured
   */
  isConfigured(): boolean {
    return isBhashiniConfigured()
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return shouldUseMock()
  }

  /**
   * Transcribe audio to text (ASR)
   */
  async transcribe(
    audioBase64: string,
    language: BhashiniLanguageCode,
    options?: TranscribeOptions & { retries?: number }
  ): Promise<TranscriptionResult> {
    return withRetry(
      () => transcribe(audioBase64, language, options),
      options?.retries ?? this.options.maxRetries
    )
  }

  /**
   * Translate text between languages (NMT)
   */
  async translate(
    text: string,
    sourceLanguage: BhashiniLanguageCode,
    targetLanguage: BhashiniLanguageCode,
    options?: { retries?: number }
  ): Promise<TranslationResult> {
    return withRetry(
      () => translate(text, sourceLanguage, targetLanguage),
      options?.retries ?? this.options.maxRetries
    )
  }

  /**
   * Translate to multiple languages at once
   */
  async translateToMultiple(
    text: string,
    sourceLanguage: BhashiniLanguageCode,
    targetLanguages: BhashiniLanguageCode[]
  ): Promise<Map<BhashiniLanguageCode, string>> {
    return translateToMultiple(text, sourceLanguage, targetLanguages)
  }

  /**
   * Convert text to speech (TTS)
   */
  async textToSpeech(
    text: string,
    language: BhashiniLanguageCode,
    options?: TTSOptions & { retries?: number }
  ): Promise<TTSResult> {
    return withRetry(
      () => textToSpeech(text, language, options),
      options?.retries ?? this.options.maxRetries
    )
  }

  /**
   * Create streaming ASR client for real-time transcription
   */
  createStreamingASR(options: StreamingASROptions): StreamingASRClient {
    return createStreamingASRClient(options)
  }

  /**
   * Get pipeline configuration for specific language pair
   */
  async getPipelineConfig(
    sourceLanguage: BhashiniLanguageCode,
    targetLanguage: BhashiniLanguageCode
  ) {
    return getPipelineConfig(sourceLanguage, targetLanguage)
  }

  /**
   * Clear cached pipeline configurations
   */
  clearCache(): void {
    clearPipelineCache()
  }
}

// Create default client instance
const defaultClient = new BhashiniClient()

// Export client class and default instance
export { BhashiniClient as default }

// Export individual functions for direct use
export {
  // ASR
  transcribe,
  audioToBase64,
  arrayBufferToBase64,
  // NMT
  translate,
  translateToMultiple,
  batchTranslate,
  // TTS
  textToSpeech,
  base64ToAudioBlob,
  createAudioUrl,
  playAudio,
  // Streaming ASR
  createStreamingASRClient,
  // Config
  getPipelineConfig,
  isBhashiniConfigured,
  clearPipelineCache,
  // Mock
  shouldUseMock,
  // Languages
  SUPPORTED_LANGUAGES,
  ALL_INDIAN_LANGUAGES,
  getLanguageByCode,
  getLanguageName,
  getNativeName,
  isLanguageSupported,
  isTranslationPairSupported,
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
}

// Export types
export type {
  BhashiniLanguageCode,
  BhashiniClientOptions,
  TranscribeOptions,
  TranscriptionResult,
  TranslationResult,
  TTSOptions,
  TTSResult,
  StreamingASROptions,
  StreamingASRClient,
}

// Default export
export { defaultClient as bhashini }
