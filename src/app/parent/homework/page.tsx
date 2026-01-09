'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Homework {
  id: string
  title: string
  dueDate: string
  totalMarks: number
  subject: { name: string }
  submission: {
    status: string
    totalScore: number | null
    percentage: number | null
    submittedAt: string | null
  } | null
}

interface ChildHomework {
  child: {
    id: string
    name: string
    class: string
  }
  homework: Homework[]
}

export default function ParentHomeworkPage() {
  const [childrenHomework, setChildrenHomework] = useState<ChildHomework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHomework() {
      try {
        const res = await fetch('/api/homework')
        const data = await res.json()
        if (res.ok) {
          setChildrenHomework(data.childrenHomework || [])
          if (data.childrenHomework?.length > 0) {
            setSelectedChild(data.childrenHomework[0].child.id)
          }
        }
      } catch (error) {
        console.error('Error fetching homework:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHomework()
  }, [])

  const selectedChildData = childrenHomework.find(ch => ch.child.id === selectedChild)

  const getStatusBadge = (hw: Homework) => {
    if (!hw.submission) {
      const isOverdue = new Date(hw.dueDate) < new Date()
      if (isOverdue) {
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Not Submitted (Overdue)</span>
      }
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Pending</span>
    }

    if (hw.submission.status === 'GRADED') {
      const color = hw.submission.percentage && hw.submission.percentage >= 60 ? 'green' : 'orange'
      return (
        <span className={`px-2 py-1 text-xs font-medium bg-${color}-100 text-${color}-700 rounded-full`}>
          Graded - {Math.round(hw.submission.percentage || 0)}%
        </span>
      )
    }

    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Submitted</span>
  }

  const calculateStats = (homework: Homework[]) => {
    const pending = homework.filter(hw => !hw.submission || hw.submission.status === 'PENDING').length
    const submitted = homework.filter(hw => hw.submission?.status === 'SUBMITTED').length
    const graded = homework.filter(hw => hw.submission?.status === 'GRADED')
    const avgScore = graded.length > 0
      ? graded.reduce((sum, hw) => sum + (hw.submission?.percentage || 0), 0) / graded.length
      : null

    return { pending, submitted, graded: graded.length, avgScore }
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

  if (childrenHomework.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Child&apos;s Homework</h1>
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v1" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No children linked</h3>
            <p className="text-gray-500">Contact your school administrator to link your child&apos;s account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = selectedChildData ? calculateStats(selectedChildData.homework) : null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Child&apos;s Homework</h1>

      {/* Child Selector (if multiple children) */}
      {childrenHomework.length > 1 && (
        <div className="flex gap-2 mb-6">
          {childrenHomework.map((ch) => (
            <button
              key={ch.child.id}
              onClick={() => setSelectedChild(ch.child.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChild === ch.child.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ch.child.name}
            </button>
          ))}
        </div>
      )}

      {selectedChildData && (
        <>
          {/* Child Info */}
          <Card variant="bordered" className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">
                    {selectedChildData.child.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedChildData.child.name}</h2>
                  <p className="text-sm text-gray-500">{selectedChildData.child.class}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card variant="bordered" className={stats.pending > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${stats.pending > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {stats.pending}
                  </p>
                  <p className="text-sm text-gray-500">Pending</p>
                </CardContent>
              </Card>
              <Card variant="bordered">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
                  <p className="text-sm text-gray-500">Submitted</p>
                </CardContent>
              </Card>
              <Card variant="bordered">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
                  <p className="text-sm text-gray-500">Graded</p>
                </CardContent>
              </Card>
              <Card variant="bordered">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${
                    stats.avgScore === null ? 'text-gray-400' :
                    stats.avgScore >= 60 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {stats.avgScore !== null ? `${Math.round(stats.avgScore)}%` : '-'}
                  </p>
                  <p className="text-sm text-gray-500">Avg Score</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Homework List */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Recent Homework</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedChildData.homework.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No homework assigned yet.
                </div>
              ) : (
                <div className="divide-y">
                  {selectedChildData.homework.map((hw) => (
                    <div key={hw.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-gray-900">{hw.title}</h3>
                            {getStatusBadge(hw)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{hw.subject.name}</span>
                            <span>Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                            <span>{hw.totalMarks} marks</span>
                          </div>
                        </div>
                        {hw.submission?.status === 'GRADED' && (
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              (hw.submission.percentage || 0) >= 60 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {hw.submission.totalScore}/{hw.totalMarks}
                            </p>
                            <p className="text-xs text-gray-500">
                              {Math.round(hw.submission.percentage || 0)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
