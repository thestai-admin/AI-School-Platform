/**
 * Unified AI Provider
 *
 * Automatically selects the appropriate AI provider based on environment configuration.
 * Priority order:
 * 1. Google AI (API Key) - if GOOGLE_AI_API_KEY is set (simplest)
 * 2. Vertex AI (GCP) - if GCP_PROJECT_ID and VERTEX_AI_MODEL are set
 * 3. Together.ai (Qwen) - if TOGETHER_API_KEY is set
 * 4. Anthropic Claude - if ANTHROPIC_API_KEY is set
 * 5. Ollama - fallback for local development
 */

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
}

export interface GenerateOptions {
  maxTokens?: number
  temperature?: number
  retries?: number
}

// Determine which provider to use
function getProvider(): 'google-ai' | 'vertex' | 'qwen' | 'claude' | 'ollama' {
  // Force a specific provider via environment variable
  const forcedProvider = process.env.AI_PROVIDER
  if (forcedProvider) {
    if (['google-ai', 'vertex', 'qwen', 'claude', 'ollama'].includes(forcedProvider)) {
      return forcedProvider as 'google-ai' | 'vertex' | 'qwen' | 'claude' | 'ollama'
    }
    console.warn(`Unknown AI_PROVIDER "${forcedProvider}", falling back to auto-detection`)
  }

  // Auto-detect based on available credentials
  if (process.env.GOOGLE_AI_API_KEY) {
    return 'google-ai'
  }
  if (process.env.GCP_PROJECT_ID && process.env.VERTEX_AI_MODEL) {
    return 'vertex'
  }
  if (process.env.TOGETHER_API_KEY) {
    return 'qwen'
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'claude'
  }
  return 'ollama'
}

// Lazy-load providers to avoid importing unused dependencies
async function getGoogleAIFunctions() {
  const { generateWithGoogleAI, chatWithGoogleAI } = await import('./google-ai')
  return { generate: generateWithGoogleAI, chat: chatWithGoogleAI }
}

async function getVertexFunctions() {
  const { generateWithVertex, chatWithVertex } = await import('./vertex')
  return { generate: generateWithVertex, chat: chatWithVertex }
}

async function getQwenFunctions() {
  const { generateWithClaude, chatWithClaude } = await import('./qwen')
  return { generate: generateWithClaude, chat: chatWithClaude }
}

async function getClaudeFunctions() {
  const { generateWithClaude, chatWithClaude } = await import('./claude')
  return { generate: generateWithClaude, chat: chatWithClaude }
}

async function getOllamaFunctions() {
  const { generateWithOllama, chatWithOllama } = await import('./ollama')
  return { generate: generateWithOllama, chat: chatWithOllama }
}

async function getProviderFunctions() {
  const provider = getProvider()

  switch (provider) {
    case 'google-ai':
      console.log('[AI] Using Google AI (Gemini)')
      return getGoogleAIFunctions()
    case 'vertex':
      console.log('[AI] Using Vertex AI (Gemma 2)')
      return getVertexFunctions()
    case 'qwen':
      console.log('[AI] Using Together.ai (Qwen)')
      return getQwenFunctions()
    case 'claude':
      console.log('[AI] Using Anthropic Claude')
      return getClaudeFunctions()
    case 'ollama':
    default:
      console.log('[AI] Using Ollama (local)')
      return getOllamaFunctions()
  }
}

// Cache the provider functions after first call
let cachedFunctions: { generate: typeof generateWithAI; chat: typeof chatWithAI } | null = null

async function getFunctions() {
  if (!cachedFunctions) {
    cachedFunctions = await getProviderFunctions()
  }
  return cachedFunctions
}

/**
 * Generate content with the configured AI provider
 */
export async function generateWithAI(
  systemPrompt: string,
  userMessage: string,
  options?: GenerateOptions
): Promise<string> {
  const { generate } = await getFunctions()
  return generate(systemPrompt, userMessage, options)
}

/**
 * Chat with the configured AI provider
 */
export async function chatWithAI(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: GenerateOptions
): Promise<string> {
  const { chat } = await getFunctions()
  return chat(systemPrompt, messages, options)
}

/**
 * Get current provider information for debugging
 */
export function getProviderInfo() {
  const provider = getProvider()
  return {
    provider,
    model: getModelForProvider(provider),
    configured: isProviderConfigured(provider),
  }
}

function getModelForProvider(provider: string): string {
  switch (provider) {
    case 'google-ai':
      return process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash'
    case 'vertex':
      return process.env.VERTEX_AI_MODEL || 'gemma-2-27b-it'
    case 'qwen':
      return process.env.QWEN_MODEL || 'Qwen/Qwen2.5-72B-Instruct'
    case 'claude':
      return process.env.AI_MODEL || 'claude-sonnet-4-20250514'
    case 'ollama':
      return process.env.OLLAMA_MODEL || 'qwen3:8b'
    default:
      return 'unknown'
  }
}

function isProviderConfigured(provider: string): boolean {
  switch (provider) {
    case 'google-ai':
      return !!process.env.GOOGLE_AI_API_KEY
    case 'vertex':
      return !!process.env.GCP_PROJECT_ID
    case 'qwen':
      return !!process.env.TOGETHER_API_KEY
    case 'claude':
      return !!process.env.ANTHROPIC_API_KEY
    case 'ollama':
      return true // Always available locally
    default:
      return false
  }
}

// Re-export types for convenience
export type { GenerateOptions as AIGenerateOptions }
