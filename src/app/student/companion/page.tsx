'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useStudySessionStore } from '@/stores/studySessionStore'

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Hindi',
  'Social Studies',
  'Computer Science',
]

const EXAM_TYPES = [
  { value: '', label: 'School/General' },
  { value: 'JEE_MAIN', label: 'JEE Main' },
  { value: 'JEE_ADVANCED', label: 'JEE Advanced' },
  { value: 'NEET', label: 'NEET' },
  { value: 'OLYMPIAD', label: 'Olympiad' },
  { value: 'CBSE_BOARD', label: 'CBSE Board' },
]

const SESSION_TYPES = [
  { value: 'DOUBT_SOLVING', label: 'Ask Doubts', icon: '?' },
  { value: 'CONCEPT_LEARNING', label: 'Learn Concepts', icon: '📚' },
  { value: 'PRACTICE', label: 'Practice', icon: '✏️' },
  { value: 'REVISION', label: 'Revision', icon: '🔄' },
  { value: 'COMPETITIVE_PREP', label: 'Exam Prep', icon: '🎯' },
]

export default function StudyCompanionPage() {
  const { data: session } = useSession()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    sessionId,
    sessionType,
    subject,
    examType,
    messages,
    isActive,
    startedAt,
    isLoading,
    error,
    startSession,
    endSession,
    addMessage,
    setLoading,
    setError,
    saveSession,
    resetSession,
  } = useStudySessionStore()

  const [inputMessage, setInputMessage] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedExamType, setSelectedExamType] = useState('')
  const [selectedSessionType, setSelectedSessionType] = useState<
    'DOUBT_SOLVING' | 'CONCEPT_LEARNING' | 'PRACTICE' | 'REVISION' | 'COMPETITIVE_PREP'
  >('DOUBT_SOLVING')
  const [showSetup, setShowSetup] = useState(true)
  const [featureError, setFeatureError] = useState<string | null>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isActive && subject) {
      setShowSetup(false)
    }
  }, [isActive, subject])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleStartSession() {
    if (!selectedSubject) {
      setError('Please select a subject')
      return
    }

    startSession({
      type: selectedSessionType,
      subject: selectedSubject,
      examType: selectedExamType || undefined,
    })
    setShowSetup(false)

    // Save to backend
    try {
      const res = await fetch('/api/study/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedSessionType,
          subject: selectedSubject,
          examType: selectedExamType || undefined,
        }),
      })

      if (res.status === 403) {
        const data = await res.json()
        setFeatureError(data.reason || 'This feature is not available with your subscription')
        setShowSetup(true)
        resetSession()
        return
      }

      if (!res.ok) throw new Error('Failed to start session')

      const data = await res.json()
      // Session started successfully
    } catch (err) {
      console.error('Error starting session:', err)
    }
  }

  async function handleSendMessage() {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')

    addMessage({ role: 'user', content: userMessage })
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
          subject,
          examType,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get response')
      }

      const data = await res.json()
      addMessage({ role: 'assistant', content: data.response })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  async function handleEndSession() {
    if (!sessionId) return

    try {
      endSession()
      await saveSession()

      const res = await fetch(`/api/study/session/${sessionId}/end`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        // Show summary if available
        if (data.summary) {
          addMessage({
            role: 'system',
            content: `📊 **Session Summary**\n\n${JSON.stringify(data.summary, null, 2)}`,
          })
        }
      }
    } catch (err) {
      console.error('Error ending session:', err)
    }
  }

  function handleNewSession() {
    resetSession()
    setShowSetup(true)
    setSelectedSubject('')
    setSelectedExamType('')
    setFeatureError(null)
  }

  function formatDuration() {
    if (!startedAt) return '0 min'
    const mins = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
    return `${mins} min`
  }

  if (featureError) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto mb-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Feature Not Available</h2>
        <p className="text-gray-600 mb-4">{featureError}</p>
        <Link href="/student">
          <Button variant="primary">← Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-study-companion" className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            24/7 AI Study Companion
          </h1>
          <p className="text-gray-600">
            {isActive
              ? `${subject} • ${formatDuration()} session`
              : 'Your personal AI tutor - available anytime'}
          </p>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEndSession}>
              End Session
            </Button>
            <Button variant="outline" onClick={handleNewSession}>
              New Session
            </Button>
          </div>
        )}
      </div>

      {/* Setup Screen */}
      {showSetup ? (
        <Card variant="bordered" className="max-w-2xl mx-auto w-full">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                🤖
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Start a Study Session
              </h2>
              <p className="text-gray-600 mt-2">
                I&apos;m here to help you learn - even at midnight!
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Session Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What do you want to do?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SESSION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedSessionType(type.value as typeof selectedSessionType)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      selectedSessionType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl block mb-1">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <Select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                placeholder="Select a subject"
                options={SUBJECTS.map((sub) => ({ value: sub, label: sub }))}
              />
            </div>

            {/* Exam Type (optional) */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preparing for (optional)
              </label>
              <Select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                options={EXAM_TYPES}
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartSession}
            >
              Start Learning
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Chat Interface */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  🤖
                </div>
                <p className="text-gray-600">
                  Hi {session?.user?.name?.split(' ')[0]}! I&apos;m ready to help you with {subject}.
                  <br />
                  What would you like to learn today?
                </p>
                {examType && (
                  <p className="text-sm text-blue-600 mt-2">
                    Mode: {EXAM_TYPES.find((e) => e.value === examType)?.label} Preparation
                  </p>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : msg.role === 'system'
                      ? 'bg-gray-100 text-gray-700 rounded-bl-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <span className="text-xs text-gray-500 block mb-1">AI Tutor</span>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <span className="text-xs opacity-60 mt-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4 bg-white">
            {error && (
              <div className="mb-2 p-2 bg-red-50 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex gap-2"
            >
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  sessionType === 'DOUBT_SOLVING'
                    ? 'Ask your doubt...'
                    : sessionType === 'PRACTICE'
                    ? 'Ready for a practice problem?'
                    : 'Type your message...'
                }
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!inputMessage.trim() || isLoading}
              >
                Send
              </Button>
            </form>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setInputMessage('Explain this concept step by step')}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Explain step by step
              </button>
              <button
                onClick={() => setInputMessage('Give me a practice problem')}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Practice problem
              </button>
              <button
                onClick={() => setInputMessage('What are common mistakes here?')}
                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Common mistakes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
