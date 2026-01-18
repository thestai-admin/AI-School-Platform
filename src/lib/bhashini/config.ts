/**
 * BHASHINI Pipeline Configuration
 * Handles fetching and caching pipeline configs from ULCA
 */

import type {
  BhashiniLanguageCode,
  PipelineConfigRequest,
  PipelineConfigResponse,
  CachedPipelineConfig,
  TaskType,
} from './types'

// Environment configuration
export const BHASHINI_CONFIG = {
  userId: process.env.BHASHINI_USER_ID || '',
  apiKey: process.env.BHASHINI_API_KEY || '',
  configUrl:
    process.env.BHASHINI_CONFIG_URL ||
    'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline',
  computeUrl:
    process.env.BHASHINI_COMPUTE_URL ||
    'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
  timeout: parseInt(process.env.BHASHINI_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.BHASHINI_MAX_RETRIES || '3'),
} as const

// In-memory cache for pipeline configs (1 hour TTL)
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const pipelineCache = new Map<string, CachedPipelineConfig>()

function getCacheKey(
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode,
  tasks: TaskType[]
): string {
  return `${sourceLanguage}-${targetLanguage}-${tasks.sort().join(',')}`
}

/**
 * Fetches pipeline configuration from BHASHINI/ULCA
 */
export async function fetchPipelineConfig(
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode,
  tasks: TaskType[] = ['asr', 'translation', 'tts']
): Promise<PipelineConfigResponse> {
  const requestBody: PipelineConfigRequest = {
    pipelineTasks: tasks.map((taskType) => ({
      taskType,
      config: {
        language: {
          sourceLanguage,
          targetLanguage: taskType === 'translation' ? targetLanguage : undefined,
        },
      },
    })),
    pipelineRequestConfig: {
      pipelineId: 'ulca-asr-nmt-tts-pipeline',
    },
  }

  const response = await fetch(BHASHINI_CONFIG.configUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ulcaApiKey': BHASHINI_CONFIG.apiKey,
      'userID': BHASHINI_CONFIG.userId,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(BHASHINI_CONFIG.timeout),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BHASHINI config request failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Gets cached or fresh pipeline configuration
 */
export async function getPipelineConfig(
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode,
  tasks: TaskType[] = ['asr', 'translation', 'tts']
): Promise<CachedPipelineConfig> {
  const cacheKey = getCacheKey(sourceLanguage, targetLanguage, tasks)

  // Check cache
  const cached = pipelineCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }

  // Fetch fresh config
  const response = await fetchPipelineConfig(sourceLanguage, targetLanguage, tasks)

  // Extract service IDs from response
  const asrConfig = response.pipelineResponseConfig.find((c) => c.taskType === 'asr')
  const nmtConfig = response.pipelineResponseConfig.find((c) => c.taskType === 'translation')
  const ttsConfig = response.pipelineResponseConfig.find((c) => c.taskType === 'tts')

  const cachedConfig: CachedPipelineConfig = {
    asrServiceId: asrConfig?.config[0]?.serviceId || '',
    nmtServiceId: nmtConfig?.config[0]?.serviceId || '',
    ttsServiceId: ttsConfig?.config[0]?.serviceId || '',
    callbackUrl: response.pipelineInferenceAPIEndPoint.callbackUrl,
    apiKey: response.pipelineInferenceAPIEndPoint.inferenceApiKey.value,
    expiresAt: Date.now() + CACHE_TTL,
  }

  pipelineCache.set(cacheKey, cachedConfig)
  return cachedConfig
}

/**
 * Clears the pipeline config cache
 */
export function clearPipelineCache(): void {
  pipelineCache.clear()
}

/**
 * Get specific service ID for a task
 */
export async function getServiceId(
  taskType: TaskType,
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode = 'en'
): Promise<string> {
  const config = await getPipelineConfig(sourceLanguage, targetLanguage, [taskType])

  switch (taskType) {
    case 'asr':
      return config.asrServiceId
    case 'translation':
      return config.nmtServiceId
    case 'tts':
      return config.ttsServiceId
    default:
      throw new Error(`Unknown task type: ${taskType}`)
  }
}

/**
 * Check if BHASHINI credentials are configured
 */
export function isBhashiniConfigured(): boolean {
  return Boolean(BHASHINI_CONFIG.userId && BHASHINI_CONFIG.apiKey)
}

/**
 * Get API headers for BHASHINI requests
 */
export function getBhashiniHeaders(apiKey?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: apiKey || BHASHINI_CONFIG.apiKey,
  }
}
