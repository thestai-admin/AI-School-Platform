'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DiagramListItem } from '@/types/diagram'

const diagramTypeLabels: Record<string, string> = {
  FLOWCHART: 'Flowchart',
  DECISION_TREE: 'Decision Tree',
  CONCEPT_MAP: 'Concept Map',
  LESSON_FLOW: 'Lesson Flow',
}

const visibilityLabels: Record<string, { label: string; color: string }> = {
  PRIVATE: { label: 'Private', color: 'bg-gray-100 text-gray-600' },
  CLASS: { label: 'Class', color: 'bg-blue-100 text-blue-600' },
  SCHOOL: { label: 'School', color: 'bg-green-100 text-green-600' },
}

export default function StudentDiagramsPage() {
  const { data: session } = useSession()
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine'>('all')

  useEffect(() => {
    async function fetchDiagrams() {
      try {
        const response = await fetch('/api/diagrams')
        const data = await response.json()
        if (response.ok) {
          setDiagrams(data.diagrams || [])
        } else {
          setError(data.error || 'Failed to fetch diagrams')
        }
      } catch {
        setError('Failed to fetch diagrams')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDiagrams()
  }, [])

  const filteredDiagrams = filter === 'mine'
    ? diagrams.filter((d) => d.createdBy.id === session?.user?.id)
    : diagrams

  const myDiagrams = diagrams.filter((d) => d.createdBy.id === session?.user?.id)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this diagram?')) return

    try {
      const response = await fetch(`/api/diagrams/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setDiagrams(diagrams.filter((d) => d.id !== id))
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete diagram')
      }
    } catch {
      alert('Failed to delete diagram')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagrams</h1>
          <p className="text-gray-600 mt-1">
            View and create visual diagrams and flowcharts
          </p>
        </div>
        <Link
          href="/student/diagrams/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Diagram
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({diagrams.length})
        </button>
        <button
          onClick={() => setFilter('mine')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'mine'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          My Diagrams ({myDiagrams.length})
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading diagrams...</p>
        </div>
      ) : filteredDiagrams.length === 0 ? (
        /* Empty state */
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {filter === 'mine' ? 'No diagrams created yet' : 'No diagrams available'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'mine'
                ? 'Create your first diagram to get started.'
                : 'There are no diagrams shared with you yet.'}
            </p>
            <Link
              href="/student/diagrams/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Diagram
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Diagrams grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDiagrams.map((diagram) => {
            const isOwner = diagram.createdBy.id === session?.user?.id
            return (
              <Card
                key={diagram.id}
                variant="bordered"
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{diagram.title}</CardTitle>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        visibilityLabels[diagram.visibility]?.color
                      }`}
                    >
                      {visibilityLabels[diagram.visibility]?.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {diagram.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {diagram.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      {diagramTypeLabels[diagram.type]}
                    </span>
                    {!isOwner && (
                      <span>by {diagram.createdBy.name}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {new Date(diagram.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/student/diagrams/${diagram.id}`}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </Link>
                      {isOwner && (
                        <>
                          <Link
                            href={`/student/diagrams/${diagram.id}/edit`}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDelete(diagram.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
