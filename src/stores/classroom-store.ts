'use client'

import { create } from 'zustand'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

export type SessionRole = 'teacher' | 'student'
export type SessionConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface TranscriptEntry {
  id: string
  sequence: number
  originalText: string
  language: BhashiniLanguageCode
  translations: Partial<Record<BhashiniLanguageCode, string>>
  timestamp: Date
  confidence?: number
}

export interface Participant {
  id: string
  studentId: string
  name: string
  preferredLang: BhashiniLanguageCode
  joinedAt: Date
}

interface ClassroomState {
  // Session info
  sessionId: string | null
  role: SessionRole | null
  teacherId: string | null
  classId: string | null
  subjectId: string | null

  // Connection
  connectionStatus: SessionConnectionStatus
  lastError: string | null
  reconnectAttempts: number

  // Languages
  sourceLanguage: BhashiniLanguageCode
  targetLanguages: BhashiniLanguageCode[]
  viewingLanguage: BhashiniLanguageCode

  // Transcripts
  transcripts: TranscriptEntry[]
  currentTranscriptId: string | null

  // Participants (for teacher view)
  participants: Participant[]

  // Session timing
  sessionStartedAt: Date | null
  sessionEndedAt: Date | null

  // Actions
  startSession: (params: {
    sessionId: string
    role: SessionRole
    teacherId?: string
    classId?: string
    subjectId?: string
    sourceLanguage?: BhashiniLanguageCode
    targetLanguages?: BhashiniLanguageCode[]
  }) => void
  endSession: () => void
  setConnectionStatus: (status: SessionConnectionStatus) => void
  setError: (error: string | null) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
  setViewingLanguage: (language: BhashiniLanguageCode) => void
  addTranscript: (transcript: TranscriptEntry) => void
  updateTranscript: (id: string, updates: Partial<TranscriptEntry>) => void
  setCurrentTranscriptId: (id: string | null) => void
  clearTranscripts: () => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (studentId: string) => void
  updateParticipantLanguage: (studentId: string, language: BhashiniLanguageCode) => void
  reset: () => void
}

const initialState = {
  sessionId: null,
  role: null,
  teacherId: null,
  classId: null,
  subjectId: null,
  connectionStatus: 'disconnected' as SessionConnectionStatus,
  lastError: null,
  reconnectAttempts: 0,
  sourceLanguage: 'hi' as BhashiniLanguageCode,
  targetLanguages: ['en'] as BhashiniLanguageCode[],
  viewingLanguage: 'en' as BhashiniLanguageCode,
  transcripts: [] as TranscriptEntry[],
  currentTranscriptId: null,
  participants: [] as Participant[],
  sessionStartedAt: null,
  sessionEndedAt: null,
}

export const useClassroomStore = create<ClassroomState>()((set, get) => ({
  ...initialState,

  startSession: (params) =>
    set({
      sessionId: params.sessionId,
      role: params.role,
      teacherId: params.teacherId || null,
      classId: params.classId || null,
      subjectId: params.subjectId || null,
      sourceLanguage: params.sourceLanguage || 'hi',
      targetLanguages: params.targetLanguages || ['en'],
      viewingLanguage: params.role === 'student' ? (params.targetLanguages?.[0] || 'en') : 'hi',
      connectionStatus: 'connecting',
      sessionStartedAt: new Date(),
      sessionEndedAt: null,
      transcripts: [],
      participants: [],
    }),

  endSession: () =>
    set({
      connectionStatus: 'disconnected',
      sessionEndedAt: new Date(),
    }),

  setConnectionStatus: (status) =>
    set({ connectionStatus: status }),

  setError: (error) =>
    set({
      lastError: error,
      connectionStatus: error ? 'error' : get().connectionStatus,
    }),

  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnectAttempts: () =>
    set({ reconnectAttempts: 0 }),

  setViewingLanguage: (language) =>
    set({ viewingLanguage: language }),

  addTranscript: (transcript) =>
    set((state) => ({
      transcripts: [...state.transcripts, transcript],
      currentTranscriptId: transcript.id,
    })),

  updateTranscript: (id, updates) =>
    set((state) => ({
      transcripts: state.transcripts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  setCurrentTranscriptId: (id) =>
    set({ currentTranscriptId: id }),

  clearTranscripts: () =>
    set({ transcripts: [], currentTranscriptId: null }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [
        ...state.participants.filter((p) => p.studentId !== participant.studentId),
        participant,
      ],
    })),

  removeParticipant: (studentId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.studentId !== studentId),
    })),

  updateParticipantLanguage: (studentId, language) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.studentId === studentId ? { ...p, preferredLang: language } : p
      ),
    })),

  reset: () => set(initialState),
}))

// Selector hooks
export const useClassroomSession = () =>
  useClassroomStore((state) => ({
    sessionId: state.sessionId,
    role: state.role,
    isActive: state.connectionStatus === 'connected',
    startedAt: state.sessionStartedAt,
  }))

export const useClassroomConnection = () =>
  useClassroomStore((state) => ({
    status: state.connectionStatus,
    error: state.lastError,
    reconnectAttempts: state.reconnectAttempts,
  }))

export const useClassroomLanguages = () =>
  useClassroomStore((state) => ({
    source: state.sourceLanguage,
    targets: state.targetLanguages,
    viewing: state.viewingLanguage,
  }))

export const useClassroomTranscripts = () =>
  useClassroomStore((state) => ({
    transcripts: state.transcripts,
    current: state.transcripts.find((t) => t.id === state.currentTranscriptId),
    count: state.transcripts.length,
  }))

export const useClassroomParticipants = () =>
  useClassroomStore((state) => ({
    participants: state.participants,
    count: state.participants.length,
  }))

// Helper to get transcript in viewing language
export const getTranscriptInLanguage = (
  transcript: TranscriptEntry,
  language: BhashiniLanguageCode
): string => {
  if (transcript.language === language) {
    return transcript.originalText
  }
  return transcript.translations[language] || transcript.originalText
}
