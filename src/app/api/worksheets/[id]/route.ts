import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/worksheets/[id] - Get single worksheet
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const worksheet = await prisma.worksheet.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        createdBy: { select: { name: true, schoolId: true } },
      },
    })

    if (!worksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 })
    }

    // Teachers can only view their own worksheets
    if (session.user.role === 'TEACHER' && worksheet.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Students can view worksheets assigned to their class
    if (session.user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
      })

      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
      }

      if (worksheet.classId !== student.classId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Include student's response if exists
      const response = await prisma.worksheetResponse.findUnique({
        where: {
          studentId_worksheetId: {
            studentId: student.id,
            worksheetId: id,
          },
        },
      })

      return NextResponse.json({ worksheet, response })
    }

    // Admins can only view worksheets created by users in their school
    if (session.user.role === 'ADMIN' && worksheet.createdBy.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ worksheet })
  } catch (error) {
    console.error('Error fetching worksheet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch worksheet' },
      { status: 500 }
    )
  }
}

// DELETE /api/worksheets/[id] - Delete worksheet
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check worksheet exists and user owns it
    const existingWorksheet = await prisma.worksheet.findUnique({
      where: { id },
      include: { createdBy: { select: { schoolId: true } } },
    })

    if (!existingWorksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 })
    }

    // Teachers can only delete their own worksheets
    if (session.user.role === 'TEACHER' && existingWorksheet.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins can only delete worksheets created by users in their school
    if (session.user.role === 'ADMIN' && existingWorksheet.createdBy.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.worksheet.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting worksheet:', error)
    return NextResponse.json(
      { error: 'Failed to delete worksheet' },
      { status: 500 }
    )
  }
}
