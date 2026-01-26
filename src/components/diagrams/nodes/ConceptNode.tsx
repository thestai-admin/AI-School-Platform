'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { DiagramNodeData } from '@/types/diagram'

function ConceptNode({ data, selected }: NodeProps<DiagramNodeData>) {
  const bgColor = data.color || '#8b5cf6'

  return (
    <div
      className={`px-5 py-3 rounded-full shadow-md border-2 min-w-[100px] text-center transition-all ${
        selected ? 'ring-2 ring-violet-400 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: bgColor,
        borderColor: selected ? '#8b5cf6' : bgColor,
        borderRadius: '50%',
        aspectRatio: 'auto',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-600 !w-3 !h-3"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
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
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!bg-gray-600 !w-3 !h-3"
      />
    </div>
  )
}

export default memo(ConceptNode)
