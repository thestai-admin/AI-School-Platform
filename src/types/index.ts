import { UserRole, Language, Difficulty } from '@prisma/client'

export type { UserRole, Language, Difficulty }

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LessonFormData {
  classId: string
  subjectId: string
  topic: string
  language: Language
  date: string
}

export interface WorksheetFormData {
  classId?: string
  subjectId: string
  topic: string
  difficulty: Difficulty
  questionCount: number
  language: Language
  questionTypes?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface StudentMetrics {
  topicsCompleted: number
  averageScore: number
  strengths: string[]
  weaknesses: string[]
  recentActivity: {
    type: 'chat' | 'worksheet'
    date: Date
    subject: string
  }[]
}
