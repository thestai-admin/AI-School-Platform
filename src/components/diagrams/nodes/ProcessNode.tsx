'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { DiagramNodeData } from '@/types/diagram'

function ProcessNode({ data, selected }: NodeProps<DiagramNodeData>) {
  const bgColor = data.color || '#3b82f6'

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md border-2 min-w-[120px] text-center transition-all ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: bgColor,
        borderColor: selected ? '#3b82f6' : bgColor,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-600 !w-3 !h-3"
      />
      <div className="text-white font-medium text-sm">{data.label}</div>
      {data.description && (
        <div className="text-white/80 text-xs mt-1">{data.description}</div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-600 !w-3 !h-3"
      />
    </div>
  )
}

export default memo(ProcessNode)
