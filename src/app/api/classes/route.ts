import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

// GET /api/classes - List classes for authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role

    // Teachers see only their assigned classes
    if (userRole === 'TEACHER') {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.id },
        include: {
          class: {
            include: {
              school: { select: { name: true } },
              _count: { select: { students: true } },
            },
          },
          subject: true,
        },
      })

      // Group by class
      const classMap = new Map<string, {
        id: string
        name: string
        grade: number
        section: string | null
        school: { name: string }
        studentCount: number
        subjects: string[]
      }>()

      teacherClasses.forEach((tc) => {
        const existing = classMap.get(tc.classId)
        if (existing) {
          existing.subjects.push(tc.subject.name)
        } else {
          classMap.set(tc.classId, {
            id: tc.class.id,
            name: tc.class.name,
            grade: tc.class.grade,
            section: tc.class.section,
            school: tc.class.school,
            studentCount: tc.class._count.students,
            subjects: [tc.subject.name],
          })
        }
      })

      return NextResponse.json({ classes: Array.from(classMap.values()) })
    }

    // Admins see all classes in their school
    if (userRole === 'ADMIN') {
      const classes = await prisma.class.findMany({
        where: { schoolId: session.user.schoolId! },
        include: {
          school: { select: { name: true } },
          _count: { select: { students: true } },
        },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      })

      return NextResponse.json({
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          section: c.section,
          school: c.school,
          studentCount: c._count.students,
        })),
      })
    }

    // Students see their own class
    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        include: {
          class: {
            include: {
              school: { select: { name: true } },
              _count: { select: { students: true } },
            },
          },
        },
      })

      if (!student) {
        return NextResponse.json({ classes: [] })
      }

      return NextResponse.json({
        classes: [{
          id: student.class.id,
          name: student.class.name,
          grade: student.class.grade,
          section: student.class.section,
          school: student.class.school,
          studentCount: student.class._count.students,
        }],
      })
    }

    return NextResponse.json({ classes: [] })
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}
