'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AudioRecorder, AudioRecorderRef } from '@/components/bhashini/AudioRecorder'
import { TranscriptionDisplay } from '@/components/bhashini/TranscriptionDisplay'
import { LanguagePills } from '@/components/bhashini/LanguagePicker'
import { useClassroomSession } from '@/hooks/useClassroomSession'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'
import { getLanguageName } from '@/lib/bhashini/languages'

interface SessionInfo {
  id: string
  status: 'ACTIVE' | 'PAUSED' | 'ENDED'
  sourceLanguage: BhashiniLanguageCode
  targetLanguages: BhashiniLanguageCode[]
  startedAt: string
  class: { id: string; name: string; grade: number }
  subject: { id: string; name: string }
}

export default function TeacherClassroomSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isEnding, setIsEnding] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const audioRecorderRef = useRef<AudioRecorderRef>(null)

  // Connect to classroom session SSE
  const {
    isConnected,
    connectionStatus,
    transcripts,
    participantCount,
    viewingLanguage,
    setViewingLanguage,
    sendTranscript,
    error: sessionError,
  } = useClassroomSession({
    sessionId,
    role: 'teacher',
    autoConnect: true,
    onError: (err) => console.error('Session error:', err),
  })

  // Fetch session info
  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/classroom?status=ACTIVE`)
        if (response.ok) {
          const data = await response.json()
          const session = data.sessions?.find((s: SessionInfo) => s.id === sessionId)
          if (session) {
            setSessionInfo(session)
          }
        }
      } catch (err) {
        console.error('Failed to fetch session:', err)
      }
    }

    fetchSession()
  }, [sessionId])

  // Handle new transcript from ASR
  const handleTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        try {
          await sendTranscript(text, sessionInfo?.sourceLanguage || 'hi')
        } catch (err) {
          console.error('Failed to send transcript:', err)
        }
      }
    },
    [sendTranscript, sessionInfo?.sourceLanguage]
  )

  // Pause session
  const handlePause = async () => {
    setIsPausing(true)
    try {
      audioRecorderRef.current?.stop()

      const response = await fetch('/api/classroom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'pause' }),
      })

      if (response.ok) {
        setSessionInfo((prev) => prev ? { ...prev, status: 'PAUSED' } : null)
      }
    } catch (err) {
      console.error('Failed to pause session:', err)
    } finally {
      setIsPausing(false)
    }
  }

  // Resume session
  const handleResume = async () => {
    try {
      const response = await fetch('/api/classroom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'resume' }),
      })

      if (response.ok) {
        setSessionInfo((prev) => prev ? { ...prev, status: 'ACTIVE' } : null)
      }
    } catch (err) {
      console.error('Failed to resume session:', err)
    }
  }

  // End session
  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this session?')) return

    setIsEnding(true)
    try {
      audioRecorderRef.current?.stop()

      const response = await fetch('/api/classroom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'end' }),
      })

      if (response.ok) {
        router.push('/teacher/classroom')
      }
    } catch (err) {
      console.error('Failed to end session:', err)
    } finally {
      setIsEnding(false)
    }
  }

  // Copy join link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/student/classroom/${sessionId}`
    navigator.clipboard.writeText(link)
    alert('Join link copied to clipboard!')
  }

  const isActive = sessionInfo?.status === 'ACTIVE'

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Session</h1>
          {sessionInfo && (
            <p className="text-gray-600 mt-1">
              Class {sessionInfo.class.grade} {sessionInfo.class.name} - {sessionInfo.subject.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : connectionStatus}
            </span>
          </div>

          {/* Participant count */}
          <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {participantCount} students
          </div>
        </div>
      </div>

      {/* Session error */}
      {sessionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {sessionError}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Recording */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recording</span>
                <span className="text-sm font-normal text-gray-500">
                  Speaking in {getLanguageName(sessionInfo?.sourceLanguage || 'hi')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AudioRecorder
                ref={audioRecorderRef}
                language={sessionInfo?.sourceLanguage || 'hi'}
                onTranscript={handleTranscript}
                showControls={isActive}
              />

              {!isActive && sessionInfo?.status === 'PAUSED' && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">Session is paused</p>
                  <Button onClick={handleResume} variant="primary">
                    Resume Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcripts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transcripts ({transcripts.length})</span>
                <LanguagePills
                  value={viewingLanguage}
                  onChange={setViewingLanguage}
                  className="text-sm"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptionDisplay
                transcripts={transcripts}
                viewingLanguage={viewingLanguage}
                showTimestamps
                showConfidence
                className="max-h-96"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Controls */}
        <div className="space-y-4">
          {/* Session Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Session Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Join Link
              </Button>

              {isActive ? (
                <Button
                  onClick={handlePause}
                  disabled={isPausing}
                  variant="secondary"
                  className="w-full"
                >
                  {isPausing ? 'Pausing...' : 'Pause Session'}
                </Button>
              ) : sessionInfo?.status === 'PAUSED' ? (
                <Button
                  onClick={handleResume}
                  variant="primary"
                  className="w-full"
                >
                  Resume Session
                </Button>
              ) : null}

              <Button
                onClick={handleEnd}
                disabled={isEnding}
                variant="danger"
                className="w-full"
              >
                {isEnding ? 'Ending...' : 'End Session'}
              </Button>
            </CardContent>
          </Card>

          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${
                  sessionInfo?.status === 'ACTIVE' ? 'text-green-600' :
                  sessionInfo?.status === 'PAUSED' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {sessionInfo?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Started</span>
                <span className="text-gray-900">
                  {sessionInfo?.startedAt
                    ? new Date(sessionInfo.startedAt).toLocaleTimeString()
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source Language</span>
                <span className="text-gray-900">
                  {getLanguageName(sessionInfo?.sourceLanguage || 'hi')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target Languages</span>
                <span className="text-gray-900">
                  {sessionInfo?.targetLanguages?.map(getLanguageName).join(', ') || '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>• Speak clearly at a moderate pace</p>
              <p>• Avoid background noise</p>
              <p>• Transcripts are automatically translated for students</p>
              <p>• Share the join link with your students</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
