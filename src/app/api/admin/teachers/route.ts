import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { UserStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as UserStatus | null
    const pending = searchParams.get('pending')

    // Build where clause
    const whereClause: {
      schoolId: string | undefined
      role: 'TEACHER'
      status?: UserStatus
    } = {
      schoolId: session.user.schoolId,
      role: 'TEACHER',
    }

    // Filter by status if provided
    if (pending === 'true') {
      whereClause.status = UserStatus.PENDING_APPROVAL
    } else if (status && Object.values(UserStatus).includes(status)) {
      whereClause.status = status
    }

    const teachers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        emailVerified: true,
        approvedAt: true,
        languagePreference: true,
        teacherClasses: {
          select: {
            class: {
              select: { name: true, grade: true },
            },
            subject: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { name: 'asc' },
      ],
    })

    // Get counts by status
    const statusCounts = await prisma.user.groupBy({
      by: ['status'],
      where: {
        schoolId: session.user.schoolId,
        role: 'TEACHER',
      },
      _count: true,
    })

    const counts = {
      total: teachers.length,
      pending: statusCounts.find((s) => s.status === UserStatus.PENDING_APPROVAL)?._count || 0,
      active: statusCounts.find((s) => s.status === UserStatus.ACTIVE)?._count || 0,
      suspended: statusCounts.find((s) => s.status === UserStatus.SUSPENDED)?._count || 0,
      rejected: statusCounts.find((s) => s.status === UserStatus.REJECTED)?._count || 0,
    }

    return NextResponse.json({ teachers, counts })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })
  }
}
