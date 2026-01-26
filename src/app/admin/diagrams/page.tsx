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

const visibilityLabels: Record<string, { label: string; color: string }> = {
  PRIVATE: { label: 'Private', color: 'bg-gray-100 text-gray-600' },
  CLASS: { label: 'Class', color: 'bg-blue-100 text-blue-600' },
  SCHOOL: { label: 'School', color: 'bg-green-100 text-green-600' },
}

export default function AdminDiagramsPage() {
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterVisibility, setFilterVisibility] = useState<string>('all')

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

  const filteredDiagrams = diagrams.filter((d) => {
    if (filterType !== 'all' && d.type !== filterType) return false
    if (filterVisibility !== 'all' && d.visibility !== filterVisibility) return false
    return true
  })

  // Stats
  const stats = {
    total: diagrams.length,
    byType: {
      FLOWCHART: diagrams.filter((d) => d.type === 'FLOWCHART').length,
      DECISION_TREE: diagrams.filter((d) => d.type === 'DECISION_TREE').length,
      CONCEPT_MAP: diagrams.filter((d) => d.type === 'CONCEPT_MAP').length,
      LESSON_FLOW: diagrams.filter((d) => d.type === 'LESSON_FLOW').length,
    },
    byVisibility: {
      PRIVATE: diagrams.filter((d) => d.visibility === 'PRIVATE').length,
      CLASS: diagrams.filter((d) => d.visibility === 'CLASS').length,
      SCHOOL: diagrams.filter((d) => d.visibility === 'SCHOOL').length,
    },
  }

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Diagrams Management</h1>
        <p className="text-gray-600 mt-1">
          View and manage all diagrams in your school
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Diagrams</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-blue-600">
              {stats.byType.FLOWCHART}
            </div>
            <div className="text-sm text-gray-500">Flowcharts</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600">
              {stats.byVisibility.SCHOOL}
            </div>
            <div className="text-sm text-gray-500">School-wide Shared</div>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-purple-600">
              {stats.byType.CONCEPT_MAP}
            </div>
            <div className="text-sm text-gray-500">Concept Maps</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="FLOWCHART">Flowchart</option>
            <option value="DECISION_TREE">Decision Tree</option>
            <option value="CONCEPT_MAP">Concept Map</option>
            <option value="LESSON_FLOW">Lesson Flow</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Visibility</option>
            <option value="PRIVATE">Private</option>
            <option value="CLASS">Class</option>
            <option value="SCHOOL">School</option>
          </select>
        </div>
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
              No diagrams found
            </h3>
            <p className="text-gray-500">
              {diagrams.length > 0
                ? 'No diagrams match the current filters.'
                : 'No diagrams have been created yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Diagrams table */
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>All Diagrams ({filteredDiagrams.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Visibility
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Created By
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Updated
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDiagrams.map((diagram) => (
                    <tr key={diagram.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {diagram.title}
                        </div>
                        {diagram.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {diagram.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                          {diagramTypeLabels[diagram.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            visibilityLabels[diagram.visibility]?.color
                          }`}
                        >
                          {visibilityLabels[diagram.visibility]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {diagram.createdBy.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {diagram.class
                          ? `${diagram.class.grade} - ${diagram.class.name}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(diagram.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/diagrams/${diagram.id}`}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
