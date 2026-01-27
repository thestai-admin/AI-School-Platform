'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DailyAnalytic {
  date: string
  totalStudyTime: number
  sessionsCount: number
  questionsAttempted: number
  questionsCorrect: number
  streakDays: number
}

interface SubjectStat {
  subject: string
  attempted: number
  correct: number
  accuracy: number
}

interface TopTopic {
  topic: string
  count: number
}

interface Analytics {
  summary: {
    totalStudyTime: number
    totalSessions: number
    totalQuestions: number
    totalCorrect: number
    avgAccuracy: number
    currentStreak: number
    peakStudyHour: number | null
    daysActive: number
  }
  dailyAnalytics: DailyAnalytic[]
  topTopics: TopTopic[]
  subjectStats: SubjectStat[]
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [days, setDays] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  async function fetchAnalytics() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/study/analytics?days=${days}`)
      if (res.status === 403) {
        const data = await res.json()
        setError(data.reason || 'Feature not available')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function formatHour(hour: number | null) {
    if (hour === null) return 'N/A'
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h = hour % 12 || 12
    return `${h} ${ampm}`
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <Link href="/student">
          <Button variant="primary">← Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-analytics">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Analytics</h1>
          <p className="text-gray-600 mt-1">Track your learning progress</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      ) : analytics ? (
        <>
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Study Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(analytics.summary.totalStudyTime / 60)}h
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    ⏱️
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Questions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.summary.totalQuestions}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    ✏️
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Accuracy</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.summary.avgAccuracy}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    🎯
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Streak</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.summary.currentStreak} 🔥
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    📅
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Activity Chart */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end justify-between gap-1">
                  {analytics.dailyAnalytics.slice(-14).map((day, i) => {
                    const maxTime = Math.max(
                      ...analytics.dailyAnalytics.map((d) => d.totalStudyTime),
                      1
                    )
                    const height = (day.totalStudyTime / maxTime) * 100
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${new Date(day.date).toLocaleDateString()}: ${day.totalStudyTime} min`}
                      />
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Last 14 days
                </p>
              </CardContent>
            </Card>

            {/* Subject Performance */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.subjectStats.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.subjectStats.map((stat) => (
                      <div key={stat.subject}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{stat.subject}</span>
                          <span className="text-gray-500">
                            {stat.accuracy}% ({stat.correct}/{stat.attempted})
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              stat.accuracy >= 70
                                ? 'bg-green-500'
                                : stat.accuracy >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${stat.accuracy}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No practice data yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Top Topics */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Most Studied Topics</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topTopics.length > 0 ? (
                  <ul className="space-y-2">
                    {analytics.topTopics.map((topic, i) => (
                      <li
                        key={topic.topic}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          <span className="text-sm">{topic.topic}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          {topic.count}x
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No topics studied yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Study Insights */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="font-medium text-gray-900">Peak Hour</p>
                      <p className="text-sm text-gray-500">
                        {formatHour(analytics.summary.peakStudyHour)}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">📚</span>
                    <div>
                      <p className="font-medium text-gray-900">Sessions</p>
                      <p className="text-sm text-gray-500">
                        {analytics.summary.totalSessions} total
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">✅</span>
                    <div>
                      <p className="font-medium text-gray-900">Days Active</p>
                      <p className="text-sm text-gray-500">
                        {analytics.summary.daysActive} / {days} days
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/student/companion" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    🤖 Start Study Session
                  </Button>
                </Link>
                <Link href="/student/competitive" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    📝 Practice Questions
                  </Button>
                </Link>
                <Link href="/student/learning-path" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    📈 View Learning Path
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No analytics data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
