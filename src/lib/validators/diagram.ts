import { z } from 'zod'

export const createDiagramSchema = z.object({
  title: z.string().min(1, 'Title is required').transform((val) => val.trim()),
  description: z.string().optional(),
  type: z
    .enum(['FLOWCHART', 'DECISION_TREE', 'CONCEPT_MAP', 'LESSON_FLOW'])
    .optional()
    .default('FLOWCHART'),
  visibility: z
    .enum(['PRIVATE', 'CLASS', 'SCHOOL'])
    .optional()
    .default('PRIVATE'),
  nodes: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  edges: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  viewport: z.record(z.string(), z.unknown()).optional(),
  classId: z.string().optional(),
  lessonId: z.string().optional(),
})

export type CreateDiagramInput = z.infer<typeof createDiagramSchema>
