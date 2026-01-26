import { DiagramType, DiagramVisibility } from '@prisma/client'

export type { DiagramType, DiagramVisibility }

export type DiagramNodeType = 'process' | 'decision' | 'start' | 'end' | 'concept'

export interface DiagramNodeData {
  label: string
  description?: string
  color?: string
}

export interface DiagramNode {
  id: string
  type: DiagramNodeType
  position: { x: number; y: number }
  data: DiagramNodeData
}

export type DiagramEdgeType = 'default' | 'smoothstep' | 'step'

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: DiagramEdgeType
}

export interface DiagramViewport {
  x: number
  y: number
  zoom: number
}

export interface DiagramData {
  id?: string
  title: string
  description?: string
  type: DiagramType
  visibility: DiagramVisibility
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  viewport?: DiagramViewport
  classId?: string
  lessonId?: string
}

export interface DiagramListItem {
  id: string
  title: string
  description?: string | null
  type: DiagramType
  visibility: DiagramVisibility
  createdAt: Date
  updatedAt: Date
  createdBy: {
    id: string
    name: string
  }
  class?: {
    id: string
    name: string
    grade: number
  } | null
}
