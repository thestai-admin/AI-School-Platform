'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

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

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/admin/analytics')
        if (res.ok) {
          const data = await res.json()
          setAnalytics(data.analytics)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const stats = [
    {
      label: 'Total Teachers',
      value: loading ? '...' : String(analytics?.totalTeachers ?? 0),
      icon: '👩‍🏫',
      color: 'bg-blue-100 text-blue-600',
      href: '/admin/teachers'
    },
    {
      label: 'Total Students',
      value: loading ? '...' : String(analytics?.totalStudents ?? 0),
      icon: '👨‍🎓',
      color: 'bg-green-100 text-green-600',
      href: '/admin/students'
    },
    {
      label: 'Active Classes',
      value: loading ? '...' : String(analytics?.totalClasses ?? 0),
      icon: '🏫',
      color: 'bg-purple-100 text-purple-600',
      href: '/admin/classes'
    },
    {
      label: 'Lessons Generated',
      value: loading ? '...' : String(analytics?.totalLessons ?? 0),
      icon: '📚',
      color: 'bg-yellow-100 text-yellow-600',
      href: '/admin/analytics'
    },
  ]

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div data-testid="page-admin-dashboard">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {session?.user?.name?.split(' ')[0]}! Here&apos;s your school overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/teachers" className="block w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Add New Teacher</div>
                <div className="text-sm text-gray-600">Register a new teacher account</div>
              </Link>
              <Link href="/admin/students" className="block w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Add New Student</div>
                <div className="text-sm text-gray-600">Register a new student account</div>
              </Link>
              <Link href="/admin/classes" className="block w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Create New Class</div>
                <div className="text-sm text-gray-600">Set up a new class section</div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>Loading activity...</p>
              </div>
            ) : analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg">
                      {activity.type === 'lesson' ? '📚' : '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
                <p className="text-sm mt-1">Activity will appear here once users start using the platform</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Homework Stats */}
      {analytics && (analytics.homeworkStats.pending > 0 || analytics.homeworkStats.submitted > 0 || analytics.homeworkStats.graded > 0) && (
        <div className="mt-6">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Homework Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{analytics.homeworkStats.pending}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{analytics.homeworkStats.submitted}</p>
                  <p className="text-sm text-gray-600">Submitted</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{analytics.homeworkStats.graded}</p>
                  <p className="text-sm text-gray-600">Graded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
