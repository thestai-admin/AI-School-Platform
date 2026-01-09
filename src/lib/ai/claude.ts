import Anthropic from '@anthropic-ai/sdk'

// Configurable model - allows switching without code changes
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514'
const REQUEST_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '30000') // 30 seconds default
const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: REQUEST_TIMEOUT,
  maxRetries: 0, // We handle retries ourselves for better control
})

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
}

// Sleep helper for exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Retry wrapper with exponential backoff
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

      // Don't retry on authentication errors or invalid requests
      if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('invalid_api_key') ||
        errorMessage.includes('invalid_request')
      ) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s...
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(
          `AI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
          errorMessage
        )
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('AI request failed after retries')
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
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
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
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: options?.maxTokens ?? 2048,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
  }, options?.retries ?? MAX_RETRIES)
}

export { anthropic }
