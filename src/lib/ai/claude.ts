import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
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
}

export async function chatWithClaude(
  systemPrompt: string,
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens ?? 2048,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : ''
}

export { anthropic }
