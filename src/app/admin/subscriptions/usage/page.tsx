'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UsageData {
  byFeature: Record<string, { total: number; daily: number[] }>
  daily: Record<string, number>
  totalRequests: number
}

interface Subscription {
  tier: string
  maxStudents: number
  maxTeachers: number
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [days, setDays] = useState(30)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [days])

  async function fetchUsage() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/subscription/usage?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setUsage(data.usage)
        setSubscription(data.subscription)
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const featureNames: Record<string, string> = {
    ai_lesson_planning: 'AI Lesson Planning',
    ai_worksheet_generation: 'AI Worksheet Generation',
    ai_homework_grading: 'AI Homework Grading',
    student_chatbot: 'Student AI Chatbot',
    ai_study_companion_24x7: '24/7 AI Study Companion',
    competitive_exam_prep: 'Competitive Exam Prep',
    personalized_learning_paths: 'Learning Paths',
    practice_question_generation: 'Practice Questions',
    advanced_analytics: 'Advanced Analytics',
  }

  // Get sorted daily data
  const sortedDays = usage?.daily
    ? Object.entries(usage.daily)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14) // Last 14 days
    : []

  const maxDailyUsage = Math.max(...sortedDays.map(([, v]) => v), 1)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/subscriptions" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Subscription
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-gray-600 mt-1">Track feature usage across your school</p>
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
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading usage data...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {usage?.totalRequests?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500">Total Requests</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {Object.keys(usage?.byFeature || {}).length}
                </p>
                <p className="text-sm text-gray-500">Active Features</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {Math.round((usage?.totalRequests || 0) / days)}
                </p>
                <p className="text-sm text-gray-500">Avg. Daily Requests</p>
              </CardContent>
            </Card>
            <Card variant="bordered">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {subscription?.tier || 'N/A'}
                </p>
                <p className="text-sm text-gray-500">Current Tier</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Activity Chart */}
          <Card variant="bordered" className="mb-8">
            <CardHeader>
              <CardTitle>Daily Activity (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedDays.length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-1">
                  {sortedDays.map(([date, count]) => {
                    const height = (count / maxDailyUsage) * 100
                    const dateObj = new Date(date)
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${dateObj.toLocaleDateString()}: ${count} requests`}
                        />
                        <span className="text-xs text-gray-400 mt-1">
                          {dateObj.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No activity data available</p>
              )}
            </CardContent>
          </Card>

          {/* Feature Breakdown */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Feature Usage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {usage?.byFeature && Object.keys(usage.byFeature).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(usage.byFeature)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([feature, data]) => {
                      const maxTotal = Math.max(
                        ...Object.values(usage.byFeature).map((d) => d.total),
                        1
                      )
                      const percentage = (data.total / maxTotal) * 100
                      return (
                        <div key={feature}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900">
                              {featureNames[feature] || feature}
                            </span>
                            <span className="text-gray-500">
                              {data.total.toLocaleString()} requests
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No feature usage recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
