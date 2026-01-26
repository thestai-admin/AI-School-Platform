'use client'

import { useDiagramStore } from '@/stores/diagramStore'
import type { DiagramNodeType } from '@/types/diagram'

const NODE_PALETTE: {
  type: DiagramNodeType
  label: string
  description: string
  color: string
  icon: React.ReactNode
}[] = [
  {
    type: 'start',
    label: 'Start',
    description: 'Starting point',
    color: '#22c55e',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    type: 'process',
    label: 'Process',
    description: 'Action or step',
    color: '#3b82f6',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="6" width="16" height="12" rx="2" />
      </svg>
    ),
  },
  {
    type: 'decision',
    label: 'Decision',
    description: 'Yes/No question',
    color: '#f59e0b',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l10 10-10 10L2 12z" />
      </svg>
    ),
  },
  {
    type: 'concept',
    label: 'Concept',
    description: 'Idea or topic',
    color: '#8b5cf6',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="12" rx="10" ry="7" />
      </svg>
    ),
  },
  {
    type: 'end',
    label: 'End',
    description: 'Ending point',
    color: '#ef4444',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    ),
  },
]

const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
]

export default function DiagramSidebar() {
  const { selectedNodeId, nodes, addNode, updateNodeData, deleteSelected } =
    useDiagramStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  const handleDragStart = (
    e: React.DragEvent,
    nodeType: DiagramNodeType
  ) => {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleAddNode = (type: DiagramNodeType) => {
    // Add node to center of canvas
    addNode(type, { x: 250, y: 150 })
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Node Palette */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Nodes</h3>
        <div className="grid grid-cols-2 gap-2">
          {NODE_PALETTE.map((node) => (
            <button
              key={node.type}
              draggable
              onDragStart={(e) => handleDragStart(e, node.type)}
              onClick={() => handleAddNode(node.type)}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing"
              title={node.description}
            >
              <span style={{ color: node.color }}>{node.icon}</span>
              <span className="text-xs text-gray-600">{node.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Properties</h3>

        {selectedNode ? (
          <div className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, { label: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={selectedNode.data.description || ''}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    description: e.target.value || undefined,
                  })
                }
                placeholder="Add details..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateNodeData(selectedNode.id, { color })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                      selectedNode.data.color === color
                        ? 'border-gray-900 scale-110'
                        : 'border-white shadow'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Delete */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={deleteSelected}
                className="w-full px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
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
                Delete Node
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Select a node to edit its properties, or drag a node from above to
            add it to the canvas.
          </p>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Tips</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>Drag nodes to reposition</li>
          <li>Connect nodes by dragging from handles</li>
          <li>Delete: select node + press Delete</li>
        </ul>
      </div>
    </div>
  )
}
