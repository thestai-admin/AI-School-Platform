'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Lesson {
  id: string
  topic: string
  createdAt: string
  subject: { name: string }
}

interface Worksheet {
  id: string
  title: string
  createdAt: string
  subject: { name: string }
}

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState({ lessons: 0, worksheets: 0 })
  const [recentLessons, setRecentLessons] = useState<Lesson[]>([])
  const [recentWorksheets, setRecentWorksheets] = useState<Worksheet[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [lessonsRes, worksheetsRes] = await Promise.all([
          fetch('/api/lessons?limit=3'),
          fetch('/api/worksheets?limit=3'),
        ])

        const lessonsData = await lessonsRes.json()
        const worksheetsData = await worksheetsRes.json()

        if (lessonsRes.ok) {
          setRecentLessons(lessonsData.lessons || [])
          setStats((prev) => ({ ...prev, lessons: lessonsData.lessons?.length || 0 }))
        }

        if (worksheetsRes.ok) {
          setRecentWorksheets(worksheetsData.worksheets || [])
          setStats((prev) => ({ ...prev, worksheets: worksheetsData.worksheets?.length || 0 }))
        }

        // Fetch total counts
        const [allLessonsRes, allWorksheetsRes] = await Promise.all([
          fetch('/api/lessons'),
          fetch('/api/worksheets'),
        ])

        const allLessons = await allLessonsRes.json()
        const allWorksheets = await allWorksheetsRes.json()

        setStats({
          lessons: allLessons.lessons?.length || 0,
          worksheets: allWorksheets.worksheets?.length || 0,
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const quickActions = [
    {
      title: 'Create Lesson Plan',
      description: 'Generate AI-powered lesson plans for your classes',
      href: '/teacher/lessons',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Generate Worksheet',
      description: 'Create practice worksheets for your students',
      href: '/teacher/worksheets',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'View Students',
      description: 'Check student progress and performance',
      href: '/teacher/students',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v1" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  return (
    <div data-testid="page-teacher-dashboard">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">Here&apos;s what you can do today</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lessons Created</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '-' : stats.lessons}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <Link href="/teacher/lessons/saved" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              View all lessons →
            </Link>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Worksheets Created</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '-' : stats.worksheets}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <Link href="/teacher/worksheets/saved" className="text-sm text-green-600 hover:underline mt-2 inline-block">
              View all worksheets →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${action.color}`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p>Loading...</p>
            </div>
          ) : recentLessons.length === 0 && recentWorksheets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No recent activity</p>
              <p className="text-sm mt-1">Start by creating your first lesson plan!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{lesson.topic}</p>
                    <p className="text-sm text-gray-500">{lesson.subject.name} • Lesson</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(lesson.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {recentWorksheets.map((worksheet) => (
                <div key={worksheet.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{worksheet.title}</p>
                    <p className="text-sm text-gray-500">{worksheet.subject.name} • Worksheet</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(worksheet.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
