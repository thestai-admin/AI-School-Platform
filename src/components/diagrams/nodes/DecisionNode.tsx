'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { DiagramNodeData } from '@/types/diagram'

function DecisionNode({ data, selected }: NodeProps<DiagramNodeData>) {
  const bgColor = data.color || '#f59e0b'

  return (
    <div
      className={`relative min-w-[100px] min-h-[60px] flex items-center justify-center transition-all ${
        selected ? 'drop-shadow-lg' : ''
      }`}
    >
      {/* Diamond shape */}
      <div
        className={`absolute inset-0 rotate-45 rounded-lg shadow-md border-2 ${
          selected ? 'ring-2 ring-amber-400 ring-offset-2' : ''
        }`}
        style={{
          backgroundColor: bgColor,
          borderColor: selected ? '#f59e0b' : bgColor,
          transform: 'rotate(45deg) scale(0.7)',
        }}
      />

      {/* Content (not rotated) */}
      <div className="relative z-10 text-center px-2">
        <div className="text-white font-medium text-sm">{data.label}</div>
        {data.description && (
          <div className="text-white/80 text-xs mt-0.5">{data.description}</div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-600 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-gray-600 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-gray-600 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!bg-gray-600 !w-3 !h-3"
      />
    </div>
  )
}

export default memo(DecisionNode)
