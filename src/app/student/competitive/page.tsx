'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Analytics {
  totalStudyTime: number
  totalSessions: number
  totalQuestions: number
  avgAccuracy: number
  currentStreak: number
}

const EXAM_OPTIONS = [
  {
    id: 'JEE_MAIN',
    name: 'JEE Main',
    description: 'Joint Entrance Examination for engineering',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    icon: '⚡',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'JEE_ADVANCED',
    name: 'JEE Advanced',
    description: 'For IIT admissions',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    icon: '🎯',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'NEET',
    name: 'NEET',
    description: 'National Eligibility Entrance Test for medical',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    icon: '🏥',
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'OLYMPIAD',
    name: 'Olympiad',
    description: 'National/International Science & Math Olympiads',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: 'CBSE_BOARD',
    name: 'CBSE Board',
    description: 'Board exam preparation',
    subjects: ['All Subjects'],
    icon: '📚',
    color: 'bg-orange-100 text-orange-800',
  },
]

export default function CompetitiveExamPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/study/analytics?days=30')
      if (res.status === 403) {
        const data = await res.json()
        setError(data.reason || 'Feature not available')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data.summary)
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setIsLoading(false)
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
    <div data-testid="page-competitive">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Competitive Exam Prep</h1>
        <p className="text-gray-600 mt-1">
          Prepare for JEE, NEET, Olympiads and more
        </p>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {Math.round(analytics.totalStudyTime / 60)}h
              </p>
              <p className="text-sm text-gray-500">Study Time (30d)</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {analytics.totalQuestions}
              </p>
              <p className="text-sm text-gray-500">Questions Practiced</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">
                {analytics.avgAccuracy}%
              </p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">
                {analytics.currentStreak} 🔥
              </p>
              <p className="text-sm text-gray-500">Day Streak</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exam Selection */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Exam</h2>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXAM_OPTIONS.map((exam) => (
            <Link key={exam.id} href={`/student/competitive/${exam.id}`}>
              <Card variant="bordered" className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${exam.color}`}>
                      {exam.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {exam.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {exam.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {exam.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Link href="/student/companion">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                🤖
              </div>
              <div>
                <h4 className="font-medium text-gray-900">AI Study Companion</h4>
                <p className="text-sm text-gray-500">Get help 24/7</p>
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
                <h4 className="font-medium text-gray-900">Learning Paths</h4>
                <p className="text-sm text-gray-500">Personalized study plan</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/student/analytics">
          <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                📊
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Analytics</h4>
                <p className="text-sm text-gray-500">Track your progress</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
