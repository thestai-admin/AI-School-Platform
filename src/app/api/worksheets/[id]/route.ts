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
      },
    })

    if (!worksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 })
    }

    // Ensure user owns this worksheet
    if (worksheet.createdById !== session.user.id && session.user.role !== 'ADMIN') {
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
    })

    if (!existingWorksheet) {
      return NextResponse.json({ error: 'Worksheet not found' }, { status: 404 })
    }

    if (existingWorksheet.createdById !== session.user.id && session.user.role !== 'ADMIN') {
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
