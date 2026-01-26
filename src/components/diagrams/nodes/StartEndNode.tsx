'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { DiagramNodeData } from '@/types/diagram'

function StartEndNode({ data, selected, type }: NodeProps<DiagramNodeData>) {
  const isStart = type === 'start' || data.label?.toLowerCase() === 'start'
  const bgColor = data.color || (isStart ? '#22c55e' : '#ef4444')

  return (
    <div
      className={`px-6 py-3 rounded-full shadow-md border-2 min-w-[80px] text-center transition-all ${
        selected ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: bgColor,
        borderColor: selected ? (isStart ? '#22c55e' : '#ef4444') : bgColor,
        '--tw-ring-color': isStart ? '#22c55e' : '#ef4444',
      } as React.CSSProperties}
    >
      {/* Only show target handle for end nodes */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gray-600 !w-3 !h-3"
        />
      )}

      <div className="text-white font-semibold text-sm">{data.label}</div>

      {/* Only show source handle for start nodes */}
      {isStart && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-gray-600 !w-3 !h-3"
        />
      )}
    </div>
  )
}

export default memo(StartEndNode)
