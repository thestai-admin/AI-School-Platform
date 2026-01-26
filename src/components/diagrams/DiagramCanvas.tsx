'use client'

import { useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  NodeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useDiagramStore } from '@/stores/diagramStore'
import { nodeTypes } from './nodes'

interface DiagramCanvasProps {
  readOnly?: boolean
}

function DiagramCanvasInner({ readOnly = false }: DiagramCanvasProps) {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    setViewport,
  } = useDiagramStore()

  useReactFlow() // Available for future viewport manipulation

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (!readOnly) {
        selectNode(node.id)
      }
    },
    [readOnly, selectNode]
  )

  const handlePaneClick = useCallback(() => {
    if (!readOnly) {
      selectNode(null)
    }
  }, [readOnly, selectNode])

  const handleMoveEnd = useCallback(
    (_: unknown, newViewport: { x: number; y: number; zoom: number }) => {
      if (!readOnly) {
        setViewport(newViewport)
      }
    },
    [readOnly, setViewport]
  )

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onMoveEnd={handleMoveEnd}
        defaultViewport={viewport}
        fitView={!viewport || (viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1)}
        snapToGrid
        snapGrid={[15, 15]}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        panOnDrag={true}
        zoomOnScroll={true}
        className="bg-dots-pattern"
      >
        <Background color="#e5e7eb" gap={15} />
        <Controls showInteractive={!readOnly} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#22c55e'
              case 'end':
                return '#ef4444'
              case 'decision':
                return '#f59e0b'
              case 'concept':
                return '#8b5cf6'
              default:
                return '#3b82f6'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white !border !border-gray-200"
        />
      </ReactFlow>
    </div>
  )
}

export default function DiagramCanvas(props: DiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
