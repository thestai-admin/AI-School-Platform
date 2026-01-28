import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { UserStatus } from '@prisma/client'

// Get pending teacher approvals
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const pendingTeachers = await prisma.user.findMany({
      where: {
        schoolId: session.user.schoolId,
        role: 'TEACHER',
        status: UserStatus.PENDING_APPROVAL,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        languagePreference: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      pendingTeachers,
      count: pendingTeachers.length,
    })
  } catch (error) {
    console.error('Error fetching pending teachers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending teachers' },
      { status: 500 }
    )
  }
}
