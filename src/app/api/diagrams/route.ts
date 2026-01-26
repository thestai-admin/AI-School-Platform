import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { DiagramType, DiagramVisibility, Prisma } from '@prisma/client'

// GET /api/diagrams - List diagrams for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as DiagramType | null
    const visibility = searchParams.get('visibility') as DiagramVisibility | null
    const classId = searchParams.get('classId')
    const limit = searchParams.get('limit')

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        student: true,
      },
    })

    if (!user || !user.schoolId) {
      return NextResponse.json({ error: 'User not found or no school assigned' }, { status: 404 })
    }

    // Build where clause based on user role and visibility
    let whereClause: Prisma.DiagramWhereInput = {
      schoolId: user.schoolId,
    }

    // Role-based filtering
    switch (user.role) {
      case 'ADMIN':
        // Admins can see all diagrams in their school
        break

      case 'TEACHER':
        // Teachers can see their own diagrams + CLASS/SCHOOL visible diagrams
        whereClause = {
          schoolId: user.schoolId,
          OR: [
            { createdById: user.id },
            { visibility: 'SCHOOL' },
            {
              AND: [
                { visibility: 'CLASS' },
                { classId: classId || undefined },
              ],
            },
          ],
        }
        break

      case 'STUDENT':
        // Students can see their own diagrams + diagrams shared with their class or school
        const studentClassId = user.student?.classId
        whereClause = {
          schoolId: user.schoolId,
          OR: [
            { createdById: user.id },
            { visibility: 'SCHOOL' },
            ...(studentClassId
              ? [{ AND: [{ visibility: 'CLASS' as const }, { classId: studentClassId }] }]
              : []),
          ],
        }
        break

      case 'PARENT':
        // Parents can see SCHOOL visibility diagrams only
        whereClause = {
          schoolId: user.schoolId,
          visibility: 'SCHOOL',
        }
        break
    }

    // Apply additional filters
    if (type) {
      whereClause.type = type
    }
    if (visibility && user.role === 'ADMIN') {
      whereClause.visibility = visibility
    }
    if (classId && user.role !== 'STUDENT') {
      whereClause.classId = classId
    }

    const diagrams = await prisma.diagram.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true, grade: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      ...(limit && { take: parseInt(limit) }),
    })

    return NextResponse.json({ diagrams })
  } catch (error) {
    console.error('Error fetching diagrams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch diagrams' },
      { status: 500 }
    )
  }
}

// POST /api/diagrams - Create a new diagram
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.schoolId) {
      return NextResponse.json(
        { error: 'User not found or no school assigned' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      type = 'FLOWCHART',
      visibility = 'PRIVATE',
      nodes = [],
      edges = [],
      viewport,
      classId,
      lessonId,
    } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Validate type and visibility
    if (!['FLOWCHART', 'DECISION_TREE', 'CONCEPT_MAP', 'LESSON_FLOW'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid diagram type' },
        { status: 400 }
      )
    }

    if (!['PRIVATE', 'CLASS', 'SCHOOL'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility' },
        { status: 400 }
      )
    }

    // If classId provided, verify it exists and user has access
    if (classId) {
      const classExists = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: user.schoolId,
        },
      })
      if (!classExists) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
        )
      }
    }

    // If lessonId provided, verify it exists and user owns it
    if (lessonId) {
      const lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          teacherId: user.id,
        },
      })
      if (!lesson) {
        return NextResponse.json(
          { error: 'Lesson not found or not owned by user' },
          { status: 404 }
        )
      }

      // Check if lesson already has a diagram
      const existingDiagram = await prisma.diagram.findUnique({
        where: { lessonId },
      })
      if (existingDiagram) {
        return NextResponse.json(
          { error: 'Lesson already has a diagram' },
          { status: 400 }
        )
      }
    }

    const diagram = await prisma.diagram.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: type as DiagramType,
        visibility: visibility as DiagramVisibility,
        nodes,
        edges,
        viewport: viewport || null,
        createdById: user.id,
        schoolId: user.schoolId,
        classId: classId || null,
        lessonId: lessonId || null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true, grade: true },
        },
      },
    })

    return NextResponse.json(diagram, { status: 201 })
  } catch (error) {
    console.error('Error creating diagram:', error)
    return NextResponse.json(
      { error: 'Failed to create diagram' },
      { status: 500 }
    )
  }
}
