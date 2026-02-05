import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { Language, UserRole } from '@prisma/client'

// GET /api/lessons - List lessons for authenticated teacher
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: session.user.id,
        ...(subjectId && { subjectId }),
        ...(status && { status }),
      },
      include: {
        subject: true,
      },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: parseInt(limit) }),
    })

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    )
  }
}

// POST /api/lessons - Save a new lesson
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== UserRole.TEACHER && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { topic, generatedPlan, language, date, subjectId, classId, status = 'draft' } = body

    // Validate required fields
    if (!topic || !generatedPlan || !subjectId) {
      return NextResponse.json(
        { error: 'Topic, generatedPlan, and subjectId are required' },
        { status: 400 }
      )
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // If no classId provided, try to find teacher's first class or create without class association
    let finalClassId = classId
    if (!finalClassId) {
      // Find any class the teacher is assigned to
      const teacherClass = await prisma.teacherClass.findFirst({
        where: { teacherId: session.user.id },
        select: { classId: true },
      })

      if (teacherClass) {
        finalClassId = teacherClass.classId
      } else {
        // Create a default class for this teacher if none exists
        // This is a workaround - in production, classes should be managed by admin
        let defaultSchool = await prisma.school.findFirst()
        if (!defaultSchool) {
          defaultSchool = await prisma.school.create({
            data: { name: 'Default School', slug: 'default' },
          })
        }

        const defaultClass = await prisma.class.create({
          data: {
            name: 'General',
            grade: 5,
            schoolId: defaultSchool.id,
          },
        })
        finalClassId = defaultClass.id
      }
    }

    const lesson = await prisma.lesson.create({
      data: {
        topic,
        generatedPlan,
        language: language as Language || 'ENGLISH',
        date: date ? new Date(date) : new Date(),
        status,
        teacherId: session.user.id,
        subjectId,
        classId: finalClassId,
      },
      include: {
        subject: true,
      },
    })

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    )
  }
}
