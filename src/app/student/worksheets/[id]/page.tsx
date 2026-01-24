'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  question: string
  type?: string
  options?: string[]
  correctAnswer: string
  marks?: number
}

interface Worksheet {
  id: string
  title: string
  difficulty: string
  language: string
  subject: {
    name: string
  }
  createdBy: {
    name: string
  }
  questions: Question[]
}

interface WorksheetResponse {
  id: string
  answers: Array<{
    questionId: string
    answer: string
    isCorrect?: boolean
    marks?: number
  }>
  score: number
  completedAt: string
}

export default function StudentWorksheetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const worksheetId = params.id as string

  const [worksheet, setWorksheet] = useState<Worksheet | null>(null)
  const [response, setResponse] = useState<WorksheetResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ totalScore: number; maxScore: number; percentage: number } | null>(null)

  useEffect(() => {
    async function fetchWorksheet() {
      try {
        const res = await fetch(`/api/worksheets/${worksheetId}`)
        if (!res.ok) {
          throw new Error('Failed to fetch worksheet')
        }
        const data = await res.json()
        setWorksheet(data.worksheet)
        setResponse(data.response)
        setSubmitted(!!data.response)

        // Pre-fill answers if already submitted
        if (data.response) {
          const existingAnswers: Record<string, string> = {}
          data.response.answers.forEach((ans: { questionId: string; answer: string }) => {
            existingAnswers[ans.questionId] = ans.answer
          })
          setAnswers(existingAnswers)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchWorksheet()
  }, [worksheetId])

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!worksheet) return

    // Validate all questions are answered
    const unanswered = worksheet.questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`)
      return
    }

    setSubmitting(true)
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }))

      const res = await fetch(`/api/worksheets/${worksheetId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      })

      if (!res.ok) {
        throw new Error('Failed to submit worksheet')
      }

      const data = await res.json()
      setResult({
        totalScore: data.totalScore,
        maxScore: data.maxScore,
        percentage: data.percentage,
      })
      setResponse(data.response)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !worksheet) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card variant="bordered" className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error || 'Worksheet not found'}</p>
            <Button variant="outline" onClick={() => router.push('/student/worksheets')} className="mt-4">
              Back to Worksheets
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toUpperCase()) {
      case 'EASY':
        return 'bg-green-100 text-green-700'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700'
      case 'HARD':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getAnswerStatus = (questionId: string) => {
    if (!response) return null
    const ans = response.answers.find(a => a.questionId === questionId)
    return ans
  }

  return (
    <div data-testid="page-student-worksheet-detail" className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/student/worksheets')} className="mb-4">
          ← Back to Worksheets
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{worksheet.title}</h1>
            <p className="text-gray-600 mt-1">
              {worksheet.subject.name} • By {worksheet.createdBy.name}
            </p>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${getDifficultyColor(worksheet.difficulty)}`}>
            {worksheet.difficulty}
          </span>
        </div>
      </div>

      {/* Result Summary (if submitted) */}
      {submitted && result && (
        <Card variant="bordered" className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-green-700 mb-2">Worksheet Completed!</h2>
              <div className="text-4xl font-bold text-green-700 mb-2">{result.percentage}%</div>
              <p className="text-gray-700">
                You scored {result.totalScore} out of {result.maxScore} marks
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {worksheet.questions.map((question, index) => {
              const answerStatus = getAnswerStatus(question.id)
              const isCorrect = answerStatus?.isCorrect

              return (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-gray-700">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-gray-900 mb-3">{question.question}</p>

                      {question.type === 'mcq' && question.options ? (
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <label
                              key={optIndex}
                              className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${
                                submitted
                                  ? option === question.correctAnswer
                                    ? 'border-green-500 bg-green-50'
                                    : answers[question.id] === option && !isCorrect
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-200'
                                  : answers[question.id] === option
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={answers[question.id] === option}
                                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                disabled={submitted}
                                className="text-blue-600"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          disabled={submitted}
                          placeholder="Type your answer here..."
                          className={`w-full px-4 py-2 border rounded ${
                            submitted
                              ? isCorrect
                                ? 'border-green-500 bg-green-50'
                                : 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                          }`}
                        />
                      )}

                      {submitted && answerStatus && (
                        <div className={`mt-2 text-sm ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {isCorrect ? (
                            <span>✓ Correct! (+{answerStatus.marks} marks)</span>
                          ) : (
                            <span>✗ Incorrect. Correct answer: {question.correctAnswer}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {!submitted && (
        <div className="mt-6 flex justify-end gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Worksheet'}
          </Button>
        </div>
      )}
    </div>
  )
}
