import { z } from 'zod'

const homeworkQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().optional(),
  maxMarks: z.number().positive().optional().default(1),
})

export const createHomeworkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  instructions: z.string().optional(),
  questions: z.array(homeworkQuestionSchema).min(1, 'At least one question is required'),
  totalMarks: z.number().positive().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
  language: z.enum(['ENGLISH', 'HINDI', 'MIXED']).optional().default('ENGLISH'),
  dueDate: z.string().min(1, 'Due date is required'),
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  worksheetId: z.string().optional(),
})

export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>
