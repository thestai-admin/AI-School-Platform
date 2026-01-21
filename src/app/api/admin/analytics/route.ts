import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    console.log('[Analytics API] Session:', JSON.stringify(session, null, 2))

    if (!session?.user) {
      console.log('[Analytics API] No session user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      console.log('[Analytics API] User role is not ADMIN:', session.user.role)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const schoolId = session.user.schoolId
    console.log('[Analytics API] schoolId:', schoolId)

    if (!schoolId) {
      console.log('[Analytics API] No schoolId in session - returning error')
      return NextResponse.json({ error: 'No school associated with user' }, { status: 400 })
    }

    // Get counts in parallel
    const [
      totalTeachers,
      totalStudents,
      totalClasses,
      totalLessons,
      totalWorksheets,
      totalHomework,
      homeworkSubmissions,
      recentLessons,
      recentHomework,
    ] = await Promise.all([
      prisma.user.count({
        where: { schoolId, role: 'TEACHER' },
      }),
      prisma.student.count({
        where: { user: { schoolId } },
      }),
      prisma.class.count({
        where: { schoolId },
      }),
      prisma.lesson.count({
        where: { teacher: { schoolId } },
      }),
      prisma.worksheet.count({
        where: { createdBy: { schoolId } },
      }),
      prisma.homework.count({
        where: { class: { schoolId } },
      }),
      prisma.homeworkSubmission.groupBy({
        by: ['status'],
        where: { homework: { class: { schoolId } } },
        _count: true,
      }),
      prisma.lesson.findMany({
        where: { teacher: { schoolId } },
        select: {
          topic: true,
          createdAt: true,
          teacher: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.homework.findMany({
        where: { class: { schoolId } },
        select: {
          title: true,
          createdAt: true,
          teacher: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    console.log('[Analytics API] Query results:', {
      totalTeachers,
      totalStudents,
      totalClasses,
      totalLessons,
      totalWorksheets,
      totalHomework,
    })

    // Process homework stats
    const homeworkStats = {
      pending: 0,
      submitted: 0,
      graded: 0,
    }
    homeworkSubmissions.forEach((s) => {
      if (s.status === 'PENDING') homeworkStats.pending = s._count
      else if (s.status === 'SUBMITTED') homeworkStats.submitted = s._count
      else if (s.status === 'GRADED') homeworkStats.graded = s._count
    })

    // Build recent activity
    const recentActivity: { type: string; description: string; timestamp: string }[] = []

    recentLessons.forEach((lesson) => {
      recentActivity.push({
        type: 'lesson',
        description: `${lesson.teacher.name} created lesson: ${lesson.topic}`,
        timestamp: lesson.createdAt.toISOString(),
      })
    })

    recentHomework.forEach((hw) => {
      recentActivity.push({
        type: 'homework',
        description: `${hw.teacher.name} assigned homework: ${hw.title}`,
        timestamp: hw.createdAt.toISOString(),
      })
    })

    // Sort by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      analytics: {
        totalTeachers,
        totalStudents,
        totalClasses,
        totalLessons,
        totalWorksheets,
        totalHomework,
        homeworkStats,
        recentActivity: recentActivity.slice(0, 10),
      },
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
