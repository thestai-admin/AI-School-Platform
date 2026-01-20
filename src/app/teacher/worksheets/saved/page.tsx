'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Worksheet {
  id: string
  title: string
  difficulty: string
  language: string
  createdAt: string
  questions: unknown[]
  subject: {
    id: string
    name: string
  }
}

export default function SavedWorksheetsPage() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchWorksheets()
  }, [])

  async function fetchWorksheets() {
    try {
      const response = await fetch('/api/worksheets')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch worksheets')
      }

      setWorksheets(data.worksheets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load worksheets')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this worksheet?')) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/worksheets/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete worksheet')
      }

      setWorksheets(worksheets.filter((w) => w.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete worksheet')
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-700'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700'
      case 'HARD':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div data-testid="page-teacher-worksheets-saved" className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Worksheets</h1>
          <p className="text-gray-600 mt-1">View and manage your saved worksheets</p>
        </div>
        <Link href="/teacher/worksheets">
          <Button>Create New Worksheet</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading worksheets...</p>
        </div>
      ) : worksheets.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700">No saved worksheets yet</p>
            <p className="text-gray-500 mt-1">Generate and save worksheets to see them here</p>
            <Link href="/teacher/worksheets" className="mt-4 inline-block">
              <Button>Create Your First Worksheet</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {worksheets.map((worksheet) => (
            <Card key={worksheet.id} variant="bordered">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{worksheet.title}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      <span>{worksheet.subject.name}</span>
                      <span>•</span>
                      <span>{Array.isArray(worksheet.questions) ? worksheet.questions.length : 0} questions</span>
                      <span>•</span>
                      <span>{formatDate(worksheet.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(worksheet.difficulty)}`}>
                      {worksheet.difficulty.toLowerCase()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(worksheet.id)}
                      disabled={deletingId === worksheet.id}
                    >
                      {deletingId === worksheet.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
