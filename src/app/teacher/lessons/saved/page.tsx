'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Lesson {
  id: string
  topic: string
  language: string
  date: string
  status: string
  createdAt: string
  subject: {
    id: string
    name: string
  }
}

export default function SavedLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchLessons()
  }, [])

  async function fetchLessons() {
    try {
      const response = await fetch('/api/lessons')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lessons')
      }

      setLessons(data.lessons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lessons')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/lessons/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete lesson')
      }

      setLessons(lessons.filter((l) => l.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lesson')
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Lessons</h1>
          <p className="text-gray-600 mt-1">View and manage your saved lesson plans</p>
        </div>
        <Link href="/teacher/lessons">
          <Button>Create New Lesson</Button>
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
          <p>Loading lessons...</p>
        </div>
      ) : lessons.length === 0 ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700">No saved lessons yet</p>
            <p className="text-gray-500 mt-1">Generate and save lesson plans to see them here</p>
            <Link href="/teacher/lessons" className="mt-4 inline-block">
              <Button>Create Your First Lesson</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} variant="bordered">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{lesson.topic}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      <span>{lesson.subject.name}</span>
                      <span>•</span>
                      <span>{formatDate(lesson.createdAt)}</span>
                      <span>•</span>
                      <span className="capitalize">{lesson.language.toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        lesson.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lesson.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(lesson.id)}
                      disabled={deletingId === lesson.id}
                    >
                      {deletingId === lesson.id ? 'Deleting...' : 'Delete'}
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
