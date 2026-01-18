import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { prisma } from '@/lib/db/prisma'
import type { BhashiniLanguageCode } from '@/lib/bhashini/types'

// In-memory store for SSE connections (use Redis for multi-instance)
const sessionConnections = new Map<string, Set<WritableStreamDefaultWriter>>()
const sessionParticipants = new Map<string, Map<string, { name: string; language: BhashiniLanguageCode }>>()

// Helper to broadcast to all connections in a session
async function broadcastToSession(sessionId: string, data: object) {
  const connections = sessionConnections.get(sessionId)
  if (!connections) return

  const message = `data: ${JSON.stringify(data)}\n\n`
  const deadConnections: WritableStreamDefaultWriter[] = []

  for (const writer of connections) {
    try {
      await writer.write(new TextEncoder().encode(message))
    } catch {
      deadConnections.push(writer)
    }
  }

  // Clean up dead connections
  for (const writer of deadConnections) {
    connections.delete(writer)
  }
}

// Export function to send transcript (called from transcript API)
export async function sendTranscriptToSession(
  sessionId: string,
  transcript: {
    id: string
    sequence: number
    originalText: string
    language: BhashiniLanguageCode
    translations: Record<string, string>
    confidence?: number
  }
) {
  await broadcastToSession(sessionId, {
    type: 'transcript',
    ...transcript,
    timestamp: new Date().toISOString(),
  })
}

// Export function to send translation update
export async function sendTranslationUpdate(
  sessionId: string,
  transcriptId: string,
  language: BhashiniLanguageCode,
  translatedText: string
) {
  await broadcastToSession(sessionId, {
    type: 'translation_update',
    transcriptId,
    language,
    translatedText,
  })
}

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting
  const clientIp = getClientIp(request)
  const rateLimit = rateLimiters.bhashiniRealtime(clientIp)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetTime)
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')
  const role = searchParams.get('role') as 'teacher' | 'student'
  const preferredLanguage = (searchParams.get('language') || 'en') as BhashiniLanguageCode

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 })
  }

  if (!role || !['teacher', 'student'].includes(role)) {
    return new Response('Invalid role', { status: 400 })
  }

  // Verify session exists and is active
  const classroomSession = await prisma.classroomSession.findUnique({
    where: { id: sessionId },
    include: { teacher: { select: { id: true, name: true } } },
  })

  if (!classroomSession) {
    return new Response('Session not found', { status: 404 })
  }

  if (classroomSession.status !== 'ACTIVE') {
    return new Response('Session is not active', { status: 400 })
  }

  // For teachers, verify they own the session
  if (role === 'teacher' && classroomSession.teacherId !== session.user.id) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Create SSE response
  const encoder = new TextEncoder()

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Initialize connection tracking
  if (!sessionConnections.has(sessionId)) {
    sessionConnections.set(sessionId, new Set())
    sessionParticipants.set(sessionId, new Map())
  }

  sessionConnections.get(sessionId)!.add(writer)

  // Track participant if student
  if (role === 'student') {
    const studentId = session.user.id
    const studentName = session.user.name || 'Student'

    sessionParticipants.get(sessionId)!.set(studentId, {
      name: studentName,
      language: preferredLanguage,
    })

    // Notify others of new participant
    broadcastToSession(sessionId, {
      type: 'participant_joined',
      participantId: studentId,
      studentId,
      name: studentName,
      preferredLang: preferredLanguage,
    })
  }

  // Send initial connection message
  const initMessage = `data: ${JSON.stringify({
    type: 'connected',
    sessionId,
    role,
    teacherName: classroomSession.teacher.name,
    sourceLanguage: classroomSession.sourceLanguage,
    targetLanguages: classroomSession.targetLanguages,
    participantCount: sessionParticipants.get(sessionId)?.size || 0,
  })}\n\n`

  writer.write(encoder.encode(initMessage))

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`))
    } catch {
      // Connection closed, cleanup will happen below
      clearInterval(heartbeatInterval)
    }
  }, 30000) // Every 30 seconds

  // Handle connection close
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval)

    // Remove connection
    const connections = sessionConnections.get(sessionId)
    if (connections) {
      connections.delete(writer)
      if (connections.size === 0) {
        sessionConnections.delete(sessionId)
      }
    }

    // Remove participant if student
    if (role === 'student') {
      const studentId = session.user.id
      const participants = sessionParticipants.get(sessionId)
      if (participants) {
        participants.delete(studentId)
        if (participants.size === 0) {
          sessionParticipants.delete(sessionId)
        }
      }

      // Notify others
      broadcastToSession(sessionId, {
        type: 'participant_left',
        studentId,
      })
    }

    writer.close()
  })

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
