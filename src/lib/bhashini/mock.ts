/**
 * BHASHINI Mock Implementation
 * Used for development without real BHASHINI API credentials
 */

import type { BhashiniLanguageCode, ASRResponse, NMTResponse, TTSResponse } from './types'

// Simulated delay to mimic API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Sample Hindi sentences for mock transcription
const SAMPLE_HINDI_TEXTS = [
  'यह एक परीक्षण वाक्य है।',
  'आज का पाठ गणित के बारे में है।',
  'कृपया अपनी किताबें खोलें।',
  'क्या आप सभी समझ रहे हैं?',
  'आज हम त्रिभुजों के बारे में पढ़ेंगे।',
  'इस सवाल का उत्तर क्या है?',
  'बहुत अच्छा! आप सही हैं।',
  'अगले पृष्ठ पर जाएं।',
]

const SAMPLE_ENGLISH_TEXTS = [
  'This is a test sentence.',
  "Today's lesson is about mathematics.",
  'Please open your books.',
  'Is everyone understanding?',
  'Today we will learn about triangles.',
  'What is the answer to this question?',
  'Very good! You are correct.',
  'Go to the next page.',
]

// Simple word-level mock translations (Hindi <-> English)
const MOCK_TRANSLATIONS: Record<string, Record<string, string>> = {
  'hi-en': {
    'यह': 'This',
    'एक': 'a',
    'परीक्षण': 'test',
    'वाक्य': 'sentence',
    'है': 'is',
    'आज': 'Today',
    'का': "'s",
    'पाठ': 'lesson',
    'गणित': 'mathematics',
    'के': 'about',
    'बारे': '',
    'में': '',
    'कृपया': 'Please',
    'अपनी': 'your',
    'किताबें': 'books',
    'खोलें': 'open',
    'क्या': 'What',
    'आप': 'you',
    'सभी': 'all',
    'समझ': 'understand',
    'रहे': 'are',
    'हम': 'we',
    'त्रिभुजों': 'triangles',
    'पढ़ेंगे': 'learn',
    'सवाल': 'question',
    'उत्तर': 'answer',
    'बहुत': 'Very',
    'अच्छा': 'good',
    'सही': 'correct',
    'अगले': 'next',
    'पृष्ठ': 'page',
    'पर': 'to',
    'जाएं': 'go',
  },
  'en-hi': {
    'This': 'यह',
    'is': 'है',
    'a': 'एक',
    'test': 'परीक्षण',
    'sentence': 'वाक्य',
    'Today': 'आज',
    'lesson': 'पाठ',
    'about': 'के बारे में',
    'mathematics': 'गणित',
    'Please': 'कृपया',
    'open': 'खोलें',
    'your': 'अपनी',
    'books': 'किताबें',
    'everyone': 'सभी',
    'understanding': 'समझ रहे हैं',
    'we': 'हम',
    'will': '',
    'learn': 'पढ़ेंगे',
    'triangles': 'त्रिभुज',
    'What': 'क्या',
    'the': '',
    'answer': 'उत्तर',
    'to': '',
    'question': 'सवाल',
    'Very': 'बहुत',
    'good': 'अच्छा',
    'You': 'आप',
    'are': 'हैं',
    'correct': 'सही',
    'Go': 'जाएं',
    'next': 'अगले',
    'page': 'पृष्ठ',
  },
}

/**
 * Mock ASR: Simulates speech-to-text transcription
 */
export async function mockTranscribe(
  _audioBase64: string,
  language: BhashiniLanguageCode
): Promise<ASRResponse> {
  await delay(300 + Math.random() * 400) // 300-700ms latency

  const texts = language === 'hi' ? SAMPLE_HINDI_TEXTS : SAMPLE_ENGLISH_TEXTS
  const randomText = texts[Math.floor(Math.random() * texts.length)]

  return {
    pipelineResponse: [
      {
        taskType: 'asr',
        output: [
          {
            source: randomText,
            confidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
          },
        ],
      },
    ],
  }
}

/**
 * Mock NMT: Simulates text translation
 */
export async function mockTranslate(
  text: string,
  sourceLanguage: BhashiniLanguageCode,
  targetLanguage: BhashiniLanguageCode
): Promise<NMTResponse> {
  await delay(150 + Math.random() * 200) // 150-350ms latency

  let translatedText: string

  // Try word-by-word translation using mock dictionary
  const translationKey = `${sourceLanguage}-${targetLanguage}`
  const dict = MOCK_TRANSLATIONS[translationKey]

  if (dict) {
    const words = text.split(/\s+/)
    translatedText = words
      .map((word) => {
        const cleanWord = word.replace(/[।,\.!?]/g, '')
        const punct = word.match(/[।,\.!?]/)?.[0] || ''
        return (dict[cleanWord] || cleanWord) + punct
      })
      .filter(Boolean)
      .join(' ')
  } else {
    // Fallback: just return the original with a marker
    translatedText = `[${targetLanguage.toUpperCase()}] ${text}`
  }

  return {
    pipelineResponse: [
      {
        taskType: 'translation',
        output: [
          {
            source: text,
            target: translatedText,
          },
        ],
      },
    ],
  }
}

/**
 * Mock TTS: Simulates text-to-speech
 * Returns a placeholder base64 audio (silent WAV)
 */
export async function mockTextToSpeech(
  _text: string,
  _language: BhashiniLanguageCode
): Promise<TTSResponse> {
  await delay(200 + Math.random() * 300) // 200-500ms latency

  // Minimal silent WAV file (44 bytes header + minimal data)
  // In real implementation, you might want to use Web Speech API for development
  const silentWavBase64 =
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

  return {
    pipelineResponse: [
      {
        taskType: 'tts',
        audio: [
          {
            audioContent: silentWavBase64,
          },
        ],
      },
    ],
  }
}

/**
 * Mock streaming ASR callback simulation
 */
export function createMockStreamingASR(
  language: BhashiniLanguageCode,
  onPartial: (text: string) => void,
  onFinal: (text: string, confidence: number) => void
): {
  sendAudio: (audioChunk: string) => void
  stop: () => void
} {
  const texts = language === 'hi' ? SAMPLE_HINDI_TEXTS : SAMPLE_ENGLISH_TEXTS
  const fullText = texts[Math.floor(Math.random() * texts.length)]
  const words = fullText.split(' ')
  let currentIndex = 0
  let intervalId: NodeJS.Timeout | null = null

  return {
    sendAudio: () => {
      // Start streaming simulation when audio is received
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (currentIndex < words.length) {
            currentIndex++
            const partialText = words.slice(0, currentIndex).join(' ')
            onPartial(partialText)
          }
        }, 200) // Emit partial every 200ms
      }
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      onFinal(fullText, 0.92)
    },
  }
}

/**
 * Check if mock mode should be used
 */
export function shouldUseMock(): boolean {
  return (
    process.env.BHASHINI_USE_MOCK === 'true' ||
    !process.env.BHASHINI_USER_ID ||
    !process.env.BHASHINI_API_KEY
  )
}
