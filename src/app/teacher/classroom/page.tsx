'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { LanguagePicker } from '@/components/bhashini/LanguagePicker'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

interface ClassOption {
  id: string
  name: string
  grade: number
}

interface SubjectOption {
  id: string
  name: string
}

interface Session {
  id: string
  status: 'ACTIVE' | 'PAUSED' | 'ENDED'
  startedAt: string
  class: { id: string; name: string; grade: number }
  subject: { id: string; name: string }
  _count: { participants: number; transcripts: number }
}

export default function TeacherClassroomPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState<BhashiniLanguageCode>('hi')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch classes and subjects
  useEffect(() => {
    async function fetchData() {
      try {
        const [classesRes, subjectsRes, sessionsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/subjects'),
          fetch('/api/classroom'),
        ])

        if (classesRes.ok) {
          const data = await classesRes.json()
          setClasses(data.classes || [])
        }

        if (subjectsRes.ok) {
          const data = await subjectsRes.json()
          setSubjects(data.subjects || [])
        }

        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          setRecentSessions(data.sessions || [])
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }

    fetchData()
  }, [])

  const handleStartSession = async () => {
    if (!selectedClass || !selectedSubject) {
      setError('Please select a class and subject')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          sourceLanguage,
          targetLanguages: sourceLanguage === 'hi' ? ['en'] : ['hi'],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409 && data.existingSessionId) {
          // Redirect to existing active session
          router.push(`/teacher/classroom/${data.existingSessionId}`)
          return
        }
        throw new Error(data.error || 'Failed to create session')
      }

      router.push(`/teacher/classroom/${data.session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResumeSession = (sessionId: string) => {
    router.push(`/teacher/classroom/${sessionId}`)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString))
  }

  const activeSession = recentSessions.find((s) => s.status === 'ACTIVE')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Live Classroom</h1>
      <p className="text-gray-600">
        Start a live session to enable real-time transcription and multilingual subtitles for your students.
      </p>

      {/* Active Session Banner */}
      {activeSession && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-2 text-green-700 font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Active Session
                </span>
                <p className="text-sm text-green-600 mt-1">
                  Class {activeSession.class.grade} {activeSession.class.name} - {activeSession.subject.name}
                </p>
              </div>
              <Button
                onClick={() => handleResumeSession(activeSession.id)}
                variant="primary"
              >
                Resume Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start New Session */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full"
                placeholder="Select a class"
                options={classes.map((c) => ({
                  value: c.id,
                  label: `Class ${c.grade} - ${c.name}`,
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <Select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full"
                placeholder="Select a subject"
                options={subjects.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
            </div>
          </div>

          <div>
            <LanguagePicker
              value={sourceLanguage}
              onChange={setSourceLanguage}
              label="Teaching Language"
              size="md"
            />
            <p className="text-sm text-gray-500 mt-1">
              The language you will be speaking in. Students can view subtitles in{' '}
              {sourceLanguage === 'hi' ? 'English' : 'Hindi'}.
            </p>
          </div>

          <Button
            onClick={handleStartSession}
            disabled={isLoading || !selectedClass || !selectedSubject}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {isLoading ? 'Starting...' : 'Start Live Session'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {recentSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Class {session.class.grade} {session.class.name} - {session.subject.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(session.startedAt)} | {session._count.transcripts} transcripts | {session._count.participants} students joined
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      session.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : session.status === 'PAUSED'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
