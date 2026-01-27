/**
 * Offline Support for Study Features
 * Uses IndexedDB to cache study data for offline access
 * Primarily for hostel students with intermittent connectivity
 */

// IndexedDB database name and version
const DB_NAME = 'ai_school_offline'
const DB_VERSION = 1

// Store names
const STORES = {
  SESSIONS: 'study_sessions',
  LEARNING_PATHS: 'learning_paths',
  PRACTICE_QUESTIONS: 'practice_questions',
  MESSAGE_QUEUE: 'message_queue',
  SYNC_STATUS: 'sync_status',
} as const

// Types
interface StudySessionCache {
  id: string
  type: string
  subject?: string
  topic?: string
  messages: Array<{ role: string; content: string; timestamp: number }>
  summary?: object
  conceptsCovered: string[]
  weakAreasFound: string[]
  cachedAt: number
  synced: boolean
}

interface LearningPathCache {
  id: string
  subject: string
  examType?: string
  currentLevel: number
  targetLevel: number
  progress: number
  milestones: Array<{
    id: string
    title: string
    topics: string[]
    completed: boolean
  }>
  cachedAt: number
  synced: boolean
}

interface PracticeQuestionCache {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject: string
  topic: string
  difficulty: string
  cachedAt: number
}

interface QueuedMessage {
  id: string
  endpoint: string
  method: string
  body: object
  createdAt: number
  retryCount: number
}

interface SyncStatus {
  lastSync: number
  pendingCount: number
  status: 'idle' | 'syncing' | 'error'
  error?: string
}

// Open IndexedDB connection
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create study sessions store
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionsStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' })
        sessionsStore.createIndex('subject', 'subject', { unique: false })
        sessionsStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        sessionsStore.createIndex('synced', 'synced', { unique: false })
      }

      // Create learning paths store
      if (!db.objectStoreNames.contains(STORES.LEARNING_PATHS)) {
        const pathsStore = db.createObjectStore(STORES.LEARNING_PATHS, { keyPath: 'id' })
        pathsStore.createIndex('subject', 'subject', { unique: false })
        pathsStore.createIndex('synced', 'synced', { unique: false })
      }

      // Create practice questions store
      if (!db.objectStoreNames.contains(STORES.PRACTICE_QUESTIONS)) {
        const questionsStore = db.createObjectStore(STORES.PRACTICE_QUESTIONS, { keyPath: 'id' })
        questionsStore.createIndex('subject', 'subject', { unique: false })
        questionsStore.createIndex('topic', 'topic', { unique: false })
        questionsStore.createIndex('difficulty', 'difficulty', { unique: false })
      }

      // Create message queue store
      if (!db.objectStoreNames.contains(STORES.MESSAGE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.MESSAGE_QUEUE, { keyPath: 'id' })
        queueStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Create sync status store
      if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
        db.createObjectStore(STORES.SYNC_STATUS, { keyPath: 'id' })
      }
    }
  })
}

// Generic store operations
async function getFromStore<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

async function putToStore<T>(storeName: string, data: T): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(data)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Study Session Cache Operations
export const studySessionCache = {
  async save(session: Omit<StudySessionCache, 'cachedAt' | 'synced'>): Promise<void> {
    const data: StudySessionCache = {
      ...session,
      cachedAt: Date.now(),
      synced: false,
    }
    await putToStore(STORES.SESSIONS, data)
  },

  async get(id: string): Promise<StudySessionCache | null> {
    return getFromStore(STORES.SESSIONS, id)
  },

  async getAll(): Promise<StudySessionCache[]> {
    return getAllFromStore(STORES.SESSIONS)
  },

  async getBySubject(subject: string): Promise<StudySessionCache[]> {
    const all = await getAllFromStore<StudySessionCache>(STORES.SESSIONS)
    return all.filter((s) => s.subject === subject)
  },

  async getRecent(limit: number = 10): Promise<StudySessionCache[]> {
    const all = await getAllFromStore<StudySessionCache>(STORES.SESSIONS)
    return all
      .sort((a, b) => b.cachedAt - a.cachedAt)
      .slice(0, limit)
  },

  async markSynced(id: string): Promise<void> {
    const session = await this.get(id)
    if (session) {
      await putToStore(STORES.SESSIONS, { ...session, synced: true })
    }
  },

  async delete(id: string): Promise<void> {
    await deleteFromStore(STORES.SESSIONS, id)
  },

  async getUnsynced(): Promise<StudySessionCache[]> {
    const all = await getAllFromStore<StudySessionCache>(STORES.SESSIONS)
    return all.filter((s) => !s.synced)
  },
}

// Learning Path Cache Operations
export const learningPathCache = {
  async save(path: Omit<LearningPathCache, 'cachedAt' | 'synced'>): Promise<void> {
    const data: LearningPathCache = {
      ...path,
      cachedAt: Date.now(),
      synced: false,
    }
    await putToStore(STORES.LEARNING_PATHS, data)
  },

  async get(id: string): Promise<LearningPathCache | null> {
    return getFromStore(STORES.LEARNING_PATHS, id)
  },

  async getAll(): Promise<LearningPathCache[]> {
    return getAllFromStore(STORES.LEARNING_PATHS)
  },

  async updateProgress(id: string, progress: number, milestones: LearningPathCache['milestones']): Promise<void> {
    const path = await this.get(id)
    if (path) {
      await putToStore(STORES.LEARNING_PATHS, {
        ...path,
        progress,
        milestones,
        synced: false,
        cachedAt: Date.now(),
      })
    }
  },

  async markSynced(id: string): Promise<void> {
    const path = await this.get(id)
    if (path) {
      await putToStore(STORES.LEARNING_PATHS, { ...path, synced: true })
    }
  },

  async getUnsynced(): Promise<LearningPathCache[]> {
    const all = await getAllFromStore<LearningPathCache>(STORES.LEARNING_PATHS)
    return all.filter((p) => !p.synced)
  },
}

// Practice Questions Cache Operations
export const practiceQuestionCache = {
  async save(question: Omit<PracticeQuestionCache, 'cachedAt'>): Promise<void> {
    const data: PracticeQuestionCache = {
      ...question,
      cachedAt: Date.now(),
    }
    await putToStore(STORES.PRACTICE_QUESTIONS, data)
  },

  async saveMany(questions: Omit<PracticeQuestionCache, 'cachedAt'>[]): Promise<void> {
    for (const question of questions) {
      await this.save(question)
    }
  },

  async get(id: string): Promise<PracticeQuestionCache | null> {
    return getFromStore(STORES.PRACTICE_QUESTIONS, id)
  },

  async getBySubjectAndTopic(subject: string, topic?: string): Promise<PracticeQuestionCache[]> {
    const all = await getAllFromStore<PracticeQuestionCache>(STORES.PRACTICE_QUESTIONS)
    return all.filter((q) =>
      q.subject === subject && (!topic || q.topic === topic)
    )
  },

  async getByDifficulty(difficulty: string): Promise<PracticeQuestionCache[]> {
    const all = await getAllFromStore<PracticeQuestionCache>(STORES.PRACTICE_QUESTIONS)
    return all.filter((q) => q.difficulty === difficulty)
  },

  async delete(id: string): Promise<void> {
    await deleteFromStore(STORES.PRACTICE_QUESTIONS, id)
  },

  async clearOld(maxAgeDays: number = 30): Promise<number> {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    const all = await getAllFromStore<PracticeQuestionCache>(STORES.PRACTICE_QUESTIONS)
    let deletedCount = 0
    for (const q of all) {
      if (q.cachedAt < cutoff) {
        await this.delete(q.id)
        deletedCount++
      }
    }
    return deletedCount
  },
}

// Message Queue Operations (for offline message syncing)
export const messageQueue = {
  async add(endpoint: string, method: string, body: object): Promise<string> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const message: QueuedMessage = {
      id,
      endpoint,
      method,
      body,
      createdAt: Date.now(),
      retryCount: 0,
    }
    await putToStore(STORES.MESSAGE_QUEUE, message)
    return id
  },

  async getAll(): Promise<QueuedMessage[]> {
    const all = await getAllFromStore<QueuedMessage>(STORES.MESSAGE_QUEUE)
    return all.sort((a, b) => a.createdAt - b.createdAt)
  },

  async remove(id: string): Promise<void> {
    await deleteFromStore(STORES.MESSAGE_QUEUE, id)
  },

  async incrementRetry(id: string): Promise<void> {
    const message = await getFromStore<QueuedMessage>(STORES.MESSAGE_QUEUE, id)
    if (message) {
      await putToStore(STORES.MESSAGE_QUEUE, {
        ...message,
        retryCount: message.retryCount + 1,
      })
    }
  },

  async getPendingCount(): Promise<number> {
    const all = await this.getAll()
    return all.length
  },
}

// Sync Operations
export const syncManager = {
  async getSyncStatus(): Promise<SyncStatus> {
    const status = await getFromStore<SyncStatus>(STORES.SYNC_STATUS, 'main')
    return status || {
      lastSync: 0,
      pendingCount: 0,
      status: 'idle',
    }
  },

  async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    const current = await this.getSyncStatus()
    await putToStore(STORES.SYNC_STATUS, {
      ...current,
      ...updates,
      id: 'main',
    })
  },

  async syncAll(): Promise<{ success: number; failed: number }> {
    await this.updateSyncStatus({ status: 'syncing' })
    let success = 0
    let failed = 0

    try {
      // Sync queued messages
      const messages = await messageQueue.getAll()
      for (const message of messages) {
        try {
          const response = await fetch(message.endpoint, {
            method: message.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.body),
          })

          if (response.ok) {
            await messageQueue.remove(message.id)
            success++
          } else if (message.retryCount >= 3) {
            // Give up after 3 retries
            await messageQueue.remove(message.id)
            failed++
          } else {
            await messageQueue.incrementRetry(message.id)
            failed++
          }
        } catch {
          if (message.retryCount >= 3) {
            await messageQueue.remove(message.id)
          } else {
            await messageQueue.incrementRetry(message.id)
          }
          failed++
        }
      }

      // Sync unsynced sessions
      const unsyncedSessions = await studySessionCache.getUnsynced()
      for (const session of unsyncedSessions) {
        try {
          const response = await fetch('/api/study/session/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session),
          })
          if (response.ok) {
            await studySessionCache.markSynced(session.id)
            success++
          }
        } catch {
          failed++
        }
      }

      // Sync unsynced learning paths
      const unsyncedPaths = await learningPathCache.getUnsynced()
      for (const path of unsyncedPaths) {
        try {
          const response = await fetch(`/api/study/learning-path/${path.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: path.progress, milestones: path.milestones }),
          })
          if (response.ok) {
            await learningPathCache.markSynced(path.id)
            success++
          }
        } catch {
          failed++
        }
      }

      await this.updateSyncStatus({
        status: 'idle',
        lastSync: Date.now(),
        pendingCount: await messageQueue.getPendingCount(),
      })
    } catch (error) {
      await this.updateSyncStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return { success, failed }
  },
}

// Utility to check if we're online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncManager.syncAll()
  })
}

// Export a function to prefetch data for offline use
export async function prefetchForOffline(options: {
  learningPaths?: boolean
  practiceQuestions?: { subject: string; topic?: string; count?: number }
}): Promise<void> {
  if (!isOnline()) return

  try {
    // Prefetch learning paths
    if (options.learningPaths) {
      const response = await fetch('/api/study/learning-path')
      if (response.ok) {
        const data = await response.json()
        for (const path of data.paths || []) {
          await learningPathCache.save(path)
        }
      }
    }

    // Prefetch practice questions
    if (options.practiceQuestions) {
      const { subject, topic, count = 20 } = options.practiceQuestions
      const params = new URLSearchParams({
        subject,
        limit: count.toString(),
        ...(topic && { topic }),
      })
      const response = await fetch(`/api/study/practice?${params}`)
      if (response.ok) {
        const data = await response.json()
        await practiceQuestionCache.saveMany(data.questions || [])
      }
    }
  } catch (error) {
    console.error('Error prefetching for offline:', error)
  }
}
