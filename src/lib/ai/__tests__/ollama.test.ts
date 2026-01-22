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

  it('generateWithOllama returns a string response', async () => {
    const { generateWithOllama } = await import('../ollama')

    const result = await generateWithOllama(
      'You are a helpful assistant.',
      'Hello, how are you?'
    )

    expect(typeof result).toBe('string')
    expect(result).toBe('Test response from Ollama')
  })

  it('chatWithOllama handles multi-turn conversation', async () => {
    const { chatWithOllama } = await import('../ollama')

    const messages = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello!' },
      { role: 'user' as const, content: 'How are you?' }
    ]

    const result = await chatWithOllama(
      'You are a friendly tutor.',
      messages
    )

    expect(typeof result).toBe('string')
    expect(result).toBe('Test response from Ollama')
  })

  it('respects maxTokens option', async () => {
    const { generateWithOllama } = await import('../ollama')

    const result = await generateWithOllama(
      'System prompt',
      'User message',
      { maxTokens: 100 }
    )

    expect(result).toBe('Test response from Ollama')
  })
})
