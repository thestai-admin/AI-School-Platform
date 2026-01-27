'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Milestone {
  id: string
  title: string
  description?: string
  topics: string[]
  estimatedDays: number
  targetScore: number
  completed: boolean
  resources?: string[]
}

interface LearningPath {
  id: string
  subject: string
  examType: string | null
  currentLevel: number
  targetLevel: number
  progress: number
  milestones: Milestone[]
  weakAreas: string[]
  strongAreas: string[]
  recommendedDailyTime: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function LearningPathDetailPage() {
  const params = useParams()
  const pathId = params.id as string

  const [path, setPath] = useState<LearningPath | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)

  useEffect(() => {
    fetchPath()
  }, [pathId])

  async function fetchPath() {
    try {
      const res = await fetch(`/api/study/learning-path/${pathId}`)
      if (res.status === 403) {
        const data = await res.json()
        setError(data.reason || 'Feature not available')
        return
      }
      if (res.status === 404) {
        setError('Learning path not found')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPath(data.path)
      }
    } catch (err) {
      console.error('Error fetching learning path:', err)
      setError('Failed to load learning path')
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleMilestoneCompletion(milestoneId: string, completed: boolean) {
    if (!path) return

    const updatedMilestones = path.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed } : m
    )
    const completedCount = updatedMilestones.filter((m) => m.completed).length
    const newProgress = Math.round((completedCount / updatedMilestones.length) * 100)

    try {
      const res = await fetch(`/api/study/learning-path/${pathId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: updatedMilestones,
          progress: newProgress,
        }),
      })

      if (res.ok) {
        setPath({
          ...path,
          milestones: updatedMilestones,
          progress: newProgress,
        })
      }
    } catch (err) {
      console.error('Error updating milestone:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading learning path...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <Link href="/student/learning-path">
          <Button variant="primary">← Back to Learning Paths</Button>
        </Link>
      </div>
    )
  }

  if (!path) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Learning path not found</h2>
        <Link href="/student/learning-path">
          <Button variant="primary">← Back to Learning Paths</Button>
        </Link>
      </div>
    )
  }

  const completedMilestones = path.milestones.filter((m) => m.completed).length
  const nextMilestone = path.milestones.find((m) => !m.completed)

  return (
    <div data-testid="page-learning-path-detail">
      {/* Header */}
      <div className="mb-6">
        <Link href="/student/learning-path" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Learning Paths
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{path.subject}</h1>
              {path.examType && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {path.examType.replace('_', ' ')}
                </span>
              )}
              {path.isActive && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-gray-600">
              Level {path.currentLevel} → {path.targetLevel} | {path.recommendedDailyTime} min/day recommended
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{path.progress}%</p>
            <p className="text-sm text-gray-500">Complete</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
          style={{ width: `${path.progress}%` }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{completedMilestones}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">
              {path.milestones.length - completedMilestones}
            </p>
            <p className="text-sm text-gray-500">Remaining</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{path.strongAreas.length}</p>
            <p className="text-sm text-gray-500">Strong Areas</p>
          </CardContent>
        </Card>
        <Card variant="bordered">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{path.weakAreas.length}</p>
            <p className="text-sm text-gray-500">Weak Areas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Milestones List */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h2>
          <div className="space-y-4">
            {path.milestones.map((milestone, index) => (
              <Card
                key={milestone.id}
                variant="bordered"
                className={`${milestone.completed ? 'bg-green-50 border-green-200' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleMilestoneCompletion(milestone.id, !milestone.completed)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        milestone.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {milestone.completed ? '✓' : index + 1}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-medium ${
                            milestone.completed ? 'text-green-800' : 'text-gray-900'
                          }`}>
                            {milestone.title}
                          </h3>
                          {milestone.description && (
                            <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedMilestone(
                            expandedMilestone === milestone.id ? null : milestone.id
                          )}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedMilestone === milestone.id ? '▲' : '▼'}
                        </button>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>~{milestone.estimatedDays} days</span>
                        <span>Target: {milestone.targetScore}%</span>
                      </div>

                      {expandedMilestone === milestone.id && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Topics</h4>
                            <div className="flex flex-wrap gap-1">
                              {milestone.topics.map((topic) => (
                                <span
                                  key={topic}
                                  className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>

                          {milestone.resources && milestone.resources.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Resources</h4>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {milestone.resources.map((resource, i) => (
                                  <li key={i}>{resource}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <Link href={`/student/competitive/${path.examType || 'CBSE_BOARD'}?subject=${path.subject}&topic=${milestone.topics[0]}`}>
                              <Button variant="outline" size="sm">
                                Practice Questions
                              </Button>
                            </Link>
                            <Link href="/student/companion">
                              <Button variant="outline" size="sm">
                                Study with AI
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Next Milestone */}
          {nextMilestone && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Up Next</CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium text-gray-900 mb-2">{nextMilestone.title}</h3>
                <div className="flex flex-wrap gap-1 mb-4">
                  {nextMilestone.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <Link href={`/student/companion?subject=${path.subject}&topic=${nextMilestone.topics[0]}`}>
                  <Button variant="primary" className="w-full">
                    Start Studying
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Weak Areas */}
          {path.weakAreas.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Focus Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {path.weakAreas.map((area) => (
                    <li key={area} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span className="text-sm text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/student/competitive/${path.examType || 'CBSE_BOARD'}?subject=${path.subject}`}>
                  <Button variant="outline" className="w-full mt-4">
                    Practice Weak Areas
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Strong Areas */}
          {path.strongAreas.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {path.strongAreas.map((area) => (
                    <li key={area} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/student/companion" className="block">
                <Button variant="outline" className="w-full justify-start">
                  🤖 AI Study Companion
                </Button>
              </Link>
              <Link href="/student/analytics" className="block">
                <Button variant="outline" className="w-full justify-start">
                  📊 View Analytics
                </Button>
              </Link>
              <Link href={`/student/competitive/${path.examType || 'CBSE_BOARD'}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  📝 Practice Questions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
