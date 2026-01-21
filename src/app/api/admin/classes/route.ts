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

    const classes = await prisma.class.findMany({
      where: {
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        name: true,
        grade: true,
        section: true,
        _count: {
          select: {
            students: true,
            teacherClasses: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    })

    return NextResponse.json({ classes })
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
  }
}
