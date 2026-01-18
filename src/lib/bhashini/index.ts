/**
 * BHASHINI Module Entry Point
 * Re-exports all BHASHINI functionality
 */

// Main client
export { default, BhashiniClient, bhashini } from './client'

// Types
export * from './types'

// Languages
export {
  SUPPORTED_LANGUAGES,
  ALL_INDIAN_LANGUAGES,
  getLanguageByCode,
  getLanguageName,
  getNativeName,
  isLanguageSupported,
  isFutureLanguage,
  isTranslationPairSupported,
  SUPPORTED_TRANSLATION_PAIRS,
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  type LanguageInfo,
} from './languages'

// Config
export {
  BHASHINI_CONFIG,
  getPipelineConfig,
  fetchPipelineConfig,
  clearPipelineCache,
  getServiceId,
  isBhashiniConfigured,
  getBhashiniHeaders,
} from './config'

// ASR
export {
  transcribe,
  audioToBase64,
  arrayBufferToBase64,
  type TranscriptionResult,
  type TranscribeOptions,
} from './asr'

// NMT
export {
  translate,
  translateToMultiple,
  batchTranslate,
  type TranslationResult,
} from './nmt'

// TTS
export {
  textToSpeech,
  base64ToAudioBlob,
  createAudioUrl,
  playAudio,
  type TTSResult,
  type TTSOptions,
} from './tts'

// WebSocket ASR
export {
  StreamingASRClient,
  createStreamingASRClient,
  type StreamingASROptions,
  type ASREventCallback,
  type ConnectionStatusCallback,
} from './websocket-asr'

// Mock
export { shouldUseMock } from './mock'
