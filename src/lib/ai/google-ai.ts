/**
 * Google AI (Gemini) Provider using API Key
 *
 * This uses the Google AI Studio API which is simpler than Vertex AI.
 * Get your API key from: https://aistudio.google.com/apikey
 */

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const AI_MODEL = process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash'
const REQUEST_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '60000')
const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3')

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
}

// Sleep helper for exponential backoff
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Make API request to Google AI
async function makeGoogleAIRequest(
  endpoint: string,
  body: Record<string, unknown>
): Promise<unknown> {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
  }

  const url = `${API_BASE_URL}/models/${AI_MODEL}:${endpoint}?key=${GOOGLE_AI_API_KEY}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google AI API error (${response.status}): ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

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

      // Don't retry on authentication or permission errors
      if (
        errorMessage.includes('API_KEY') ||
        errorMessage.includes('403') ||
        errorMessage.includes('401') ||
        errorMessage.includes('invalid')
      ) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s...
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(
          `Google AI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
          errorMessage
        )
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Google AI request failed after retries')
}

export async function generateWithGoogleAI(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
    retries?: number
  }
): Promise<string> {
  return withRetry(async () => {
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      },
    }

    const response = await makeGoogleAIRequest('generateContent', body) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return text
  }, options?.retries ?? MAX_RETRIES)
}

export async function chatWithGoogleAI(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
    retries?: number
  }
): Promise<string> {
  return withRetry(async () => {
    // Convert messages to Google AI format
    const contents = messages.map((msg, index) => {
      let text = msg.content
      // Prepend system prompt to first user message
      if (index === 0 && msg.role === 'user' && systemPrompt) {
        text = `System Instructions: ${systemPrompt}\n\n${text}`
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      }
    })

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      },
    }

    const response = await makeGoogleAIRequest('generateContent', body) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return text
  }, options?.retries ?? MAX_RETRIES)
}

// Export configuration for debugging
export function getGoogleAIConfig() {
  return {
    model: AI_MODEL,
    timeout: REQUEST_TIMEOUT,
    maxRetries: MAX_RETRIES,
    configured: !!GOOGLE_AI_API_KEY,
  }
}
