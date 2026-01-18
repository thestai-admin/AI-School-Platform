'use client'

import { useEffect, useRef, useState } from 'react'
import type { TranscriptEntry } from '@/stores/classroom-store'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'
import { getLanguageName } from '@/lib/bhashini/languages'

interface SubtitleOverlayProps {
  transcripts: TranscriptEntry[]
  viewingLanguage: BhashiniLanguageCode
  sourceLanguage: BhashiniLanguageCode
  showOriginal?: boolean
  maxVisible?: number
  className?: string
}

function SubtitleOverlay({
  transcripts,
  viewingLanguage,
  sourceLanguage,
  showOriginal = false,
  maxVisible = 3,
  className = '',
}: SubtitleOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (containerRef.current && isAtBottom) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [transcripts, isAtBottom])

  // Handle scroll to detect if user is at bottom
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50)
    }
  }

  // Get text to display for a transcript
  const getDisplayText = (transcript: TranscriptEntry): string => {
    if (viewingLanguage === transcript.language) {
      return transcript.originalText
    }
    return transcript.translations[viewingLanguage] || transcript.originalText
  }

  // Get recent transcripts
  const visibleTranscripts = transcripts.slice(-maxVisible * 2)

  return (
    <div className={`relative ${className}`}>
      {/* Subtitle container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto max-h-48 space-y-2 p-4 bg-black/70 rounded-lg"
      >
        {visibleTranscripts.length === 0 ? (
          <p className="text-gray-400 text-center text-sm italic">
            Waiting for teacher to speak...
          </p>
        ) : (
          visibleTranscripts.map((transcript, index) => {
            const isLatest = index === visibleTranscripts.length - 1
            const displayText = getDisplayText(transcript)
            const isTranslated = viewingLanguage !== transcript.language
            const hasTranslation = transcript.translations[viewingLanguage]

            return (
              <div
                key={transcript.id}
                className={`transition-opacity duration-300 ${
                  isLatest ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {/* Main subtitle */}
                <p
                  className={`text-white text-lg leading-relaxed ${
                    isLatest ? 'font-medium' : ''
                  }`}
                >
                  {displayText}
                  {isTranslated && !hasTranslation && (
                    <span className="ml-2 text-yellow-400 text-sm">
                      (translating...)
                    </span>
                  )}
                </p>

                {/* Original text (if showing and different from display) */}
                {showOriginal && isTranslated && (
                  <p className="text-gray-400 text-sm mt-1 italic">
                    Original ({getLanguageName(transcript.language)}): {transcript.originalText}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Scroll indicator when not at bottom */}
      {!isAtBottom && transcripts.length > maxVisible && (
        <button
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
              setIsAtBottom(true)
            }
          }}
          className="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          New
        </button>
      )}

      {/* Language indicator */}
      <div className="absolute top-2 right-2 bg-white/20 rounded px-2 py-1 text-xs text-white">
        {getLanguageName(viewingLanguage)}
      </div>
    </div>
  )
}

export { SubtitleOverlay }
