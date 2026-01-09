'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Homework {
  id: string
  title: string
  dueDate: string
  totalMarks: number
  difficulty: string
  class: { name: string; grade: number }
  subject: { name: string }
  stats: {
    totalStudents: number
    submittedCount: number
    gradedCount: number
    pendingCount: number
  }
}

export default function TeacherHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all')

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

  const now = new Date()
  const filteredHomework = homework.filter((hw) => {
    const dueDate = new Date(hw.dueDate)
    if (filter === 'active') return dueDate >= now
    if (filter === 'past') return dueDate < now
    return true
  })

  const getStatusBadge = (hw: Homework) => {
    const dueDate = new Date(hw.dueDate)
    const isPast = dueDate < now

    if (isPast && hw.stats.pendingCount > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Overdue</span>
    }
    if (hw.stats.gradedCount === hw.stats.totalStudents) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Completed</span>
    }
    if (hw.stats.submittedCount > 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>
    }
    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Active</span>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework Management</h1>
          <p className="text-gray-600 mt-1">Assign homework and track student submissions</p>
        </div>
        <Link href="/teacher/homework/create">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign Homework
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Assigned</p>
            <p className="text-2xl font-bold">{homework.length}</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-blue-600">
              {homework.filter(hw => new Date(hw.dueDate) >= now).length}
            </p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">
              {homework.reduce((sum, hw) => sum + (hw.stats.submittedCount - hw.stats.gradedCount), 0)}
            </p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {homework.filter(hw => hw.stats.gradedCount === hw.stats.totalStudents && hw.stats.totalStudents > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'past'] as const).map((f) => (
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
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading homework...</p>
        </div>
      ) : filteredHomework.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No homework found</h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all'
                ? 'Start by assigning your first homework!'
                : `No ${filter} homework assignments.`}
            </p>
            <Link href="/teacher/homework/create">
              <Button>Assign Homework</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHomework.map((hw) => (
            <Link key={hw.id} href={`/teacher/homework/${hw.id}`}>
              <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {hw.class.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {hw.subject.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Due: {new Date(hw.dueDate).toLocaleDateString()}
                        </span>
                        <span>{hw.totalMarks} marks</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{hw.stats.submittedCount}</p>
                          <p className="text-xs text-gray-500">Submitted</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{hw.stats.totalStudents}</p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-32 h-2 bg-gray-200 rounded-full mt-2">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(hw.stats.submittedCount / hw.stats.totalStudents) * 100}%` }}
                        />
                      </div>
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
