'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDiagramStore } from '@/stores/diagramStore'
import DiagramCanvas from './DiagramCanvas'
import DiagramToolbar from './DiagramToolbar'
import DiagramSidebar from './DiagramSidebar'
import type {
  DiagramData,
  DiagramType,
  DiagramVisibility,
  DiagramNode,
} from '@/types/diagram'

interface DiagramEditorProps {
  diagramId?: string
  initialData?: DiagramData
  returnUrl?: string
}

export default function DiagramEditor({
  diagramId,
  initialData,
  returnUrl = '/teacher/diagrams',
}: DiagramEditorProps) {
  const router = useRouter()
  const { loadDiagram, getNodes, getEdges, viewport, reset, markClean, addNode } =
    useDiagramStore()

  // Form state
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [diagramType, setDiagramType] = useState<DiagramType>(
    initialData?.type || 'FLOWCHART'
  )
  const [visibility, setVisibility] = useState<DiagramVisibility>(
    initialData?.visibility || 'PRIVATE'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Load initial diagram data
  useEffect(() => {
    if (initialData) {
      loadDiagram(
        initialData.nodes || [],
        initialData.edges || [],
        initialData.viewport
      )
    } else {
      reset()
    }
    return () => reset()
  }, [initialData, loadDiagram, reset])

  // Handle drop for drag-and-drop from sidebar
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

      const canvasRect = e.currentTarget.getBoundingClientRect()
      const position = {
        x: e.clientX - canvasRect.left - 60,
        y: e.clientY - canvasRect.top - 25,
      }

      addNode(nodeType as DiagramNode['type'], position)
    },
    [addNode]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Save diagram
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for the diagram')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const nodes = getNodes()
      const edges = getEdges()

      const diagramData: DiagramData = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: diagramType,
        visibility,
        nodes,
        edges,
        viewport,
      }

      const url = diagramId ? `/api/diagrams/${diagramId}` : '/api/diagrams'
      const method = diagramId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagramData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save diagram')
      }

      const savedDiagram = await response.json()
      markClean()

      // Redirect to view page for new diagrams
      if (!diagramId) {
        router.push(`${returnUrl}/${savedDiagram.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save diagram')
    } finally {
      setIsSaving(false)
    }
  }

  // Export diagram as PNG
  const handleExport = useCallback(() => {
    // Find the React Flow canvas element
    const flowElement = document.querySelector('.react-flow') as HTMLElement
    if (!flowElement) return

    // Use html2canvas or a simpler approach
    // For now, we'll export as JSON
    const nodes = getNodes()
    const edges = getEdges()

    const exportData = {
      title,
      description,
      type: diagramType,
      nodes,
      edges,
      viewport,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'diagram'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [title, description, diagramType, getNodes, getEdges, viewport])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Toolbar */}
      <DiagramToolbar
        title={title}
        description={description}
        diagramType={diagramType}
        visibility={visibility}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onTypeChange={setDiagramType}
        onVisibilityChange={setVisibility}
        onSave={handleSave}
        onExport={handleExport}
        isSaving={isSaving}
        isNew={!diagramId}
      />

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          className="flex-1 relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <DiagramCanvas />
        </div>

        {/* Sidebar */}
        <DiagramSidebar />
      </div>
    </div>
  )
}
