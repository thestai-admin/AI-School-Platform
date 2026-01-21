import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const students = await prisma.student.findMany({
      where: {
        user: {
          schoolId: session.user.schoolId,
        },
      },
      select: {
        id: true,
        rollNumber: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        class: {
          select: {
            name: true,
            grade: true,
          },
        },
        parent: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { class: { grade: 'asc' } },
        { class: { section: 'asc' } },
        { rollNumber: 'asc' },
      ],
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
