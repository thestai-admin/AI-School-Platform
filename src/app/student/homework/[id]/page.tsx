'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  type: 'mcq' | 'fill_blank' | 'short_answer' | 'problem'
  question: string
  options?: string[]
  correctAnswer?: string
  maxMarks: number
}

interface GradedAnswer {
  questionId: string
  answer: string
  isCorrect?: boolean
  marksAwarded?: number
  feedback?: string
}

interface Submission {
  id: string
  status: string
  totalScore: number | null
  percentage: number | null
  submittedAt: string | null
  answers: GradedAnswer[]
  aiFeedback: {
    overallFeedback: string
    strengths: string[]
    weaknesses: string[]
    suggestedTopics: string[]
  } | null
}

interface Homework {
  id: string
  title: string
  instructions: string | null
  questions: Question[]
  totalMarks: number
  dueDate: string
  difficulty: string
  language: string
  subject: { name: string }
  teacher: { name: string }
  submissions: Submission[]
}

export default function StudentHomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [homework, setHomework] = useState<Homework | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchHomework() {
      try {
        const res = await fetch(`/api/homework/${id}`)
        const data = await res.json()
        if (res.ok) {
          setHomework(data.homework)

          // If already submitted, populate answers
          const submission = data.homework.submissions?.[0]
          if (submission && submission.answers) {
            const existingAnswers: Record<string, string> = {}
            submission.answers.forEach((a: GradedAnswer) => {
              existingAnswers[a.questionId] = a.answer
            })
            setAnswers(existingAnswers)
          }
        }
      } catch (error) {
        console.error('Error fetching homework:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHomework()
  }, [id])

  const submission = homework?.submissions?.[0]
  const isSubmitted = submission?.status === 'SUBMITTED' || submission?.status === 'GRADED'
  const isGraded = submission?.status === 'GRADED'
  const isOverdue = homework ? new Date(homework.dueDate) < new Date() : false

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!homework) return

    setError('')
    setIsSubmitting(true)

    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }))

      const res = await fetch(`/api/homework/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: formattedAnswers,
          autoGrade: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit homework')
      }

      // Refresh homework data
      const refreshRes = await fetch(`/api/homework/${id}`)
      const refreshData = await refreshRes.json()
      if (refreshRes.ok) {
        setHomework(refreshData.homework)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit homework')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading homework...</p>
        </div>
      </div>
    )
  }

  if (!homework) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Homework not found</h2>
        <Link href="/student/homework" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to homework list
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/student/homework" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Homework
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{homework.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
          <span>{homework.subject.name}</span>
          <span>by {homework.teacher.name}</span>
          <span>{homework.totalMarks} marks</span>
        </div>
        <div className="mt-2">
          {isGraded ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Graded - {Math.round(submission?.percentage || 0)}%
            </span>
          ) : isSubmitted ? (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Submitted - Awaiting Grading
            </span>
          ) : isOverdue ? (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              Overdue - Due {new Date(homework.dueDate).toLocaleDateString()}
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
              Due: {new Date(homework.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Instructions */}
      {homework.instructions && (
        <Card variant="bordered" className="mb-6">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{homework.instructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Summary (if graded) */}
      {isGraded && submission && (
        <Card variant="bordered" className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Your Results</h3>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  (submission.percentage || 0) >= 60 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {submission.totalScore}/{homework.totalMarks}
                </p>
                <p className="text-sm text-gray-500">{Math.round(submission.percentage || 0)}%</p>
              </div>
            </div>

            {submission.aiFeedback && (
              <div className="space-y-4">
                <p className="text-gray-700">{submission.aiFeedback.overallFeedback}</p>

                {submission.aiFeedback.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">What you did well:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {submission.aiFeedback.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {submission.aiFeedback.weaknesses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-orange-700 mb-1">Areas to improve:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {submission.aiFeedback.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {submission.aiFeedback.suggestedTopics.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Topics to revise:</p>
                    <div className="flex flex-wrap gap-2">
                      {submission.aiFeedback.suggestedTopics.map((t, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {homework.questions.map((q, idx) => {
          const gradedAnswer = submission?.answers?.find((a: GradedAnswer) => a.questionId === q.id)

          return (
            <Card key={q.id} variant="bordered">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-medium text-gray-500">
                    Question {idx + 1} ({q.type.replace('_', ' ')})
                  </span>
                  <span className="text-sm text-gray-500">{q.maxMarks} marks</span>
                </div>

                <p className="text-gray-900 font-medium mb-4">{q.question}</p>

                {/* Answer Input based on type */}
                {q.type === 'mcq' && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[q.id] === option
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        } ${isSubmitted ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={option}
                          checked={answers[q.id] === option}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          disabled={isSubmitted}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span>{option}</span>
                        {isGraded && q.correctAnswer === option && (
                          <span className="ml-auto text-green-600">✓ Correct</span>
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    disabled={isSubmitted}
                    rows={q.type === 'problem' ? 6 : 3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      isSubmitted ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                    }`}
                    placeholder="Type your answer here..."
                  />
                )}

                {/* Graded Feedback */}
                {isGraded && gradedAnswer && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    gradedAnswer.isCorrect ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {gradedAnswer.isCorrect ? (
                        <span className="text-green-600 font-medium">✓ Correct</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Incorrect</span>
                      )}
                      <span className="text-sm text-gray-600">
                        ({gradedAnswer.marksAwarded}/{q.maxMarks} marks)
                      </span>
                    </div>
                    {gradedAnswer.feedback && (
                      <p className="text-sm text-gray-700">{gradedAnswer.feedback}</p>
                    )}
                    {!gradedAnswer.isCorrect && q.correctAnswer && (
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Correct answer: </span>
                        {q.correctAnswer}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Submit Button */}
      {!isSubmitted && (
        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length === 0}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Submitting & Grading...
              </>
            ) : (
              <>
                Submit Homework
                {isOverdue && <span className="ml-2 text-xs">(Late submission)</span>}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Already Submitted Message */}
      {isSubmitted && !isGraded && (
        <Card variant="bordered" className="mt-6 bg-blue-50">
          <CardContent className="p-6 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-blue-900">Homework Submitted!</h3>
            <p className="text-blue-700 mt-1">Your answers are being graded. Check back soon for results.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
