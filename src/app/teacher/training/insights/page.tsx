'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Metrics {
  lessonsCreated: number
  worksheetsGenerated: number
  homeworkAssigned: number
  avgStudentScore: number
  trainingModulesCompleted: number
  communityPosts: number
  period: string
}

interface Snapshot {
  id: string
  period: string
  metrics: Metrics
  studentOutcomes: {
    avgScore: number
    progressRate: number
    completionRate: number
  }
  aiInsights: {
    summary: string
    strengths: string[]
    growthAreas: string[]
    recommendedActions: string[]
    suggestedTraining: string[]
  }
  recommendations: string[]
  createdAt: string
}

export default function InsightsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [generatedInsights, setGeneratedInsights] = useState<Snapshot['aiInsights'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [])

  async function fetchInsights() {
    try {
      const res = await fetch('/api/training/insights')
      if (!res.ok) {
        if (res.status === 403) {
          setError('This feature is not available with your current subscription')
        } else {
          setError('Failed to load insights')
        }
        return
      }
      const data = await res.json()
      setMetrics(data.currentMetrics)
      setSnapshots(data.snapshots)

      // Use most recent AI insights if available
      if (data.snapshots[0]?.aiInsights) {
        setGeneratedInsights(data.snapshots[0].aiInsights)
      }
    } catch {
      setError('Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }

  async function generateInsights() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/training/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save: true }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await res.json()
      setGeneratedInsights(data.parsedInsights)
      if (data.snapshot) {
        setSnapshots((prev) => [data.snapshot, ...prev.slice(0, 11)])
      }
    } catch (err) {
      console.error('Error generating insights:', err)
    } finally {
      setIsGenerating(false)
    }
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <Link href="/teacher/training">
          <Button variant="primary">← Back to Training</Button>
        </Link>
      </div>
    )
  }

  return (
    <div data-testid="page-insights">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Insights</h1>
          <p className="text-gray-600 mt-1">
            AI-powered analysis of your teaching performance
          </p>
        </div>
        <Button
          variant="primary"
          onClick={generateInsights}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate New Insights'}
        </Button>
      </div>

      {/* Current Metrics */}
      {metrics && (
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{metrics.lessonsCreated}</p>
              <p className="text-sm text-gray-500">Lessons Created</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{metrics.worksheetsGenerated}</p>
              <p className="text-sm text-gray-500">Worksheets</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{metrics.homeworkAssigned}</p>
              <p className="text-sm text-gray-500">Homework</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{metrics.avgStudentScore}%</p>
              <p className="text-sm text-gray-500">Avg Student Score</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{metrics.trainingModulesCompleted}</p>
              <p className="text-sm text-gray-500">Training Done</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-pink-600">{metrics.communityPosts}</p>
              <p className="text-sm text-gray-500">Community Posts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {generatedInsights ? (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Summary */}
          <Card variant="bordered" className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span> Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{generatedInsights.summary}</p>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <span className="text-xl">💪</span> Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {generatedInsights.strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Growth Areas */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <span className="text-xl">🎯</span> Growth Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {generatedInsights.growthAreas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">→</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommended Actions */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <span className="text-xl">📋</span> Recommended Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 list-decimal list-inside">
                {generatedInsights.recommendedActions.map((action, i) => (
                  <li key={i} className="text-gray-700">{action}</li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Suggested Training */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <span className="text-xl">📚</span> Suggested Training
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {generatedInsights.suggestedTraining.map((training, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <span className="text-gray-700">{training}</span>
                  </li>
                ))}
              </ul>
              <Link href="/teacher/training/modules" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
                Browse Training Modules →
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card variant="bordered" className="mb-8">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No insights generated yet
            </h3>
            <p className="text-gray-500 mb-4">
              Click the button above to generate AI-powered insights based on your teaching activity
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historical Snapshots */}
      {snapshots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historical Snapshots</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {snapshots.slice(0, 6).map((snapshot) => (
              <Card key={snapshot.id} variant="bordered">
                <CardContent className="p-4">
                  <p className="font-medium text-gray-900 mb-2">{snapshot.period}</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Lessons: {(snapshot.metrics as Metrics).lessonsCreated}</p>
                    <p>Avg Score: {snapshot.studentOutcomes?.avgScore || 0}%</p>
                    <p>Created: {new Date(snapshot.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
