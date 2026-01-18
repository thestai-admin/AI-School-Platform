'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface BhashiniState {
  // Connection status
  connectionStatus: ConnectionStatus
  lastError: string | null

  // Language preferences
  preferredSourceLanguage: BhashiniLanguageCode
  preferredTargetLanguage: BhashiniLanguageCode

  // Audio recording
  isRecording: boolean
  isMicrophonePermissionGranted: boolean

  // ASR state
  currentTranscript: string
  partialTranscript: string
  transcriptConfidence: number

  // Translation cache
  translationCache: Map<string, Map<BhashiniLanguageCode, string>>

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void
  setError: (error: string | null) => void
  setPreferredSourceLanguage: (language: BhashiniLanguageCode) => void
  setPreferredTargetLanguage: (language: BhashiniLanguageCode) => void
  setIsRecording: (isRecording: boolean) => void
  setMicrophonePermission: (granted: boolean) => void
  setCurrentTranscript: (transcript: string, confidence?: number) => void
  setPartialTranscript: (transcript: string) => void
  appendToTranscript: (text: string) => void
  clearTranscript: () => void
  cacheTranslation: (originalText: string, language: BhashiniLanguageCode, translation: string) => void
  getCachedTranslation: (originalText: string, language: BhashiniLanguageCode) => string | undefined
  reset: () => void
}

const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  lastError: null,
  preferredSourceLanguage: 'hi' as BhashiniLanguageCode,
  preferredTargetLanguage: 'en' as BhashiniLanguageCode,
  isRecording: false,
  isMicrophonePermissionGranted: false,
  currentTranscript: '',
  partialTranscript: '',
  transcriptConfidence: 0,
  translationCache: new Map<string, Map<BhashiniLanguageCode, string>>(),
}

export const useBhashiniStore = create<BhashiniState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setConnectionStatus: (status) =>
        set({ connectionStatus: status }),

      setError: (error) =>
        set({ lastError: error, connectionStatus: error ? 'error' : get().connectionStatus }),

      setPreferredSourceLanguage: (language) =>
        set({ preferredSourceLanguage: language }),

      setPreferredTargetLanguage: (language) =>
        set({ preferredTargetLanguage: language }),

      setIsRecording: (isRecording) =>
        set({ isRecording }),

      setMicrophonePermission: (granted) =>
        set({ isMicrophonePermissionGranted: granted }),

      setCurrentTranscript: (transcript, confidence) =>
        set({
          currentTranscript: transcript,
          transcriptConfidence: confidence ?? get().transcriptConfidence,
          partialTranscript: '',
        }),

      setPartialTranscript: (transcript) =>
        set({ partialTranscript: transcript }),

      appendToTranscript: (text) =>
        set((state) => ({
          currentTranscript: state.currentTranscript
            ? `${state.currentTranscript} ${text}`
            : text,
        })),

      clearTranscript: () =>
        set({
          currentTranscript: '',
          partialTranscript: '',
          transcriptConfidence: 0,
        }),

      cacheTranslation: (originalText, language, translation) => {
        const cache = new Map(get().translationCache)
        if (!cache.has(originalText)) {
          cache.set(originalText, new Map())
        }
        cache.get(originalText)!.set(language, translation)
        set({ translationCache: cache })
      },

      getCachedTranslation: (originalText, language) => {
        return get().translationCache.get(originalText)?.get(language)
      },

      reset: () =>
        set({
          ...initialState,
          // Preserve language preferences
          preferredSourceLanguage: get().preferredSourceLanguage,
          preferredTargetLanguage: get().preferredTargetLanguage,
          isMicrophonePermissionGranted: get().isMicrophonePermissionGranted,
        }),
    }),
    {
      name: 'bhashini-storage',
      partialize: (state) => ({
        preferredSourceLanguage: state.preferredSourceLanguage,
        preferredTargetLanguage: state.preferredTargetLanguage,
      }),
    }
  )
)

// Selector hooks for performance optimization
export const useBhashiniConnectionStatus = () =>
  useBhashiniStore((state) => state.connectionStatus)

export const useBhashiniLanguages = () =>
  useBhashiniStore((state) => ({
    source: state.preferredSourceLanguage,
    target: state.preferredTargetLanguage,
  }))

export const useBhashiniRecording = () =>
  useBhashiniStore((state) => ({
    isRecording: state.isRecording,
    hasPermission: state.isMicrophonePermissionGranted,
  }))

export const useBhashiniTranscript = () =>
  useBhashiniStore((state) => ({
    current: state.currentTranscript,
    partial: state.partialTranscript,
    confidence: state.transcriptConfidence,
  }))
