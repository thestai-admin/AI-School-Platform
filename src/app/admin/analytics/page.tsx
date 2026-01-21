'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Analytics {
  totalTeachers: number
  totalStudents: number
  totalClasses: number
  totalLessons: number
  totalWorksheets: number
  totalHomework: number
  homeworkStats: {
    pending: number
    submitted: number
    graded: number
  }
  recentActivity: {
    type: string
    description: string
    timestamp: string
  }[]
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/admin/analytics')
        const data = await res.json()
        if (res.ok) {
          setAnalytics(data.analytics)
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div data-testid="page-admin-analytics">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">School Analytics</h1>
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Unable to load analytics data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="page-admin-analytics">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">School Analytics</h1>
        <p className="text-gray-600">Overview of your school&apos;s performance and activity</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{analytics.totalTeachers}</p>
            <p className="text-sm text-gray-500">Teachers</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{analytics.totalStudents}</p>
            <p className="text-sm text-gray-500">Students</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{analytics.totalClasses}</p>
            <p className="text-sm text-gray-500">Classes</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{analytics.totalLessons}</p>
            <p className="text-sm text-gray-500">Lessons</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-pink-600">{analytics.totalWorksheets}</p>
            <p className="text-sm text-gray-500">Worksheets</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-cyan-600">{analytics.totalHomework}</p>
            <p className="text-sm text-gray-500">Homework</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Homework Status */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Homework Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-gray-700">Pending</span>
                </div>
                <span className="font-semibold text-yellow-600">{analytics.homeworkStats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-gray-700">Submitted</span>
                </div>
                <span className="font-semibold text-blue-600">{analytics.homeworkStats.submitted}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-gray-700">Graded</span>
                </div>
                <span className="font-semibold text-green-600">{analytics.homeworkStats.graded}</span>
              </div>
            </div>

            {/* Progress bar */}
            {(analytics.homeworkStats.pending + analytics.homeworkStats.submitted + analytics.homeworkStats.graded) > 0 && (
              <div className="mt-6">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-yellow-500"
                    style={{
                      width: `${(analytics.homeworkStats.pending / (analytics.homeworkStats.pending + analytics.homeworkStats.submitted + analytics.homeworkStats.graded)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-blue-500"
                    style={{
                      width: `${(analytics.homeworkStats.submitted / (analytics.homeworkStats.pending + analytics.homeworkStats.submitted + analytics.homeworkStats.graded)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${(analytics.homeworkStats.graded / (analytics.homeworkStats.pending + analytics.homeworkStats.submitted + analytics.homeworkStats.graded)) * 100}%`,
                    }}
                  />
                </div>
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
            {analytics.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here once users start using the platform.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'lesson' ? 'bg-orange-100 text-orange-600' :
                      activity.type === 'homework' ? 'bg-cyan-100 text-cyan-600' :
                      activity.type === 'worksheet' ? 'bg-pink-100 text-pink-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'lesson' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                      {activity.type === 'homework' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
