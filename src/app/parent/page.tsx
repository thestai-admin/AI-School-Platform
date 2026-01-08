'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ParentDashboard() {
  const { data: session } = useSession()

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session?.user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">
          Track your child&apos;s learning progress
        </p>
      </div>

      {/* Child Info */}
      <Card variant="bordered" className="mb-6">
        <CardHeader>
          <CardTitle>Child&apos;s Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v1" />
            </svg>
            <p className="text-lg font-medium">No child linked</p>
            <p className="text-sm mt-1">Contact the school admin to link your child&apos;s account</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card variant="bordered">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">--</div>
            <div className="text-sm text-gray-600 mt-1">Subjects</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">--</div>
            <div className="text-sm text-gray-600 mt-1">Worksheets Completed</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">--</div>
            <div className="text-sm text-gray-600 mt-1">Average Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
            <p className="text-sm mt-1">Your child&apos;s activities will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
