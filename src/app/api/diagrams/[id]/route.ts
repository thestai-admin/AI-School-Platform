import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { DiagramType, DiagramVisibility } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check if user can access diagram
async function canAccessDiagram(
  userId: string,
  userRole: string,
  userSchoolId: string,
  studentClassId: string | null,
  diagram: {
    createdById: string
    visibility: DiagramVisibility
    schoolId: string
    classId: string | null
  }
): Promise<boolean> {
  // Owner can always access
  if (diagram.createdById === userId) return true

  // Must be same school
  if (diagram.schoolId !== userSchoolId) return false

  // Admin can access all in school
  if (userRole === 'ADMIN') return true

  // Check visibility
  if (diagram.visibility === 'SCHOOL') return true

  if (diagram.visibility === 'CLASS' && diagram.classId) {
    // Teachers can access diagrams shared with any class
    if (userRole === 'TEACHER') return true
    // Students can access if it's their class
    if (userRole === 'STUDENT' && studentClassId === diagram.classId) return true
  }

  return false
}

// GET /api/diagrams/[id] - Get a single diagram
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { student: true },
    })

    if (!user || !user.schoolId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const diagram = await prisma.diagram.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        class: {
          select: { id: true, name: true, grade: true },
        },
        lesson: {
          select: { id: true, topic: true },
        },
      },
    })

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = await canAccessDiagram(
      user.id,
      user.role,
      user.schoolId,
      user.student?.classId || null,
      diagram
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(diagram)
  } catch (error) {
    console.error('Error fetching diagram:', error)
    return NextResponse.json(
      { error: 'Failed to fetch diagram' },
      { status: 500 }
    )
  }
}

// PUT /api/diagrams/[id] - Update a diagram
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.schoolId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find diagram and check ownership
    const diagram = await prisma.diagram.findUnique({
      where: { id },
    })

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 })
    }

    // Only owner or admin can update
    if (diagram.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      visibility,
      nodes,
      edges,
      viewport,
      classId,
    } = body

    // Validate type if provided
    if (type && !['FLOWCHART', 'DECISION_TREE', 'CONCEPT_MAP', 'LESSON_FLOW'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid diagram type' },
        { status: 400 }
      )
    }

    // Validate visibility if provided
    if (visibility && !['PRIVATE', 'CLASS', 'SCHOOL'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility' },
        { status: 400 }
      )
    }

    // If classId provided, verify it exists
    if (classId !== undefined && classId !== null) {
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

    const updatedDiagram = await prisma.diagram.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type !== undefined && { type: type as DiagramType }),
        ...(visibility !== undefined && { visibility: visibility as DiagramVisibility }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(viewport !== undefined && { viewport: viewport || null }),
        ...(classId !== undefined && { classId: classId || null }),
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

    return NextResponse.json(updatedDiagram)
  } catch (error) {
    console.error('Error updating diagram:', error)
    return NextResponse.json(
      { error: 'Failed to update diagram' },
      { status: 500 }
    )
  }
}

// DELETE /api/diagrams/[id] - Delete a diagram
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find diagram and check ownership
    const diagram = await prisma.diagram.findUnique({
      where: { id },
    })

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 })
    }

    // Only owner or admin can delete
    if (diagram.createdById !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.diagram.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting diagram:', error)
    return NextResponse.json(
      { error: 'Failed to delete diagram' },
      { status: 500 }
    )
  }
}
