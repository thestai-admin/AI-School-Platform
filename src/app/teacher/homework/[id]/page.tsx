'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Submission {
  id: string
  studentId: string
  studentName: string
  rollNumber: string | null
  status: 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE'
  submittedAt: string | null
  gradedAt: string | null
  totalScore: number | null
  percentage: number | null
  isLate: boolean
  answers: GradedAnswer[]
  aiFeedback: AIFeedback | null
  teacherReview: string | null
}

interface GradedAnswer {
  questionId: string
  answer: string
  isCorrect?: boolean
  marksAwarded?: number
  feedback?: string
}

interface AIFeedback {
  overallFeedback: string
  strengths: string[]
  weaknesses: string[]
  suggestedTopics: string[]
}

interface HomeworkDetail {
  id: string
  title: string
  dueDate: string
  totalMarks: number
  class: { name: string }
  subject: { name: string }
}

interface Stats {
  totalStudents: number
  pending: number
  submitted: number
  graded: number
  late: number
  averageScore: number | null
}

export default function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [homework, setHomework] = useState<HomeworkDetail | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/homework/${id}/submissions`)
        const data = await res.json()

        if (res.ok) {
          setHomework(data.homework)
          setSubmissions(data.submissions)
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Error fetching homework:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  const filteredSubmissions = submissions.filter((s) => {
    if (filter === 'all') return true
    return s.status.toLowerCase() === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GRADED':
        return 'bg-green-100 text-green-700'
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-700'
      case 'PENDING':
        return 'bg-gray-100 text-gray-700'
      case 'LATE':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return 'text-gray-500'
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!homework) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Homework not found</h2>
        <Link href="/teacher/homework" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to homework list
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-teacher-homework-detail">
      {/* Header */}
      <div className="mb-6">
        <Link href="/teacher/homework" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Homework
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{homework.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
          <span>{homework.class.name}</span>
          <span>{homework.subject.name}</span>
          <span>Due: {new Date(homework.dueDate).toLocaleDateString()}</span>
          <span>{homework.totalMarks} marks</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.submitted}</p>
              <p className="text-sm text-gray-500">Submitted</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
              <p className="text-sm text-gray-500">Graded</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {stats.averageScore !== null ? `${Math.round(stats.averageScore)}%` : '-'}
              </p>
              <p className="text-sm text-gray-500">Avg Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'submitted', 'graded'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions Table */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900">{submission.studentName}</p>
                        {submission.rollNumber && (
                          <p className="text-sm text-gray-500">Roll: {submission.rollNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                        {submission.status}
                        {submission.isLate && ' (Late)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.status === 'GRADED' ? (
                        <div>
                          <span className={`font-semibold ${getScoreColor(submission.percentage)}`}>
                            {submission.totalScore}/{homework.totalMarks}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({Math.round(submission.percentage || 0)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.status !== 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          View Details
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedSubmission.studentName}</h3>
                  <p className="text-sm text-gray-500">
                    Submitted: {selectedSubmission.submittedAt
                      ? new Date(selectedSubmission.submittedAt).toLocaleString()
                      : 'Not submitted'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Score Summary */}
              {selectedSubmission.status === 'GRADED' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Score</p>
                      <p className={`text-3xl font-bold ${getScoreColor(selectedSubmission.percentage)}`}>
                        {selectedSubmission.totalScore}/{homework.totalMarks}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Percentage</p>
                      <p className={`text-3xl font-bold ${getScoreColor(selectedSubmission.percentage)}`}>
                        {Math.round(selectedSubmission.percentage || 0)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Feedback */}
              {selectedSubmission.aiFeedback && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">AI Feedback</h4>
                  <p className="text-gray-700 mb-4">{selectedSubmission.aiFeedback.overallFeedback}</p>

                  {selectedSubmission.aiFeedback.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-green-700 mb-1">Strengths:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {selectedSubmission.aiFeedback.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedSubmission.aiFeedback.weaknesses.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-red-700 mb-1">Areas to Improve:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {selectedSubmission.aiFeedback.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedSubmission.aiFeedback.suggestedTopics.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Suggested Topics to Review:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubmission.aiFeedback.suggestedTopics.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Answer Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Answer Details</h4>
                <div className="space-y-4">
                  {selectedSubmission.answers.map((ans, idx) => (
                    <div key={ans.questionId} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">Q{idx + 1}</span>
                        {ans.marksAwarded !== undefined && (
                          <span className={`text-sm font-medium ${
                            ans.isCorrect ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {ans.marksAwarded} marks
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">
                        <span className="text-gray-500">Answer: </span>
                        {ans.answer || '(No answer)'}
                      </p>
                      {ans.feedback && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {ans.isCorrect ? '✓ ' : '✗ '}
                          {ans.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Review */}
              {selectedSubmission.teacherReview && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Teacher&apos;s Note</h4>
                  <p className="text-blue-800">{selectedSubmission.teacherReview}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
