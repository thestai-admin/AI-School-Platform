import { VertexAI, GenerateContentRequest, Content } from '@google-cloud/vertexai'

// Configurable model - Gemma 2 is open source (Apache 2.0)
const AI_MODEL = process.env.VERTEX_AI_MODEL || 'gemma-2-27b-it'
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID
const GCP_LOCATION = process.env.GCP_LOCATION || 'asia-south1'
const REQUEST_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '30000')
const MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '3')

// Initialize Vertex AI client
function getVertexAI() {
  if (!GCP_PROJECT_ID) {
    throw new Error('GCP_PROJECT_ID environment variable is required for Vertex AI')
  }

  return new VertexAI({
    project: GCP_PROJECT_ID,
    location: GCP_LOCATION,
  })
}

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

      // Don't retry on authentication or permission errors
      if (
        errorMessage.includes('authentication') ||
        errorMessage.includes('PERMISSION_DENIED') ||
        errorMessage.includes('UNAUTHENTICATED') ||
        errorMessage.includes('invalid')
      ) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s...
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(
          `Vertex AI request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`,
          errorMessage
        )
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Vertex AI request failed after retries')
}

// Timeout wrapper
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout])
}

export async function generateWithVertex(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
    retries?: number
  }
): Promise<string> {
  return withRetry(async () => {
    const vertexAI = getVertexAI()

    const model = vertexAI.getGenerativeModel({
      model: AI_MODEL,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      },
    })

    // Combine system prompt with user message for models without native system instruction
    const combinedPrompt = `${systemPrompt}\n\n${userMessage}`

    const request: GenerateContentRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: combinedPrompt }],
        },
      ],
    }

    const result = await withTimeout(
      model.generateContent(request),
      REQUEST_TIMEOUT
    )

    const response = result.response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return text
  }, options?.retries ?? MAX_RETRIES)
}

export async function chatWithVertex(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
    retries?: number
  }
): Promise<string> {
  return withRetry(async () => {
    const vertexAI = getVertexAI()

    const model = vertexAI.getGenerativeModel({
      model: AI_MODEL,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      },
    })

    // Convert messages to Vertex AI format
    const contents: Content[] = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    // Prepend system prompt to first message if exists
    if (contents.length > 0 && systemPrompt) {
      const firstUserContent = contents.find(c => c.role === 'user')
      if (firstUserContent && firstUserContent.parts[0]) {
        const textPart = firstUserContent.parts[0] as { text: string }
        textPart.text = `System Instructions: ${systemPrompt}\n\n${textPart.text}`
      }
    }

    // Start chat with history (all but last message)
    const history = contents.slice(0, -1)
    const lastMessage = messages[messages.length - 1]

    const chat = model.startChat({
      history: history,
    })

    const result = await withTimeout(
      chat.sendMessage(lastMessage.content),
      REQUEST_TIMEOUT
    )

    const response = result.response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return text
  }, options?.retries ?? MAX_RETRIES)
}

// Streaming support for real-time responses
export async function* streamWithVertex(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): AsyncGenerator<string> {
  const vertexAI = getVertexAI()

  const model = vertexAI.getGenerativeModel({
    model: AI_MODEL,
    generationConfig: {
      maxOutputTokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    },
  })

  const combinedPrompt = `${systemPrompt}\n\n${userMessage}`

  const request: GenerateContentRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: combinedPrompt }],
      },
    ],
  }

  const streamingResult = await model.generateContentStream(request)

  for await (const chunk of streamingResult.stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (text) {
      yield text
    }
  }
}

// Export configuration for debugging
export function getVertexConfig() {
  return {
    projectId: GCP_PROJECT_ID,
    location: GCP_LOCATION,
    model: AI_MODEL,
    timeout: REQUEST_TIMEOUT,
    maxRetries: MAX_RETRIES,
  }
}
