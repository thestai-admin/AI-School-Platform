import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requireFeature } from '@/lib/features/feature-gate'
import { generateWithAI } from '@/lib/ai/provider'
import { getTeachingTipSystemPrompt, getTeachingTipUserPrompt } from '@/lib/prompts/training'
import { Language } from '@prisma/client'
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/training/tips/generate
 * Generate AI teaching tips for a topic
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check feature access - requires advanced training feature
  if (session.user.schoolId) {
    const featureError = await requireFeature(session.user.schoolId, 'ai_teaching_tips')
    if (featureError) return featureError
  }

  // Rate limiting
  const identifier = session.user.id || getClientIp(request)
  const limit = rateLimiters.ai(identifier)
  if (!limit.success) {
    return rateLimitResponse(limit.resetTime)
  }

  try {
    const body = await request.json()
    const {
      topic,
      subject,
      gradeLevel,
      specificChallenge,
      language = 'ENGLISH',
      save = true,
    } = body

    if (!topic || !subject || !gradeLevel) {
      return NextResponse.json(
        { error: 'Topic, subject, and gradeLevel are required' },
        { status: 400 }
      )
    }

    // Generate AI tips
    const systemPrompt = getTeachingTipSystemPrompt(language as Language)
    const userPrompt = getTeachingTipUserPrompt({
      topic,
      subject,
      gradeLevel,
      specificChallenge,
    })

    const aiResponse = await generateWithAI(systemPrompt, userPrompt, {
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Parse the response to extract structured data
    const parsedTip = parseTeachingTipResponse(aiResponse)

    // Save to database if requested
    let savedTip = null
    if (save) {
      savedTip = await prisma.teachingTip.create({
        data: {
          topic,
          subject,
          gradeLevel,
          tip: parsedTip.mainTip,
          methodology: parsedTip.methodology,
          commonMistake: parsedTip.commonMistakes,
          aiGenerated: true,
        },
      })
    }

    return NextResponse.json({
      generatedContent: aiResponse,
      parsedTip,
      savedTip,
    })
  } catch (error) {
    console.error('Error generating teaching tips:', error)
    return NextResponse.json(
      { error: 'Failed to generate teaching tips' },
      { status: 500 }
    )
  }
}

/**
 * Parse AI response into structured teaching tip
 */
function parseTeachingTipResponse(response: string): {
  mainTip: string
  methodology: string | null
  commonMistakes: string | null
  activities: string[]
} {
  // Extract main teaching tip section
  const mainTipMatch = response.match(/## Main Teaching Tip\n([\s\S]*?)(?=\n## |$)/)
  const mainTip = mainTipMatch ? mainTipMatch[1].trim() : response.slice(0, 500)

  // Extract methodology from implementation section
  const methodMatch = response.match(/## Step-by-Step Implementation\n([\s\S]*?)(?=\n## |$)/)
  const methodology = methodMatch ? methodMatch[1].trim().slice(0, 500) : null

  // Extract common mistakes
  const mistakesMatch = response.match(/## Common Student Mistakes\n([\s\S]*?)(?=\n## |$)/)
  const commonMistakes = mistakesMatch ? mistakesMatch[1].trim().slice(0, 500) : null

  // Extract activities
  const activitiesMatch = response.match(/## Engaging Activities\n([\s\S]*?)(?=\n## |$)/)
  const activitiesText = activitiesMatch ? activitiesMatch[1] : ''
  const activities = activitiesText
    .split(/\d+\.\s/)
    .filter(Boolean)
    .map((a) => a.trim())

  return {
    mainTip,
    methodology,
    commonMistakes,
    activities,
  }
}
