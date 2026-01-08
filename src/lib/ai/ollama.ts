import { Ollama } from 'ollama'

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
})

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
}

export async function generateWithClaude(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'qwen3:8b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    options: {
      num_predict: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7
    }
  })
  return response.message.content
}

export async function chatWithClaude(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'qwen3:8b',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    options: {
      num_predict: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.7
    }
  })
  return response.message.content
}
