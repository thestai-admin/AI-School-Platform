import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        class: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    // Fetch all homework submissions with graded status
    const homeworkSubmissions = await prisma.homeworkSubmission.findMany({
      where: {
        studentId: student.id,
        status: 'GRADED',
      },
      include: {
        homework: {
          select: {
            questions: true,
            subjectId: true,
          },
        },
      },
    })

    // Count questions answered
    const questionsAnswered = homeworkSubmissions.reduce((total, submission) => {
      const homework = submission.homework
      const questions = homework.questions as Array<{ id: string }>
      return total + questions.length
    }, 0)

    // Calculate average score
    const totalPercentage = homeworkSubmissions.reduce((sum, submission) => {
      return sum + (submission.percentage || 0)
    }, 0)
    const averageScore = homeworkSubmissions.length > 0
      ? Math.round(totalPercentage / homeworkSubmissions.length)
      : 0

    // Count chat messages (doubts cleared)
    const chatHistories = await prisma.chatHistory.findMany({
      where: { studentId: student.id },
      select: { messages: true },
    })

    const doubtsCleared = chatHistories.reduce((total, chat) => {
      const messages = chat.messages as Array<{ role: string }>
      // Count student messages (each represents a doubt/question)
      return total + messages.filter(m => m.role === 'user').length
    }, 0)

    // Count worksheet responses
    const worksheetsDone = await prisma.worksheetResponse.count({
      where: { studentId: student.id },
    })

    // Fetch student progress by subject
    const studentProgress = await prisma.studentProgress.findMany({
      where: { studentId: student.id },
      include: {
        subject: {
          select: { id: true, name: true },
        },
      },
    })

    // Get all subjects for the student's grade
    const allSubjects = await prisma.subject.findMany({
      where: {
        OR: [
          { gradeLevel: student.class.grade },
          { gradeLevel: null }, // General subjects
        ],
      },
      select: { id: true, name: true },
    })

    // Build subject progress map
    const subjectProgressMap = new Map(
      studentProgress.map(sp => [
        sp.subjectId,
        {
          subjectId: sp.subjectId,
          subjectName: sp.subject.name,
          metrics: sp.metrics as {
            topicsCompleted?: number
            averageScore?: number
            strengths?: string[]
            weaknesses?: string[]
          },
          updatedAt: sp.updatedAt,
        },
      ])
    )

    // Calculate progress percentage per subject based on homework submissions
    const subjectStats = new Map<string, { totalScore: number; count: number }>()

    for (const submission of homeworkSubmissions) {
      const subjectId = submission.homework.subjectId
      const current = subjectStats.get(subjectId) || { totalScore: 0, count: 0 }
      subjectStats.set(subjectId, {
        totalScore: current.totalScore + (submission.percentage || 0),
        count: current.count + 1,
      })
    }

    // Combine progress data with subject stats
    const subjectProgress = allSubjects.map(subject => {
      const progress = subjectProgressMap.get(subject.id)
      const stats = subjectStats.get(subject.id)
      const progressPercentage = stats
        ? Math.round(stats.totalScore / stats.count)
        : progress?.metrics?.averageScore || 0

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        progress: progressPercentage,
        topicsCompleted: progress?.metrics?.topicsCompleted || 0,
        averageScore: stats
          ? Math.round(stats.totalScore / stats.count)
          : progress?.metrics?.averageScore || 0,
        strengths: progress?.metrics?.strengths || [],
        weaknesses: progress?.metrics?.weaknesses || [],
        homeworkCount: stats?.count || 0,
      }
    })

    return NextResponse.json({
      overallStats: {
        questionsAnswered,
        averageScore,
        worksheetsDone,
        doubtsCleared,
      },
      subjectProgress,
    })
  } catch (error) {
    console.error('Error fetching student progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    )
  }
}
