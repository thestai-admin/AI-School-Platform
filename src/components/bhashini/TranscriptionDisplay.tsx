'use client'

import { useRef, useEffect } from 'react'
import type { TranscriptEntry } from '@/stores/classroom-store'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'
import { getLanguageName } from '@/lib/bhashini/languages'

interface TranscriptionDisplayProps {
  transcripts: TranscriptEntry[]
  viewingLanguage?: BhashiniLanguageCode
  showTimestamps?: boolean
  showConfidence?: boolean
  highlightLatest?: boolean
  className?: string
}

function TranscriptionDisplay({
  transcripts,
  viewingLanguage,
  showTimestamps = true,
  showConfidence = false,
  highlightLatest = true,
  className = '',
}: TranscriptionDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [transcripts])

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  }

  const getDisplayText = (transcript: TranscriptEntry): string => {
    if (!viewingLanguage || viewingLanguage === transcript.language) {
      return transcript.originalText
    }
    return transcript.translations[viewingLanguage] || transcript.originalText
  }

  if (transcripts.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <svg
          className="w-12 h-12 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <p className="text-gray-500">No transcripts yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Transcripts will appear here as the teacher speaks
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-lg border border-gray-200 overflow-y-auto ${className}`}
    >
      <div className="divide-y divide-gray-100">
        {transcripts.map((transcript, index) => {
          const isLatest = highlightLatest && index === transcripts.length - 1
          const displayText = getDisplayText(transcript)
          const isTranslated = viewingLanguage && viewingLanguage !== transcript.language

          return (
            <div
              key={transcript.id}
              className={`p-4 transition-colors ${
                isLatest ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">
                    #{transcript.sequence}
                  </span>
                  {showTimestamps && (
                    <span className="text-xs text-gray-400">
                      {formatTime(transcript.timestamp)}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {getLanguageName(transcript.language)}
                  </span>
                </div>
                {showConfidence && transcript.confidence && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      transcript.confidence >= 0.9
                        ? 'bg-green-100 text-green-700'
                        : transcript.confidence >= 0.7
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {(transcript.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Main text */}
              <p className={`text-gray-800 ${isLatest ? 'font-medium' : ''}`}>
                {displayText}
              </p>

              {/* Original text if viewing translation */}
              {isTranslated && transcript.translations[viewingLanguage] && (
                <p className="text-gray-400 text-sm mt-2 italic">
                  Original: {transcript.originalText}
                </p>
              )}

              {/* Translation pending indicator */}
              {isTranslated && !transcript.translations[viewingLanguage] && (
                <p className="text-yellow-600 text-sm mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Translating...
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { TranscriptionDisplay }
