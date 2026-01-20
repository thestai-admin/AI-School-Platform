'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminDashboard() {
  const { data: session } = useSession()

  const stats = [
    { label: 'Total Teachers', value: '0', icon: '👩‍🏫', color: 'bg-blue-100 text-blue-600' },
    { label: 'Total Students', value: '0', icon: '👨‍🎓', color: 'bg-green-100 text-green-600' },
    { label: 'Active Classes', value: '0', icon: '🏫', color: 'bg-purple-100 text-purple-600' },
    { label: 'Lessons Generated', value: '0', icon: '📚', color: 'bg-yellow-100 text-yellow-600' },
  ]

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
          <Card key={stat.label} variant="bordered">
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
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Add New Teacher</div>
                <div className="text-sm text-gray-600">Register a new teacher account</div>
              </button>
              <button className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Add New Student</div>
                <div className="text-sm text-gray-600">Register a new student account</div>
              </button>
              <button className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Create New Class</div>
                <div className="text-sm text-gray-600">Set up a new class section</div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity</p>
              <p className="text-sm mt-1">Activity will appear here once users start using the platform</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
