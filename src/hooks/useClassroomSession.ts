'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useClassroomStore, TranscriptEntry, SessionRole } from '@/stores/classroom-store'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

interface UseClassroomSessionOptions {
  sessionId: string
  role: SessionRole
  preferredLanguage?: BhashiniLanguageCode
  onTranscript?: (transcript: TranscriptEntry) => void
  onParticipantJoined?: (participant: { studentId: string; name: string }) => void
  onParticipantLeft?: (studentId: string) => void
  onError?: (error: Error) => void
  autoConnect?: boolean
}

interface UseClassroomSessionReturn {
  isConnected: boolean
  connectionStatus: string
  transcripts: TranscriptEntry[]
  currentTranscript: TranscriptEntry | undefined
  participantCount: number
  viewingLanguage: BhashiniLanguageCode
  connect: () => void
  disconnect: () => void
  setViewingLanguage: (language: BhashiniLanguageCode) => void
  sendTranscript: (text: string, language: BhashiniLanguageCode, confidence?: number) => Promise<void>
  error: string | null
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 1000

export function useClassroomSession(
  options: UseClassroomSessionOptions
): UseClassroomSessionReturn {
  const {
    sessionId,
    role,
    preferredLanguage = 'en',
    onTranscript,
    onParticipantJoined,
    onParticipantLeft,
    onError,
    autoConnect = true,
  } = options

  const store = useClassroomStore()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return
    }

    // Initialize session in store
    store.startSession({
      sessionId,
      role,
      targetLanguages: [preferredLanguage],
    })

    const sseUrl = `/api/realtime/classroom?sessionId=${sessionId}&role=${role}&language=${preferredLanguage}`

    try {
      eventSourceRef.current = new EventSource(sseUrl)

      eventSourceRef.current.onopen = () => {
        store.setConnectionStatus('connected')
        store.resetReconnectAttempts()
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'transcript': {
              const transcript: TranscriptEntry = {
                id: data.id,
                sequence: data.sequence,
                originalText: data.originalText,
                language: data.language,
                translations: data.translations || {},
                timestamp: new Date(data.timestamp),
                confidence: data.confidence,
              }
              store.addTranscript(transcript)
              onTranscript?.(transcript)
              break
            }

            case 'translation_update': {
              store.updateTranscript(data.transcriptId, {
                translations: {
                  ...store.transcripts.find((t) => t.id === data.transcriptId)?.translations,
                  [data.language]: data.translatedText,
                },
              })
              break
            }

            case 'participant_joined': {
              store.addParticipant({
                id: data.participantId,
                studentId: data.studentId,
                name: data.name,
                preferredLang: data.preferredLang,
                joinedAt: new Date(),
              })
              onParticipantJoined?.({ studentId: data.studentId, name: data.name })
              break
            }

            case 'participant_left': {
              store.removeParticipant(data.studentId)
              onParticipantLeft?.(data.studentId)
              break
            }

            case 'session_ended': {
              store.endSession()
              disconnect()
              break
            }

            case 'ping': {
              // Heartbeat, ignore
              break
            }
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error)
        }
      }

      eventSourceRef.current.onerror = () => {
        store.setConnectionStatus('error')

        // Close current connection
        eventSourceRef.current?.close()
        eventSourceRef.current = null

        // Attempt reconnect with exponential backoff
        const attempts = store.reconnectAttempts
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          store.incrementReconnectAttempts()
          store.setConnectionStatus('reconnecting')

          const delay = RECONNECT_BASE_DELAY * Math.pow(2, attempts)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          const error = new Error('Failed to connect after multiple attempts')
          store.setError(error.message)
          onError?.(error)
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to connect')
      store.setError(err.message)
      onError?.(err)
    }
  }, [
    sessionId,
    role,
    preferredLanguage,
    store,
    onTranscript,
    onParticipantJoined,
    onParticipantLeft,
    onError,
  ])

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    store.endSession()
  }, [store])

  // Send transcript to server (for teacher)
  const sendTranscript = useCallback(
    async (text: string, language: BhashiniLanguageCode, confidence?: number) => {
      if (role !== 'teacher') {
        throw new Error('Only teachers can send transcripts')
      }

      const response = await fetch(`/api/classroom/${sessionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          confidence,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send transcript')
      }
    },
    [sessionId, role]
  )

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  return {
    isConnected: store.connectionStatus === 'connected',
    connectionStatus: store.connectionStatus,
    transcripts: store.transcripts,
    currentTranscript: store.transcripts.find((t) => t.id === store.currentTranscriptId),
    participantCount: store.participants.length,
    viewingLanguage: store.viewingLanguage,
    connect,
    disconnect,
    setViewingLanguage: store.setViewingLanguage,
    sendTranscript,
    error: store.lastError,
  }
}
