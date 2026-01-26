'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { DiagramViewer } from '@/components/diagrams'
import { Card, CardContent } from '@/components/ui/card'
import type { DiagramNode, DiagramEdge, DiagramViewport } from '@/types/diagram'

interface DiagramData {
  id: string
  title: string
  description: string | null
  type: string
  visibility: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  viewport: DiagramViewport | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; email: string }
  class: { id: string; name: string; grade: number } | null
  lesson: { id: string; topic: string } | null
}

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

interface ViewDiagramPageProps {
  params: Promise<{ id: string }>
}

export default function ViewDiagramPage({ params }: ViewDiagramPageProps) {
  const { id } = use(params)
  const { data: session } = useSession()
  const [diagram, setDiagram] = useState<DiagramData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchDiagram() {
      try {
        const response = await fetch(`/api/diagrams/${id}`)
        const data = await response.json()
        if (response.ok) {
          setDiagram(data)
        } else {
          setError(data.error || 'Failed to fetch diagram')
        }
      } catch {
        setError('Failed to fetch diagram')
      } finally {
        setIsLoading(false)
      }
    }
    fetchDiagram()
  }, [id])

  const isOwner = session?.user?.id === diagram?.createdBy?.id

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading diagram...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card variant="bordered">
        <CardContent className="py-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-red-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {error}
          </h3>
          <Link
            href="/teacher/diagrams"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Back to diagrams
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!diagram) return null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/teacher/diagrams"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{diagram.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  visibilityLabels[diagram.visibility]?.color
                }`}
              >
                {visibilityLabels[diagram.visibility]?.label}
              </span>
              <span className="text-sm text-gray-500">
                {diagramTypeLabels[diagram.type]}
              </span>
              <span className="text-sm text-gray-400">
                by {diagram.createdBy.name}
              </span>
            </div>
          </div>
        </div>

        {isOwner && (
          <Link
            href={`/teacher/diagrams/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
            Edit
          </Link>
        )}
      </div>

      {/* Diagram info */}
      {(diagram.description || diagram.class || diagram.lesson) && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          {diagram.description && (
            <p className="text-gray-600 mb-2">{diagram.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {diagram.class && (
              <span>
                Class {diagram.class.grade} - {diagram.class.name}
              </span>
            )}
            {diagram.lesson && (
              <span>Linked to lesson: {diagram.lesson.topic}</span>
            )}
            <span>
              Last updated: {new Date(diagram.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Diagram viewer */}
      <div className="flex-1 min-h-[500px] border border-gray-200 rounded-lg overflow-hidden">
        <DiagramViewer
          nodes={diagram.nodes}
          edges={diagram.edges}
          viewport={diagram.viewport || undefined}
        />
      </div>
    </div>
  )
}
