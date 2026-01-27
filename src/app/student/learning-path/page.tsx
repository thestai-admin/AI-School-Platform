'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

interface Milestone {
  id: string
  title: string
  topics: string[]
  estimatedDays: number
  targetScore: number
  completed: boolean
}

interface LearningPath {
  id: string
  subject: string
  examType: string | null
  currentLevel: number
  targetLevel: number
  progress: number
  milestones: Milestone[]
  isActive: boolean
  createdAt: string
}

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
]

const EXAM_TYPES = [
  { value: '', label: 'General/School' },
  { value: 'JEE_MAIN', label: 'JEE Main' },
  { value: 'JEE_ADVANCED', label: 'JEE Advanced' },
  { value: 'NEET', label: 'NEET' },
]

export default function LearningPathPage() {
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newPath, setNewPath] = useState({
    subject: '',
    examType: '',
    currentLevel: 3,
    targetLevel: 8,
    dailyTime: 120,
  })

  useEffect(() => {
    fetchPaths()
  }, [])

  async function fetchPaths() {
    try {
      const res = await fetch('/api/study/learning-path')
      if (res.status === 403) {
        const data = await res.json()
        setError(data.reason || 'Feature not available')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPaths(data.paths)
      }
    } catch (err) {
      console.error('Error fetching paths:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreatePath() {
    if (!newPath.subject) {
      alert('Please select a subject')
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/study/learning-path/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newPath.subject,
          examType: newPath.examType || undefined,
          currentLevel: newPath.currentLevel,
          targetLevel: newPath.targetLevel,
          dailyAvailableTime: newPath.dailyTime,
          weakAreas: [],
          strongAreas: [],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.path) {
          setPaths((prev) => [data.path, ...prev])
        }
        setShowCreateForm(false)
        setNewPath({
          subject: '',
          examType: '',
          currentLevel: 3,
          targetLevel: 8,
          dailyTime: 120,
        })
      }
    } catch (err) {
      console.error('Error creating path:', err)
    } finally {
      setIsCreating(false)
    }
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <Link href="/student">
          <Button variant="primary">← Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-learning-paths">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Paths</h1>
          <p className="text-gray-600 mt-1">
            AI-generated personalized study plans
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Path'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card variant="bordered" className="mb-6">
          <CardHeader>
            <CardTitle>Create Learning Path</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <Select
                  value={newPath.subject}
                  onChange={(e) => setNewPath({ ...newPath, subject: e.target.value })}
                  placeholder="Select subject"
                  options={SUBJECTS.map((sub) => ({ value: sub, label: sub }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Type
                </label>
                <Select
                  value={newPath.examType}
                  onChange={(e) => setNewPath({ ...newPath, examType: e.target.value })}
                  options={EXAM_TYPES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Level (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newPath.currentLevel}
                  onChange={(e) => setNewPath({ ...newPath, currentLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="text-center text-gray-600">{newPath.currentLevel}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Level (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newPath.targetLevel}
                  onChange={(e) => setNewPath({ ...newPath, targetLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="text-center text-gray-600">{newPath.targetLevel}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Study Time: {newPath.dailyTime} minutes
                </label>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="30"
                  value={newPath.dailyTime}
                  onChange={(e) => setNewPath({ ...newPath, dailyTime: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={handleCreatePath}
                disabled={isCreating || !newPath.subject}
              >
                {isCreating ? 'Generating...' : 'Generate AI Path'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paths List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading paths...</p>
        </div>
      ) : paths.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
              📈
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No learning paths yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first personalized learning path
            </p>
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              Create Path
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paths.map((path) => (
            <Link key={path.id} href={`/student/learning-path/${path.id}`}>
              <Card
                variant="bordered"
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  !path.isActive ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {path.subject}
                        </h3>
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
                      <p className="text-sm text-gray-500 mt-1">
                        Level {path.currentLevel} → {path.targetLevel}
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {path.progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                      style={{ width: `${path.progress}%` }}
                    />
                  </div>

                  {/* Milestones preview */}
                  <div className="flex items-center gap-2">
                    {(path.milestones || []).slice(0, 5).map((milestone, i) => (
                      <div
                        key={milestone.id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          milestone.completed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title={milestone.title}
                      >
                        {milestone.completed ? '✓' : i + 1}
                      </div>
                    ))}
                    {(path.milestones || []).length > 5 && (
                      <span className="text-sm text-gray-500">
                        +{path.milestones.length - 5} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
