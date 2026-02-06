import { z } from 'zod'

export const createLessonSchema = z.object({
  grade: z.number().int().min(1).max(10),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  language: z.enum(['ENGLISH', 'HINDI', 'MIXED']),
  duration: z.number().int().positive().optional().default(45),
  save: z.boolean().optional(),
  subjectId: z.string().optional(),
  classId: z.string().optional(),
})

export type CreateLessonInput = z.infer<typeof createLessonSchema>
