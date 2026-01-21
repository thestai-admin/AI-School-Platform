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

    const teachers = await prisma.user.findMany({
      where: {
        schoolId: session.user.schoolId,
        role: 'TEACHER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        teacherClasses: {
          select: {
            class: {
              select: { name: true },
            },
            subject: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ teachers })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })
  }
}
