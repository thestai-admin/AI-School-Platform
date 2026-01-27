'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

interface PracticeQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  difficulty: string
  subject: string
  topic: string
}

interface PracticeAttempt {
  questionId: string
  answer: string
  isCorrect: boolean
}

const EXAM_CONFIG: Record<string, {
  name: string
  subjects: string[]
  description: string
  icon: string
  color: string
}> = {
  JEE_MAIN: {
    name: 'JEE Main',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'Joint Entrance Examination for NITs, IIITs and other engineering colleges',
    icon: '⚡',
    color: 'bg-blue-100 text-blue-800',
  },
  JEE_ADVANCED: {
    name: 'JEE Advanced',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    description: 'For admission to Indian Institutes of Technology (IITs)',
    icon: '🎯',
    color: 'bg-purple-100 text-purple-800',
  },
  NEET: {
    name: 'NEET',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    description: 'National Eligibility cum Entrance Test for medical admissions',
    icon: '🏥',
    color: 'bg-green-100 text-green-800',
  },
  OLYMPIAD: {
    name: 'Olympiad',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    description: 'National and International Science & Math Olympiads',
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-800',
  },
  CBSE_BOARD: {
    name: 'CBSE Board',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    description: 'Central Board of Secondary Education board exams',
    icon: '📚',
    color: 'bg-orange-100 text-orange-800',
  },
}

export default function ExamPracticePage() {
  const params = useParams()
  const examType = params.examType as string
  const config = EXAM_CONFIG[examType]

  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing questions
  useEffect(() => {
    if (selectedSubject) {
      fetchQuestions()
    }
  }, [selectedSubject, selectedTopic, difficulty])

  async function fetchQuestions() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        examType,
        subject: selectedSubject,
        difficulty,
        ...(selectedTopic && { topic: selectedTopic }),
      })
      const res = await fetch(`/api/study/practice?${params}`)
      if (res.status === 403) {
        const data = await res.json()
        setError(data.reason || 'Feature not available')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
        setCurrentIndex(0)
        setSelectedAnswer(null)
        setShowExplanation(false)
      }
    } catch (err) {
      console.error('Error fetching questions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function generateQuestions() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/study/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          topic: selectedTopic || undefined,
          difficulty,
          questionCount: 5,
          questionTypes: ['MCQ'],
          examType,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
        setCurrentIndex(0)
        setSelectedAnswer(null)
        setShowExplanation(false)
      }
    } catch (err) {
      console.error('Error generating questions:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  async function submitAnswer() {
    if (!selectedAnswer || !questions[currentIndex]) return

    const question = questions[currentIndex]
    const isCorrect = selectedAnswer === question.correctAnswer

    // Record attempt
    try {
      await fetch(`/api/study/practice/${question.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: selectedAnswer,
          isCorrect,
          timeTaken: 60, // Placeholder
          hintsUsed: 0,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }

    setAttempts([...attempts, {
      questionId: question.id,
      answer: selectedAnswer,
      isCorrect,
    }])
    setShowExplanation(true)
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    }
  }

  function previousQuestion() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    }
  }

  const currentQuestion = questions[currentIndex]
  const currentAttempt = attempts.find(a => a.questionId === currentQuestion?.id)
  const correctCount = attempts.filter(a => a.isCorrect).length

  if (!config) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Exam type not found</h2>
        <Link href="/student/competitive">
          <Button variant="primary">← Back to Exams</Button>
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <Link href="/student/competitive">
          <Button variant="primary">← Back to Exams</Button>
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-exam-practice">
      {/* Header */}
      <div className="mb-6">
        <Link href="/student/competitive" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Competitive Exams
        </Link>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${config.color}`}>
            {config.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.name} Practice</h1>
            <p className="text-gray-600">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value)
                  setSelectedTopic('')
                }}
                placeholder="Select subject"
                options={config.subjects.map((sub) => ({ value: sub, label: sub }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
              <input
                type="text"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder="e.g., Mechanics, Organic Chemistry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                options={[
                  { value: 'EASY', label: 'Easy' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HARD', label: 'Hard' },
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={generateQuestions}
                disabled={!selectedSubject || isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Stats */}
      {attempts.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{attempts.length}</p>
              <p className="text-sm text-gray-500">Attempted</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              <p className="text-sm text-gray-500">Correct</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Question Card */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading questions...</p>
        </div>
      ) : !selectedSubject ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
              📝
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subject</h3>
            <p className="text-gray-500">Choose a subject to start practicing {config.name} questions</p>
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
              🎯
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Yet</h3>
            <p className="text-gray-500 mb-4">Generate AI-powered practice questions</p>
            <Button
              variant="primary"
              onClick={generateQuestions}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Questions'}
            </Button>
          </CardContent>
        </Card>
      ) : currentQuestion ? (
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Question {currentIndex + 1} of {questions.length}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  currentQuestion.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                  currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentQuestion.difficulty}
                </span>
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {currentQuestion.subject}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-lg text-gray-900 mb-1">{currentQuestion.question}</p>
              {currentQuestion.topic && (
                <p className="text-sm text-gray-500">Topic: {currentQuestion.topic}</p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, i) => {
                const letter = String.fromCharCode(65 + i)
                const isSelected = selectedAnswer === letter
                const isCorrect = letter === currentQuestion.correctAnswer
                const showResult = showExplanation

                return (
                  <button
                    key={i}
                    onClick={() => !showExplanation && setSelectedAnswer(letter)}
                    disabled={showExplanation}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                      showResult
                        ? isCorrect
                          ? 'border-green-500 bg-green-50'
                          : isSelected
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-500 text-white'
                            : isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                          : isSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrect && (
                        <span className="text-green-600">✓</span>
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <span className="text-red-600">✗</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className={`p-4 rounded-lg mb-6 ${
                currentAttempt?.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  currentAttempt?.isCorrect ? 'text-green-800' : 'text-red-800'
                }`}>
                  {currentAttempt?.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </h4>
                <p className="text-gray-700">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={currentIndex === 0}
              >
                ← Previous
              </Button>

              {!showExplanation ? (
                <Button
                  variant="primary"
                  onClick={submitAnswer}
                  disabled={!selectedAnswer}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={nextQuestion}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next Question →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Links */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <Link href="/student/companion">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                🤖
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Need Help?</h4>
                <p className="text-sm text-gray-500">Ask AI Study Companion for explanations</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/student/learning-path">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                📈
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Learning Path</h4>
                <p className="text-sm text-gray-500">Get a personalized {config.name} study plan</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
