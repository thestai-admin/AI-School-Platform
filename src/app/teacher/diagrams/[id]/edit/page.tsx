'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { DiagramEditor } from '@/components/diagrams'
import { Card, CardContent } from '@/components/ui/card'
import type { DiagramData } from '@/types/diagram'

interface EditDiagramPageProps {
  params: Promise<{ id: string }>
}

export default function EditDiagramPage({ params }: EditDiagramPageProps) {
  const { id } = use(params)
  const [diagram, setDiagram] = useState<DiagramData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchDiagram() {
      try {
        const response = await fetch(`/api/diagrams/${id}`)
        const data = await response.json()
        if (response.ok) {
          setDiagram({
            id: data.id,
            title: data.title,
            description: data.description,
            type: data.type,
            visibility: data.visibility,
            nodes: data.nodes,
            edges: data.edges,
            viewport: data.viewport,
            classId: data.classId,
            lessonId: data.lessonId,
          })
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
    <DiagramEditor
      diagramId={id}
      initialData={diagram}
      returnUrl="/teacher/diagrams"
    />
  )
}
