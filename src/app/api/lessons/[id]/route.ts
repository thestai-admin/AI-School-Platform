import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/lessons/[id] - Get single lesson
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Ensure user owns this lesson
    if (lesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    )
  }
}

// PUT /api/lessons/[id] - Update lesson status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, topic } = body

    // Check lesson exists and user owns it
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
    })

    if (!existingLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (existingLesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(topic && { topic }),
      },
      include: {
        subject: true,
      },
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error updating lesson:', error)
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    )
  }
}

// DELETE /api/lessons/[id] - Delete lesson
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check lesson exists and user owns it
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
    })

    if (!existingLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (existingLesson.teacherId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.lesson.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    )
  }
}
