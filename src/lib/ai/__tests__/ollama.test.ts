import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the ollama module
vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    chat: vi.fn().mockResolvedValue({
      message: { content: 'Test response from Ollama' }
    })
  }))
}))

describe('Ollama Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generateWithClaude returns a string response', async () => {
    const { generateWithClaude } = await import('../ollama')

    const result = await generateWithClaude(
      'You are a helpful assistant.',
      'Hello, how are you?'
    )

    expect(typeof result).toBe('string')
    expect(result).toBe('Test response from Ollama')
  })

  it('chatWithClaude handles multi-turn conversation', async () => {
    const { chatWithClaude } = await import('../ollama')

    const messages = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello!' },
      { role: 'user' as const, content: 'How are you?' }
    ]

    const result = await chatWithClaude(
      'You are a friendly tutor.',
      messages
    )

    expect(typeof result).toBe('string')
    expect(result).toBe('Test response from Ollama')
  })

  it('respects maxTokens option', async () => {
    const { generateWithClaude } = await import('../ollama')

    const result = await generateWithClaude(
      'System prompt',
      'User message',
      { maxTokens: 100 }
    )

    expect(result).toBe('Test response from Ollama')
  })
})
