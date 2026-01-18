/**
 * BHASHINI API Type Definitions
 * Based on ULCA (Universal Language Contribution API) specification
 */

// Supported BHASHINI language codes (ISO-639)
export type BhashiniLanguageCode = 'hi' | 'en' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'ur'

// Pipeline task types
export type TaskType = 'asr' | 'translation' | 'tts'

// Audio formats
export type AudioFormat = 'wav' | 'mp3' | 'flac' | 'ogg'

// ===================
// Pipeline Config
// ===================

export interface PipelineTask {
  taskType: TaskType
  config: {
    language?: {
      sourceLanguage: BhashiniLanguageCode
      targetLanguage?: BhashiniLanguageCode
    }
    serviceId?: string
    gender?: 'male' | 'female'
    samplingRate?: number
  }
}

export interface PipelineConfigRequest {
  pipelineTasks: PipelineTask[]
  pipelineRequestConfig: {
    pipelineId: string
  }
}

export interface PipelineConfigResponse {
  pipelineResponseConfig: Array<{
    taskType: TaskType
    config: Array<{
      serviceId: string
      modelId: string
      language: {
        sourceLanguage: BhashiniLanguageCode
        targetLanguage?: BhashiniLanguageCode
      }
    }>
  }>
  pipelineInferenceAPIEndPoint: {
    callbackUrl: string
    inferenceApiKey: {
      name: string
      value: string
    }
  }
  pipelineInferenceSocketEndPoint?: {
    callbackUrl: string
    inferenceApiKey: {
      name: string
      value: string
    }
  }
}

// ===================
// ASR (Speech-to-Text)
// ===================

export interface ASRRequest {
  pipelineTasks: Array<{
    taskType: 'asr'
    config: {
      language: {
        sourceLanguage: BhashiniLanguageCode
      }
      serviceId: string
      audioFormat: AudioFormat
      samplingRate: number
    }
  }>
  inputData: {
    audio: Array<{
      audioContent: string // Base64 encoded audio
    }>
  }
}

export interface ASRResponse {
  pipelineResponse: Array<{
    taskType: 'asr'
    output: Array<{
      source: string // Transcribed text
      confidence?: number
    }>
  }>
}

// ===================
// NMT (Translation)
// ===================

export interface NMTRequest {
  pipelineTasks: Array<{
    taskType: 'translation'
    config: {
      language: {
        sourceLanguage: BhashiniLanguageCode
        targetLanguage: BhashiniLanguageCode
      }
      serviceId: string
    }
  }>
  inputData: {
    input: Array<{
      source: string // Text to translate
    }>
  }
}

export interface NMTResponse {
  pipelineResponse: Array<{
    taskType: 'translation'
    output: Array<{
      source: string
      target: string // Translated text
    }>
  }>
}

// ===================
// TTS (Text-to-Speech)
// ===================

export interface TTSRequest {
  pipelineTasks: Array<{
    taskType: 'tts'
    config: {
      language: {
        sourceLanguage: BhashiniLanguageCode
      }
      serviceId: string
      gender: 'male' | 'female'
      samplingRate: number
    }
  }>
  inputData: {
    input: Array<{
      source: string // Text to convert to speech
    }>
  }
}

export interface TTSResponse {
  pipelineResponse: Array<{
    taskType: 'tts'
    audio: Array<{
      audioContent: string // Base64 encoded audio
      audioUri?: string
    }>
  }>
}

// ===================
// WebSocket ASR
// ===================

export interface WebSocketASRConfig {
  language: BhashiniLanguageCode
  serviceId: string
  samplingRate: number
  audioFormat: AudioFormat
}

export interface WebSocketASRMessage {
  type: 'start' | 'audio' | 'stop'
  config?: WebSocketASRConfig
  audio?: string // Base64 audio chunk
}

export interface WebSocketASRResult {
  type: 'partial' | 'final'
  transcript: string
  confidence?: number
  isFinal: boolean
}

// ===================
// Combined Pipeline
// ===================

export interface CombinedPipelineRequest {
  pipelineTasks: Array<{
    taskType: TaskType
    config: {
      language: {
        sourceLanguage: BhashiniLanguageCode
        targetLanguage?: BhashiniLanguageCode
      }
      serviceId: string
      audioFormat?: AudioFormat
      samplingRate?: number
      gender?: 'male' | 'female'
    }
  }>
  inputData: {
    audio?: Array<{ audioContent: string }>
    input?: Array<{ source: string }>
  }
}

// ===================
// Error Types
// ===================

export interface BhashiniError {
  code: string
  message: string
  details?: string
}

export class BhashiniAPIError extends Error {
  code: string
  details?: string

  constructor(error: BhashiniError) {
    super(error.message)
    this.name = 'BhashiniAPIError'
    this.code = error.code
    this.details = error.details
  }
}

// ===================
// Client Options
// ===================

export interface BhashiniClientOptions {
  userId?: string
  apiKey?: string
  configUrl?: string
  computeUrl?: string
  timeout?: number
  maxRetries?: number
  useMock?: boolean
}

// ===================
// Cached Pipeline Config
// ===================

export interface CachedPipelineConfig {
  asrServiceId: string
  nmtServiceId: string
  ttsServiceId: string
  callbackUrl: string
  apiKey: string
  expiresAt: number
}
