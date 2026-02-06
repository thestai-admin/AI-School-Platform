import { z } from 'zod'

export const createWorksheetSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  questions: z.array(z.record(z.string(), z.unknown())).min(1, 'At least one question is required'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
  language: z.enum(['ENGLISH', 'HINDI', 'MIXED']).optional().default('ENGLISH'),
  subjectId: z.string().min(1, 'Subject is required'),
  classId: z.string().optional(),
})

export type CreateWorksheetInput = z.infer<typeof createWorksheetSchema>
