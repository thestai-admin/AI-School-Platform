'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ModuleContent {
  sections: Array<{
    id: string
    title: string
    type: 'video' | 'text' | 'quiz'
    content: string
    duration?: number
    questions?: Array<{
      id: string
      question: string
      options: string[]
      correctIndex: number
    }>
  }>
}

interface Module {
  id: string
  title: string
  description: string | null
  subject: string | null
  gradeRange: string | null
  content: ModuleContent
  duration: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  language: string
  tags: string[]
  category: {
    id: string
    name: string
    icon: string | null
    description: string | null
  } | null
  enrolledCount: number
  userProgress: {
    progress: number
    status: string
    startedAt: string | null
    completedAt: string | null
    quizScores: Record<string, number> | null
    timeSpentMins: number
  } | null
  prerequisites: Array<{
    id: string
    title: string
    completed: boolean
  }>
}

const difficultyColors = {
  EASY: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HARD: 'bg-red-100 text-red-800',
}

export default function ModuleViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [module, setModule] = useState<Module | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [showQuizResults, setShowQuizResults] = useState(false)

  useEffect(() => {
    fetchModule()
  }, [id])

  async function fetchModule() {
    try {
      const res = await fetch(`/api/training/modules/${id}`)
      if (!res.ok) {
        if (res.status === 403) {
          setError('This feature is not available with your current subscription')
        } else if (res.status === 404) {
          setError('Module not found')
        } else {
          setError('Failed to load module')
        }
        return
      }
      const data = await res.json()
      setModule(data.module)
    } catch {
      setError('Failed to load module')
    } finally {
      setIsLoading(false)
    }
  }

  async function updateProgress(progress: number, action?: string, quizScores?: Record<string, number>) {
    if (!module) return

    setIsUpdating(true)
    try {
      const res = await fetch(`/api/training/modules/${id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress,
          action,
          quizScores,
          timeSpentMins: 5, // Track time spent
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setModule((prev) =>
          prev ? { ...prev, userProgress: data.progress } : null
        )

        if (data.certification) {
          alert(data.certification.message)
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  function startModule() {
    updateProgress(0)
  }

  function handleNextSection() {
    if (!module) return

    const sections = module.content.sections || []
    const newSection = currentSection + 1
    const progress = Math.round((newSection / sections.length) * 100)

    if (newSection < sections.length) {
      setCurrentSection(newSection)
      setShowQuizResults(false)
      updateProgress(progress)
    } else {
      // Module completed
      updateProgress(100, 'complete')
    }
  }

  function handlePrevSection() {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
      setShowQuizResults(false)
    }
  }

  function handleQuizSubmit(sectionId: string) {
    if (!module) return

    const section = module.content.sections?.find((s) => s.id === sectionId)
    if (!section?.questions) return

    let correct = 0
    section.questions.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) {
        correct++
      }
    })

    const score = Math.round((correct / section.questions.length) * 100)
    setShowQuizResults(true)

    // Update quiz scores
    updateProgress(
      module.userProgress?.progress || 0,
      undefined,
      { [sectionId]: score }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <Link href="/teacher/training/modules">
          <Button variant="primary">← Back to Modules</Button>
        </Link>
      </div>
    )
  }

  if (!module) return null

  const sections = module.content.sections || []
  const currentSectionData = sections[currentSection]
  const hasStarted = module.userProgress !== null
  const isCompleted = module.userProgress?.status === 'COMPLETED'
  const hasUnmetPrereqs = module.prerequisites.some((p) => !p.completed)

  return (
    <div data-testid="page-module-viewer">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/teacher/training/modules"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to Modules
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            {module.category && (
              <span className="text-sm text-gray-600">
                {module.category.icon} {module.category.name}
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs rounded-full ${difficultyColors[module.difficulty]}`}>
              {module.difficulty}
            </span>
            <span className="text-sm text-gray-500">
              {module.duration} min
            </span>
          </div>
        </div>

        {isCompleted && (
          <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
            ✓ Completed
          </span>
        )}
      </div>

      {/* Prerequisites warning */}
      {hasUnmetPrereqs && (
        <Card variant="bordered" className="mb-6 border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-yellow-800 mb-2">
              Complete prerequisites first
            </h3>
            <ul className="space-y-1">
              {module.prerequisites
                .filter((p) => !p.completed)
                .map((prereq) => (
                  <li key={prereq.id} className="text-sm text-yellow-700">
                    • <Link href={`/teacher/training/modules/${prereq.id}`} className="underline">
                      {prereq.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar - Module outline */}
        <div className="lg:col-span-1">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-sm">Module Outline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <button
                      onClick={() => hasStarted && setCurrentSection(index)}
                      disabled={!hasStarted}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                        currentSection === index
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : hasStarted
                          ? 'hover:bg-gray-50 text-gray-700'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          index < currentSection || isCompleted
                            ? 'bg-green-100 text-green-700'
                            : index === currentSection && hasStarted
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {index < currentSection || isCompleted ? '✓' : index + 1}
                        </span>
                        <span className="flex-1 truncate">{section.title}</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-8">
                        {section.type === 'video' ? '🎬' : section.type === 'quiz' ? '📝' : '📖'}{' '}
                        {section.duration ? `${section.duration}m` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Progress card */}
          {module.userProgress && (
            <Card variant="bordered" className="mt-4">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Progress</h4>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${module.userProgress.progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {module.userProgress.progress}% complete
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Time spent: {module.userProgress.timeSpentMins} min
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main content area */}
        <div className="lg:col-span-3">
          {!hasStarted ? (
            /* Module intro */
            <Card variant="bordered">
              <CardContent className="p-8">
                <p className="text-gray-700 mb-6">{module.description}</p>

                {module.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {module.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
                  <span>📚 {sections.length} sections</span>
                  <span>⏱️ {module.duration} minutes</span>
                  <span>👥 {module.enrolledCount} enrolled</span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={startModule}
                  disabled={isUpdating || hasUnmetPrereqs}
                >
                  {isUpdating ? 'Starting...' : 'Start Learning'}
                </Button>
              </CardContent>
            </Card>
          ) : currentSectionData ? (
            /* Section content */
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>{currentSectionData.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentSectionData.type === 'text' && (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentSectionData.content }}
                  />
                )}

                {currentSectionData.type === 'video' && (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Video: {currentSectionData.content}</p>
                    </div>
                  </div>
                )}

                {currentSectionData.type === 'quiz' && currentSectionData.questions && (
                  <div className="space-y-6">
                    {currentSectionData.questions.map((q, qIndex) => (
                      <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-3">
                          {qIndex + 1}. {q.question}
                        </p>
                        <div className="space-y-2">
                          {q.options.map((option, oIndex) => (
                            <label
                              key={oIndex}
                              className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                                showQuizResults
                                  ? oIndex === q.correctIndex
                                    ? 'border-green-500 bg-green-50'
                                    : quizAnswers[q.id] === oIndex
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-200'
                                  : quizAnswers[q.id] === oIndex
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={quizAnswers[q.id] === oIndex}
                                onChange={() =>
                                  !showQuizResults &&
                                  setQuizAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: oIndex,
                                  }))
                                }
                                disabled={showQuizResults}
                                className="w-4 h-4"
                              />
                              <span>{option}</span>
                              {showQuizResults && oIndex === q.correctIndex && (
                                <span className="ml-auto text-green-600">✓</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {!showQuizResults && (
                      <Button
                        variant="primary"
                        onClick={() => handleQuizSubmit(currentSectionData.id)}
                        disabled={
                          Object.keys(quizAnswers).length <
                          (currentSectionData.questions?.length || 0)
                        }
                      >
                        Submit Quiz
                      </Button>
                    )}

                    {showQuizResults && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-900">
                          Quiz completed! Score:{' '}
                          {module.userProgress?.quizScores?.[currentSectionData.id] || 0}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevSection}
                    disabled={currentSection === 0}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleNextSection}
                    disabled={
                      isUpdating ||
                      (currentSectionData.type === 'quiz' && !showQuizResults)
                    }
                  >
                    {currentSection === sections.length - 1
                      ? 'Complete Module'
                      : 'Next →'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Completion state */
            <Card variant="bordered">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Congratulations!
                </h2>
                <p className="text-gray-600 mb-6">
                  You have completed this training module.
                </p>
                <div className="flex justify-center gap-4">
                  <Link href="/teacher/training/modules">
                    <Button variant="outline">Browse More Modules</Button>
                  </Link>
                  <Link href="/teacher/training">
                    <Button variant="primary">View Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
