'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  moduleCount: number
  completedCount: number
  totalDuration: number
}

interface Certification {
  id: string
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  earnedAt: string
}

interface CertificationData {
  certifications: Certification[]
  stats: {
    total: number
    notStarted: number
    inProgress: number
    completed: number
  }
  currentLevel: string | null
  nextCertification: {
    level: string
    requiredModules: number
    currentProgress: number
    remaining: number
  } | null
}

const levelColors = {
  BRONZE: 'bg-amber-100 text-amber-800 border-amber-300',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PLATINUM: 'bg-purple-100 text-purple-800 border-purple-300',
}

const levelIcons = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
}

export default function TrainingDashboard() {
  const [categories, setCategories] = useState<Category[]>([])
  const [certData, setCertData] = useState<CertificationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesRes, certsRes] = await Promise.all([
          fetch('/api/training/categories'),
          fetch('/api/training/certifications'),
        ])

        if (categoriesRes.ok) {
          const data = await categoriesRes.json()
          setCategories(data.categories)
        }

        if (certsRes.ok) {
          const data = await certsRes.json()
          setCertData(data)
        }
      } catch (error) {
        console.error('Error fetching training data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalModules = categories.reduce((sum, c) => sum + c.moduleCount, 0)
  const totalCompleted = categories.reduce((sum, c) => sum + c.completedCount, 0)
  const overallProgress = totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0

  return (
    <div data-testid="page-teacher-training">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Training</h1>
        <p className="text-gray-600 mt-1">
          Enhance your teaching skills with our AI-powered training modules
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overall Progress</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '-' : `${overallProgress}%`}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Modules Completed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '-' : `${totalCompleted}/${totalModules}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '-' : certData?.stats.inProgress || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Level</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? '-' : certData?.currentLevel ? (
                    <span className="flex items-center gap-2">
                      {levelIcons[certData.currentLevel as keyof typeof levelIcons]}
                      {certData.currentLevel}
                    </span>
                  ) : 'None'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Certification Progress */}
      {certData?.nextCertification && (
        <Card variant="bordered" className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Next Certification: {levelIcons[certData.nextCertification.level as keyof typeof levelIcons]}{' '}
                  {certData.nextCertification.level}
                </h3>
                <p className="text-sm text-gray-600">
                  Complete {certData.nextCertification.remaining} more modules to earn this badge
                </p>
              </div>
              <span className="text-sm text-gray-500">
                {certData.nextCertification.currentProgress} / {certData.nextCertification.requiredModules} modules
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                style={{
                  width: `${(certData.nextCertification.currentProgress / certData.nextCertification.requiredModules) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Categories</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading training modules...</p>
        </div>
      ) : categories.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No training modules available</h3>
            <p className="text-gray-500">Check back later for new training content</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.id} href={`/teacher/training/modules?category=${category.id}`}>
              <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                      {category.icon || '📚'}
                    </div>
                    <span className="text-sm text-gray-500">
                      {category.moduleCount} modules
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {category.description || 'Explore training modules in this category'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {category.completedCount}/{category.moduleCount} completed
                    </span>
                    <span className="text-sm text-gray-500">
                      ~{Math.round(category.totalDuration / 60)}h total
                    </span>
                  </div>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${category.moduleCount > 0 ? (category.completedCount / category.moduleCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Certifications Earned */}
      {certData?.certifications && certData.certifications.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Certifications</h2>
          <div className="flex flex-wrap gap-4">
            {certData.certifications.map((cert) => (
              <div
                key={cert.id}
                className={`px-4 py-3 rounded-lg border-2 ${levelColors[cert.level]}`}
              >
                <span className="text-2xl mr-2">{levelIcons[cert.level]}</span>
                <span className="font-medium">{cert.level}</span>
                <span className="text-sm ml-2 opacity-75">
                  Earned {new Date(cert.earnedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/teacher/training/modules"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Browse All Modules →
        </Link>
      </div>
    </div>
  )
}
