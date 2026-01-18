/**
 * Qwen3 AI Integration via Together.ai
 * 
 * Together.ai offers Qwen3 models with:
 * - Free tier: $5 credit to start
 * - Qwen/Qwen2.5-72B-Instruct (best quality)
 * - Qwen/Qwen2.5-7B-Instruct (faster, cheaper)
 * 
 * Get API key: https://api.together.xyz/
 */

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions'
const QWEN_MODEL = process.env.QWEN_MODEL || 'Qwen/Qwen2.5-72B-Instruct'
const REQUEST_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '60000')
const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3')

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: MessageRole
  content: string
}

interface TogetherResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const errorMessage = lastError.message || ''

      // Don't retry on auth errors
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('invalid_api_key')
      ) {
        throw lastError
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(
          `Qwen request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
          errorMessage
        )
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Qwen request failed after retries')
}

async function callTogetherAPI(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const apiKey = process.env.TOGETHER_API_KEY

  if (!apiKey) {
    throw new Error('TOGETHER_API_KEY environment variable is not set')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
        top_p: 0.9,
        stop: ['<|im_end|>'],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Together API error (${response.status}): ${errorText}`)
    }

    const data: TogetherResponse = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`)
    }
    throw error
  }
}

export async function generateWithClaude(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
    retries?: number
  }
): Promise<string> {
  return withRetry(async () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]
    return callTogetherAPI(messages, options)
  }, options?.retries ?? MAX_RETRIES)
}

export async function chatWithClaude(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
    retries?: number
  }
): Promise<string> {
  return withRetry(async () => {
    const allMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ]
    return callTogetherAPI(allMessages, options)
  }, options?.retries ?? MAX_RETRIES)
}
