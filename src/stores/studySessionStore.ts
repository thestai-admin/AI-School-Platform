import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface StudySessionState {
  // Session info
  sessionId: string | null
  sessionType: 'DOUBT_SOLVING' | 'CONCEPT_LEARNING' | 'PRACTICE' | 'REVISION' | 'COMPETITIVE_PREP'
  subject: string | null
  topic: string | null
  examType: string | null

  // Messages
  messages: Message[]

  // Session status
  isActive: boolean
  startedAt: Date | null
  duration: number // in minutes

  // Tracking
  conceptsCovered: string[]
  weakAreasFound: string[]

  // Loading states
  isLoading: boolean
  error: string | null
}

export interface StudySessionActions {
  // Session management
  startSession: (params: {
    type: StudySessionState['sessionType']
    subject: string
    topic?: string
    examType?: string
  }) => void
  endSession: () => void

  // Messages
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  clearMessages: () => void

  // Tracking
  addConceptCovered: (concept: string) => void
  addWeakArea: (area: string) => void

  // State management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetSession: () => void

  // Persistence
  saveSession: () => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
}

const initialState: StudySessionState = {
  sessionId: null,
  sessionType: 'DOUBT_SOLVING',
  subject: null,
  topic: null,
  examType: null,
  messages: [],
  isActive: false,
  startedAt: null,
  duration: 0,
  conceptsCovered: [],
  weakAreasFound: [],
  isLoading: false,
  error: null,
}

export const useStudySessionStore = create<StudySessionState & StudySessionActions>(
  (set, get) => ({
    ...initialState,

    startSession: (params) => {
      const sessionId = `session_${Date.now()}`
      set({
        sessionId,
        sessionType: params.type,
        subject: params.subject,
        topic: params.topic || null,
        examType: params.examType || null,
        isActive: true,
        startedAt: new Date(),
        messages: [],
        conceptsCovered: [],
        weakAreasFound: [],
        error: null,
      })
    },

    endSession: () => {
      const state = get()
      if (state.startedAt) {
        const duration = Math.round(
          (new Date().getTime() - state.startedAt.getTime()) / (1000 * 60)
        )
        set({ isActive: false, duration })
      } else {
        set({ isActive: false })
      }
    },

    addMessage: (message) => {
      const newMessage: Message = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
      }
      set((state) => ({
        messages: [...state.messages, newMessage],
      }))
    },

    clearMessages: () => {
      set({ messages: [] })
    },

    addConceptCovered: (concept) => {
      set((state) => ({
        conceptsCovered: state.conceptsCovered.includes(concept)
          ? state.conceptsCovered
          : [...state.conceptsCovered, concept],
      }))
    },

    addWeakArea: (area) => {
      set((state) => ({
        weakAreasFound: state.weakAreasFound.includes(area)
          ? state.weakAreasFound
          : [...state.weakAreasFound, area],
      }))
    },

    setLoading: (loading) => {
      set({ isLoading: loading })
    },

    setError: (error) => {
      set({ error })
    },

    resetSession: () => {
      set(initialState)
    },

    saveSession: async () => {
      const state = get()
      if (!state.sessionId || !state.subject) return

      try {
        set({ isLoading: true })

        const response = await fetch('/api/study/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: state.sessionId,
            type: state.sessionType,
            subject: state.subject,
            topic: state.topic,
            examType: state.examType,
            messages: state.messages,
            conceptsCovered: state.conceptsCovered,
            weakAreasFound: state.weakAreasFound,
            duration: state.duration,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save session')
        }

        const data = await response.json()
        set({ sessionId: data.session.id })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to save session' })
      } finally {
        set({ isLoading: false })
      }
    },

    loadSession: async (sessionId) => {
      try {
        set({ isLoading: true })

        const response = await fetch(`/api/study/session/${sessionId}`)
        if (!response.ok) {
          throw new Error('Failed to load session')
        }

        const data = await response.json()
        const session = data.session

        set({
          sessionId: session.id,
          sessionType: session.type,
          subject: session.subject,
          topic: session.topic,
          examType: session.examType,
          messages: session.messages || [],
          isActive: !session.endedAt,
          startedAt: new Date(session.startedAt),
          duration: session.duration || 0,
          conceptsCovered: session.conceptsCovered || [],
          weakAreasFound: session.weakAreasFound || [],
          error: null,
        })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load session' })
      } finally {
        set({ isLoading: false })
      }
    },
  })
)

// Selectors
export const selectSessionInfo = (state: StudySessionState) => ({
  sessionId: state.sessionId,
  sessionType: state.sessionType,
  subject: state.subject,
  topic: state.topic,
  examType: state.examType,
  isActive: state.isActive,
  startedAt: state.startedAt,
  duration: state.duration,
})

export const selectMessages = (state: StudySessionState) => state.messages

export const selectTracking = (state: StudySessionState) => ({
  conceptsCovered: state.conceptsCovered,
  weakAreasFound: state.weakAreasFound,
})
