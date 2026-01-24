'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProgressData {
  overallStats: {
    questionsAnswered: number
    averageScore: number
    worksheetsDone: number
    doubtsCleared: number
  }
  subjectProgress: Array<{
    subjectId: string
    subjectName: string
    progress: number
    topicsCompleted: number
    averageScore: number
    strengths: string[]
    weaknesses: string[]
    homeworkCount: number
  }>
}

const subjectColors: Record<string, string> = {
  Mathematics: 'bg-blue-500',
  Science: 'bg-green-500',
  English: 'bg-purple-500',
  Hindi: 'bg-yellow-500',
  'Social Science': 'bg-pink-500',
  History: 'bg-red-500',
  Geography: 'bg-teal-500',
  Physics: 'bg-indigo-500',
  Chemistry: 'bg-cyan-500',
  Biology: 'bg-lime-500',
}

export default function StudentProgressPage() {
  const { data: session } = useSession()
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch('/api/student/progress')
        if (!response.ok) {
          throw new Error('Failed to fetch progress data')
        }
        const data = await response.json()
        setProgressData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card variant="bordered" className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Error loading progress: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = progressData?.overallStats || {
    questionsAnswered: 0,
    averageScore: 0,
    worksheetsDone: 0,
    doubtsCleared: 0,
  }

  const subjects = progressData?.subjectProgress || []

  return (
    <div data-testid="page-student-progress" className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-600 mt-1">
          Track your learning journey, {session?.user?.name?.split(' ')[0]}!
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.questionsAnswered}</div>
            <div className="text-xs text-gray-600">Questions Answered</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.averageScore}%</div>
            <div className="text-xs text-gray-600">Average Score</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.worksheetsDone}</div>
            <div className="text-xs text-gray-600">Worksheets Done</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.doubtsCleared}</div>
            <div className="text-xs text-gray-600">Doubts Cleared</div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Progress */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle>Subject Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No progress data yet. Start completing homework to see your progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject) => {
                const color = subjectColors[subject.subjectName] || 'bg-gray-500'
                return (
                  <div key={subject.subjectId}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{subject.subjectName}</span>
                      <span className="text-sm text-gray-500">{subject.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(subject.progress, 100)}%` }}
                      />
                    </div>
                    {subject.homeworkCount > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {subject.homeworkCount} homework{subject.homeworkCount !== 1 ? 's' : ''} completed
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium">No activity yet</p>
            <p className="text-sm mt-1">Start solving worksheets and chatting with AI tutor to track your progress!</p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card variant="bordered" className="mt-8">
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: 'First Steps', icon: '🎯', locked: true },
              { name: 'Quick Learner', icon: '🚀', locked: true },
              { name: 'Problem Solver', icon: '🧩', locked: true },
              { name: 'Star Student', icon: '⭐', locked: true },
            ].map((achievement) => (
              <div
                key={achievement.name}
                className={`p-4 rounded-lg text-center ${
                  achievement.locked ? 'bg-gray-100 opacity-50' : 'bg-yellow-50'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className="text-xs font-medium text-gray-700">{achievement.name}</div>
                {achievement.locked && (
                  <div className="text-xs text-gray-500 mt-1">Locked</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
