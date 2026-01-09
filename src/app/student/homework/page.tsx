'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface Homework {
  id: string
  title: string
  dueDate: string
  totalMarks: number
  difficulty: string
  subject: { name: string }
  teacher: { name: string }
  submission: {
    id: string
    status: string
    totalScore: number | null
    percentage: number | null
    submittedAt: string | null
  } | null
  displayStatus: string
  isOverdue: boolean
}

export default function StudentHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all')

  useEffect(() => {
    async function fetchHomework() {
      try {
        const res = await fetch('/api/homework')
        const data = await res.json()
        if (res.ok) {
          setHomework(data.homework || [])
        }
      } catch (error) {
        console.error('Error fetching homework:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHomework()
  }, [])

  const filteredHomework = homework.filter((hw) => {
    if (filter === 'all') return true
    if (filter === 'pending') return hw.displayStatus === 'pending' || hw.displayStatus === 'overdue'
    return hw.displayStatus === filter
  })

  const pendingCount = homework.filter(hw => hw.displayStatus === 'pending' || hw.displayStatus === 'overdue').length
  const submittedCount = homework.filter(hw => hw.displayStatus === 'submitted').length
  const gradedCount = homework.filter(hw => hw.displayStatus === 'graded').length

  const getStatusBadge = (hw: Homework) => {
    if (hw.displayStatus === 'graded') {
      const color = hw.submission?.percentage && hw.submission.percentage >= 60 ? 'green' : 'yellow'
      return (
        <span className={`px-2 py-1 text-xs font-medium bg-${color}-100 text-${color}-700 rounded-full`}>
          Graded - {Math.round(hw.submission?.percentage || 0)}%
        </span>
      )
    }
    if (hw.displayStatus === 'submitted') {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Submitted</span>
    }
    if (hw.isOverdue) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Overdue!</span>
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Pending</span>
  }

  const getDaysRemaining = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays} days left`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading homework...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Homework</h1>
        <p className="text-gray-600 mt-1">View and submit your assigned homework</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card variant="bordered" className={pendingCount > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${pendingCount > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
              {pendingCount}
            </p>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{submittedCount}</p>
            <p className="text-sm text-gray-500">Submitted</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{gradedCount}</p>
            <p className="text-sm text-gray-500">Graded</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'submitted', 'graded'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Homework List */}
      {filteredHomework.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No homework assigned yet' : `No ${filter} homework`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'Check back later for new assignments!' : 'Try changing the filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHomework.map((hw) => (
            <Link key={hw.id} href={`/student/homework/${hw.id}`}>
              <Card
                variant="bordered"
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  hw.isOverdue ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{hw.title}</h3>
                        {getStatusBadge(hw)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {hw.subject.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {hw.teacher.name}
                        </span>
                        <span>{hw.totalMarks} marks</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${hw.isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                        {getDaysRemaining(hw.dueDate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(hw.dueDate).toLocaleDateString()}
                      </p>
                      {hw.submission?.status === 'GRADED' && (
                        <p className={`text-lg font-bold mt-2 ${
                          (hw.submission.percentage || 0) >= 60 ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {hw.submission.totalScore}/{hw.totalMarks}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
