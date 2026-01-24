'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Worksheet {
  id: string
  title: string
  difficulty: string
  language: string
  createdAt: string
  subject: {
    name: string
  }
  createdBy: {
    name: string
  }
  response: {
    id: string
    score: number
    completedAt: string
  } | null
  isCompleted: boolean
}

export default function StudentWorksheetsPage() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('')

  useEffect(() => {
    async function fetchWorksheets() {
      try {
        const params = new URLSearchParams()
        if (filterSubject) params.set('subjectId', filterSubject)
        if (filterDifficulty) params.set('difficulty', filterDifficulty)

        const response = await fetch(`/api/worksheets?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch worksheets')
        }
        const data = await response.json()
        setWorksheets(data.worksheets || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchWorksheets()
  }, [filterSubject, filterDifficulty])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toUpperCase()) {
      case 'EASY':
        return 'bg-green-100 text-green-700'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700'
      case 'HARD':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card variant="bordered" className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Error loading worksheets: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedCount = worksheets.filter(w => w.isCompleted).length
  const pendingCount = worksheets.length - completedCount

  return (
    <div data-testid="page-student-worksheets" className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Practice Worksheets</h1>
        <p className="text-gray-600 mt-1">
          Complete worksheets to practice and improve your skills
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{worksheets.length}</div>
            <div className="text-sm text-gray-600">Total Worksheets</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Worksheets List */}
      {worksheets.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No worksheets available</p>
            <p className="text-sm mt-1">Your teacher hasn&apos;t assigned any worksheets yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {worksheets.map((worksheet) => (
            <Card key={worksheet.id} variant="bordered" className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{worksheet.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{worksheet.subject.name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(worksheet.difficulty)}`}>
                    {worksheet.difficulty}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>By: {worksheet.createdBy.name}</p>
                    <p>Language: {worksheet.language}</p>
                  </div>

                  {worksheet.isCompleted && worksheet.response ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-700">Completed</span>
                        <span className="text-lg font-bold text-green-700">
                          {Math.round(worksheet.response.score)}%
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <Link href={`/student/worksheets/${worksheet.id}`}>
                    <Button
                      variant={worksheet.isCompleted ? 'outline' : 'primary'}
                      size="md"
                      className="w-full"
                    >
                      {worksheet.isCompleted ? 'View Results' : 'Start Worksheet'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
