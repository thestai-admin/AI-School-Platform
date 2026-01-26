import { create } from 'zustand'
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow'
import type { DiagramNode, DiagramEdge, DiagramViewport, DiagramNodeData } from '@/types/diagram'

// Convert between our types and React Flow types
function toReactFlowNode(node: DiagramNode): Node<DiagramNodeData> {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }
}

function fromReactFlowNode(node: Node<DiagramNodeData>): DiagramNode {
  return {
    id: node.id,
    type: (node.type || 'process') as DiagramNode['type'],
    position: node.position,
    data: node.data,
  }
}

function toReactFlowEdge(edge: DiagramEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: edge.type || 'smoothstep',
  }
}

function fromReactFlowEdge(edge: Edge): DiagramEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label as string | undefined,
    type: (edge.type || 'smoothstep') as DiagramEdge['type'],
  }
}

interface DiagramState {
  // State
  nodes: Node<DiagramNodeData>[]
  edges: Edge[]
  viewport: DiagramViewport
  selectedNodeId: string | null
  isDirty: boolean

  // Actions
  setNodes: (nodes: DiagramNode[]) => void
  setEdges: (edges: DiagramEdge[]) => void
  setViewport: (viewport: DiagramViewport) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: DiagramNode['type'], position: { x: number; y: number }) => void
  updateNodeData: (nodeId: string, data: Partial<DiagramNodeData>) => void
  deleteSelected: () => void
  selectNode: (nodeId: string | null) => void
  loadDiagram: (nodes: DiagramNode[], edges: DiagramEdge[], viewport?: DiagramViewport) => void
  reset: () => void
  markClean: () => void

  // Getters (for export)
  getNodes: () => DiagramNode[]
  getEdges: () => DiagramEdge[]
}

const defaultViewport: DiagramViewport = { x: 0, y: 0, zoom: 1 }

let nodeIdCounter = 0

function generateNodeId(): string {
  nodeIdCounter += 1
  return `node_${Date.now()}_${nodeIdCounter}`
}

function generateEdgeId(): string {
  return `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function getDefaultLabel(type: DiagramNode['type']): string {
  switch (type) {
    case 'start':
      return 'Start'
    case 'end':
      return 'End'
    case 'decision':
      return 'Decision?'
    case 'concept':
      return 'Concept'
    case 'process':
    default:
      return 'Process'
  }
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: defaultViewport,
  selectedNodeId: null,
  isDirty: false,

  // Actions
  setNodes: (nodes) =>
    set({
      nodes: nodes.map(toReactFlowNode),
      isDirty: true,
    }),

  setEdges: (edges) =>
    set({
      edges: edges.map(toReactFlowEdge),
      isDirty: true,
    }),

  setViewport: (viewport) =>
    set({
      viewport,
      isDirty: true,
    }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: true,
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          id: generateEdgeId(),
          type: 'smoothstep',
        },
        state.edges
      ),
      isDirty: true,
    })),

  addNode: (type, position) => {
    const newNode: Node<DiagramNodeData> = {
      id: generateNodeId(),
      type,
      position,
      data: {
        label: getDefaultLabel(type),
      },
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
      isDirty: true,
    }))
  },

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
      isDirty: true,
    })),

  deleteSelected: () => {
    const { selectedNodeId, nodes, edges } = get()
    if (!selectedNodeId) return

    set({
      nodes: nodes.filter((node) => node.id !== selectedNodeId),
      edges: edges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId
      ),
      selectedNodeId: null,
      isDirty: true,
    })
  },

  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
    }),

  loadDiagram: (nodes, edges, viewport) =>
    set({
      nodes: nodes.map(toReactFlowNode),
      edges: edges.map(toReactFlowEdge),
      viewport: viewport || defaultViewport,
      selectedNodeId: null,
      isDirty: false,
    }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      viewport: defaultViewport,
      selectedNodeId: null,
      isDirty: false,
    }),

  markClean: () =>
    set({
      isDirty: false,
    }),

  // Getters
  getNodes: () => get().nodes.map(fromReactFlowNode),
  getEdges: () => get().edges.map(fromReactFlowEdge),
}))
