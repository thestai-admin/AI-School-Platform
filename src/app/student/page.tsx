'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentDashboard() {
  const { data: session } = useSession()

  const quickActions = [
    {
      title: 'Ask a Doubt',
      description: 'Chat with AI tutor in Hindi or English',
      href: '/student/chat',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Practice Worksheets',
      description: 'Solve practice problems and get instant feedback',
      href: '/student/worksheets',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'My Progress',
      description: 'View your learning progress and achievements',
      href: '/student/progress',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  return (
    <div data-testid="page-student-dashboard">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {session?.user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">Ready to learn something new today?</p>
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

      {/* Study Tips */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Study Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <span className="text-2xl">1</span>
              <div>
                <h4 className="font-medium text-gray-900">Ask Questions</h4>
                <p className="text-sm text-gray-600">Don&apos;t hesitate to ask the AI tutor any doubt you have</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <span className="text-2xl">2</span>
              <div>
                <h4 className="font-medium text-gray-900">Practice Daily</h4>
                <p className="text-sm text-gray-600">Solve at least 5 problems every day</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <span className="text-2xl">3</span>
              <div>
                <h4 className="font-medium text-gray-900">Review Mistakes</h4>
                <p className="text-sm text-gray-600">Learn from wrong answers to improve</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <span className="text-2xl">4</span>
              <div>
                <h4 className="font-medium text-gray-900">Track Progress</h4>
                <p className="text-sm text-gray-600">Check your progress regularly</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
