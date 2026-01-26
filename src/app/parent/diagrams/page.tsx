'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DiagramListItem } from '@/types/diagram'

const diagramTypeLabels: Record<string, string> = {
  FLOWCHART: 'Flowchart',
  DECISION_TREE: 'Decision Tree',
  CONCEPT_MAP: 'Concept Map',
  LESSON_FLOW: 'Lesson Flow',
}

export default function ParentDiagramsPage() {
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">School Diagrams</h1>
        <p className="text-gray-600 mt-1">
          View diagrams shared by teachers and the school
        </p>
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
      ) : diagrams.length === 0 ? (
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
              No diagrams available
            </h3>
            <p className="text-gray-500">
              There are no school-wide diagrams shared yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Diagrams grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diagrams.map((diagram) => (
            <Card
              key={diagram.id}
              variant="bordered"
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{diagram.title}</CardTitle>
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
                  <span>by {diagram.createdBy.name}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {new Date(diagram.updatedAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/parent/diagrams/${diagram.id}`}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View
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
