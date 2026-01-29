import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Prisma Client enums
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client')
  return {
    ...actual,
    UserRole: {
      ADMIN: 'ADMIN',
      TEACHER: 'TEACHER',
      STUDENT: 'STUDENT',
      PARENT: 'PARENT',
    },
    UserStatus: {
      PENDING_VERIFICATION: 'PENDING_VERIFICATION',
      PENDING_APPROVAL: 'PENDING_APPROVAL',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
      REJECTED: 'REJECTED',
    },
    Language: {
      ENGLISH: 'ENGLISH',
      HINDI: 'HINDI',
      MIXED: 'MIXED',
    },
    Difficulty: {
      EASY: 'EASY',
      MEDIUM: 'MEDIUM',
      HARD: 'HARD',
    },
    HomeworkStatus: {
      PENDING: 'PENDING',
      SUBMITTED: 'SUBMITTED',
      GRADED: 'GRADED',
      LATE: 'LATE',
    },
    DiagramType: {
      FLOWCHART: 'FLOWCHART',
      DECISION_TREE: 'DECISION_TREE',
      CONCEPT_MAP: 'CONCEPT_MAP',
      LESSON_FLOW: 'LESSON_FLOW',
    },
    DiagramVisibility: {
      PRIVATE: 'PRIVATE',
      PUBLIC: 'PUBLIC',
      SCHOOL: 'SCHOOL',
    },
  }
})
