'use client'

import { useEffect } from 'react'
import { useDiagramStore } from '@/stores/diagramStore'
import DiagramCanvas from './DiagramCanvas'
import type { DiagramNode, DiagramEdge, DiagramViewport } from '@/types/diagram'

interface DiagramViewerProps {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  viewport?: DiagramViewport
  title?: string
  description?: string
  className?: string
}

export default function DiagramViewer({
  nodes,
  edges,
  viewport,
  title,
  description,
  className = '',
}: DiagramViewerProps) {
  const { loadDiagram, reset } = useDiagramStore()

  useEffect(() => {
    loadDiagram(nodes, edges, viewport)
    return () => reset()
  }, [nodes, edges, viewport, loadDiagram, reset])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {(title || description) && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="flex-1 min-h-[400px]">
        <DiagramCanvas readOnly />
      </div>
    </div>
  )
}
