'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function StudentClassroomPage() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessionCode.trim()) {
      setError('Please enter a session code')
      return
    }

    setIsLoading(true)
    setError('')

    // Extract session ID from full URL or just use the code directly
    let sessionId = sessionCode.trim()
    if (sessionCode.includes('/classroom/')) {
      const match = sessionCode.match(/\/classroom\/([a-zA-Z0-9]+)/)
      if (match) {
        sessionId = match[1]
      }
    }

    // Navigate to the session page
    router.push(`/student/classroom/${sessionId}`)
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Live Class</h1>
      <p className="text-gray-600 mb-6">
        Enter the session code or link shared by your teacher to join the live classroom.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Join Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-1">
                Session Code or Link
              </label>
              <Input
                id="sessionCode"
                type="text"
                placeholder="e.g., abc123 or full URL"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your teacher will share this code or link with you
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !sessionCode.trim()}
              variant="primary"
              className="w-full"
            >
              {isLoading ? 'Joining...' : 'Join Class'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
              1
            </div>
            <p className="text-gray-600 text-sm">
              Your teacher starts a live session and shares the join code
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
              2
            </div>
            <p className="text-gray-600 text-sm">
              Enter the code above and join the session
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
              3
            </div>
            <p className="text-gray-600 text-sm">
              See live subtitles in your preferred language as the teacher speaks
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
