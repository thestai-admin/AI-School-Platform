export { default as ProcessNode } from './ProcessNode'
export { default as DecisionNode } from './DecisionNode'
export { default as StartEndNode } from './StartEndNode'
export { default as ConceptNode } from './ConceptNode'

// Node types map for React Flow
import ProcessNode from './ProcessNode'
import DecisionNode from './DecisionNode'
import StartEndNode from './StartEndNode'
import ConceptNode from './ConceptNode'

export const nodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  start: StartEndNode,
  end: StartEndNode,
  concept: ConceptNode,
}
