'use client'

import { forwardRef, useImperativeHandle, useCallback } from 'react'
import { useBhashiniASR } from '@/hooks/useBhashiniASR'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

interface AudioRecorderProps {
  language?: BhashiniLanguageCode
  onTranscript?: (text: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  showControls?: boolean
  className?: string
}

export interface AudioRecorderRef {
  start: () => Promise<void>
  stop: () => void
  isRecording: boolean
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(
  (
    {
      language = 'hi',
      onTranscript,
      onError,
      showControls = true,
      className = '',
    },
    ref
  ) => {
    const {
      isRecording,
      hasPermission,
      transcript,
      partialTranscript,
      confidence,
      startRecording,
      stopRecording,
      requestMicrophonePermission,
      error,
    } = useBhashiniASR({
      language,
      onTranscript,
      onError,
    })

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      start: startRecording,
      stop: stopRecording,
      isRecording,
    }))

    const handleToggle = useCallback(async () => {
      if (isRecording) {
        stopRecording()
      } else {
        await startRecording()
      }
    }, [isRecording, startRecording, stopRecording])

    const handlePermissionRequest = useCallback(async () => {
      await requestMicrophonePermission()
    }, [requestMicrophonePermission])

    if (!showControls) {
      return null
    }

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Permission request */}
        {!hasPermission && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm mb-2">
              Microphone permission is required for speech recognition.
            </p>
            <button
              onClick={handlePermissionRequest}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
            >
              Grant Permission
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Recording controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggle}
            disabled={!hasPermission}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all
              ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
              ${!hasPermission && 'opacity-50 cursor-not-allowed'}
            `}
          >
            {isRecording ? (
              <>
                <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                Stop Recording
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
                Start Recording
              </>
            )}
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="flex gap-1">
                <span className="w-1 h-4 bg-red-500 rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-6 bg-red-500 rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-3 bg-red-500 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-5 bg-red-500 rounded animate-pulse" style={{ animationDelay: '450ms' }} />
              </div>
              <span className="text-sm">Recording...</span>
            </div>
          )}
        </div>

        {/* Transcript display */}
        {(transcript || partialTranscript) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Transcript</span>
              {confidence > 0 && (
                <span className="text-xs text-gray-500">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-gray-800">
              {transcript}
              {partialTranscript && (
                <span className="text-gray-400 italic"> {partialTranscript}</span>
              )}
            </p>
          </div>
        )}
      </div>
    )
  }
)

AudioRecorder.displayName = 'AudioRecorder'

export { AudioRecorder }
