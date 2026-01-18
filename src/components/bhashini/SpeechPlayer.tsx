'use client'

import { useState, useRef, useCallback } from 'react'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'
import { getLanguageName } from '@/lib/bhashini/languages'

interface SpeechPlayerProps {
  text: string
  language: BhashiniLanguageCode
  autoPlay?: boolean
  showText?: boolean
  className?: string
  onPlayStart?: () => void
  onPlayEnd?: () => void
  onError?: (error: Error) => void
}

function SpeechPlayer({
  text,
  language,
  autoPlay = false,
  showText = true,
  className = '',
  onPlayStart,
  onPlayEnd,
  onError,
}: SpeechPlayerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playAudio = useCallback(async () => {
    if (isLoading || isPlaying) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch TTS audio from API
      const response = await fetch('/api/bhashini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          gender: 'female',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const data = await response.json()

      // Create audio element from base64
      const audioBlob = base64ToBlob(data.audioBase64, 'audio/wav')
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.pause()
        URL.revokeObjectURL(audioRef.current.src)
      }

      audioRef.current = new Audio(audioUrl)

      audioRef.current.onplay = () => {
        setIsPlaying(true)
        onPlayStart?.()
      }

      audioRef.current.onended = () => {
        setIsPlaying(false)
        onPlayEnd?.()
        URL.revokeObjectURL(audioUrl)
      }

      audioRef.current.onerror = () => {
        setIsPlaying(false)
        setError('Failed to play audio')
        onError?.(new Error('Audio playback failed'))
      }

      await audioRef.current.play()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      onError?.(new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [text, language, isLoading, isPlaying, onPlayStart, onPlayEnd, onError])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [])

  // Auto-play if enabled
  if (autoPlay && !isPlaying && !isLoading && !error) {
    playAudio()
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {/* Play/Stop button */}
      <button
        onClick={isPlaying ? stopAudio : playAudio}
        disabled={isLoading}
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          transition-colors
          ${
            isLoading
              ? 'bg-gray-200 cursor-not-allowed'
              : isPlaying
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
        `}
        title={isPlaying ? 'Stop' : 'Play'}
      >
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Text and metadata */}
      <div className="flex-1 min-w-0">
        {showText && (
          <p className="text-gray-800 break-words">{text}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {getLanguageName(language)}
          </span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Playing...
            </span>
          )}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
      </div>
    </div>
  )
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

export { SpeechPlayer }
