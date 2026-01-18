'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubtitleOverlay } from '@/components/bhashini/SubtitleOverlay'
import { TranscriptionDisplay } from '@/components/bhashini/TranscriptionDisplay'
import { LanguagePills } from '@/components/bhashini/LanguagePicker'
import { useClassroomSession } from '@/hooks/useClassroomSession'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'
import { getLanguageName, SUPPORTED_LANGUAGES } from '@/lib/bhashini/languages'

type ViewMode = 'subtitle' | 'transcript'

export default function StudentClassroomSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [teacherName, setTeacherName] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState<BhashiniLanguageCode>('hi')
  const [viewMode, setViewMode] = useState<ViewMode>('subtitle')
  const [showOriginal, setShowOriginal] = useState(false)

  // Connect to classroom session SSE
  const {
    isConnected,
    connectionStatus,
    transcripts,
    viewingLanguage,
    setViewingLanguage,
    error: sessionError,
    connect,
    disconnect,
  } = useClassroomSession({
    sessionId,
    role: 'student',
    preferredLanguage: 'en',
    autoConnect: true,
    onError: (err) => console.error('Session error:', err),
  })

  // Extract session info from first connection event
  useEffect(() => {
    // This would typically come from the SSE connection
    // For now we'll set defaults
  }, [])

  const handleLeave = () => {
    disconnect()
    router.push('/student/classroom')
  }

  // Determine connection status display
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Connected', color: 'text-green-600', bg: 'bg-green-500' }
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-600', bg: 'bg-yellow-500' }
      case 'reconnecting':
        return { text: 'Reconnecting...', color: 'text-yellow-600', bg: 'bg-yellow-500' }
      case 'error':
        return { text: 'Connection error', color: 'text-red-600', bg: 'bg-red-500' }
      default:
        return { text: 'Disconnected', color: 'text-gray-600', bg: 'bg-gray-500' }
    }
  }

  const status = getStatusDisplay()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Classroom</h1>
          {teacherName && (
            <p className="text-gray-600">Teacher: {teacherName}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status.bg} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            <span className={`text-sm ${status.color}`}>{status.text}</span>
          </div>

          <Button onClick={handleLeave} variant="outline" size="sm">
            Leave Class
          </Button>
        </div>
      </div>

      {/* Session error */}
      {sessionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">{sessionError}</p>
          <Button onClick={connect} variant="outline" size="sm" className="mt-2">
            Retry Connection
          </Button>
        </div>
      )}

      {/* Language selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                View subtitles in:
              </label>
              <LanguagePills
                value={viewingLanguage}
                onChange={setViewingLanguage}
                languages={SUPPORTED_LANGUAGES}
              />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('subtitle')}
                className={`px-3 py-1.5 text-sm rounded ${
                  viewMode === 'subtitle'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Subtitle View
              </button>
              <button
                onClick={() => setViewMode('transcript')}
                className={`px-3 py-1.5 text-sm rounded ${
                  viewMode === 'transcript'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Full Transcript
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content area */}
      {viewMode === 'subtitle' ? (
        <div className="space-y-4">
          {/* Subtitle overlay */}
          <SubtitleOverlay
            transcripts={transcripts}
            viewingLanguage={viewingLanguage}
            sourceLanguage={sourceLanguage}
            showOriginal={showOriginal}
            maxVisible={3}
            className="min-h-[200px]"
          />

          {/* Options */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600">
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={(e) => setShowOriginal(e.target.checked)}
                className="rounded"
              />
              Show original text
            </label>
            <span className="text-gray-500">
              {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Full Transcript</span>
              <span className="text-sm font-normal text-gray-500">
                Viewing in {getLanguageName(viewingLanguage)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TranscriptionDisplay
              transcripts={transcripts}
              viewingLanguage={viewingLanguage}
              showTimestamps
              highlightLatest
              className="max-h-[60vh]"
            />
          </CardContent>
        </Card>
      )}

      {/* Waiting state */}
      {isConnected && transcripts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
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
          <p className="text-lg">Waiting for teacher to start speaking...</p>
          <p className="text-sm mt-2">Subtitles will appear here automatically</p>
        </div>
      )}

      {/* Info card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">How it works</p>
              <p>As your teacher speaks, their words are automatically transcribed and translated into your selected language. You can switch languages anytime using the buttons above.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
