'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Module {
  id: string
  title: string
  description: string | null
  subject: string | null
  gradeRange: string | null
  duration: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  language: string
  tags: string[]
  category: {
    id: string
    name: string
    icon: string | null
  } | null
  enrolledCount: number
  userProgress: {
    progress: number
    status: string
  } | null
}

interface Category {
  id: string
  name: string
  icon: string | null
  moduleCount: number
  completedCount: number
  totalDuration: number
}

const difficultyColors = {
  EASY: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HARD: 'bg-red-100 text-red-800',
}

const statusColors = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CERTIFIED: 'bg-purple-100 text-purple-800',
}

function TrainingModulesContent() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')

  const [modules, setModules] = useState<Module[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || '')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchModules()
  }, [selectedCategory, selectedDifficulty])

  async function fetchCategories() {
    try {
      const res = await fetch('/api/training/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  async function fetchModules() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append('categoryId', selectedCategory)
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty)
      if (search) params.append('search', search)

      const res = await fetch(`/api/training/modules?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setModules(data.modules)
      }
    } catch (error) {
      console.error('Error fetching modules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchModules()
  }

  const filteredModules = modules.filter((module) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        module.title.toLowerCase().includes(searchLower) ||
        module.description?.toLowerCase().includes(searchLower) ||
        module.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      )
    }
    return true
  })

  return (
    <div data-testid="page-training-modules">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Modules</h1>
          <p className="text-gray-600 mt-1">
            Browse and complete training modules to enhance your teaching skills
          </p>
        </div>
        <Link href="/teacher/training">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: `${cat.icon || ''} ${cat.name}`,
                  })),
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                options={[
                  { value: '', label: 'All Levels' },
                  { value: 'EASY', label: 'Easy' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HARD', label: 'Advanced' },
                ]}
              />
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading modules...</p>
        </div>
      ) : filteredModules.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <Link key={module.id} href={`/teacher/training/modules/${module.id}`}>
              <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {module.category && (
                        <span className="text-lg">{module.category.icon || '📚'}</span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${difficultyColors[module.difficulty]}`}>
                        {module.difficulty}
                      </span>
                    </div>
                    {module.userProgress && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[module.userProgress.status as keyof typeof statusColors]}`}>
                        {module.userProgress.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {module.description || 'No description available'}
                  </p>

                  {/* Tags */}
                  {module.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {module.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {module.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{module.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {module.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {module.enrolledCount} enrolled
                    </span>
                  </div>

                  {/* Progress bar */}
                  {module.userProgress && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{module.userProgress.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${module.userProgress.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredModules.length > 0 && (
        <p className="mt-6 text-sm text-gray-500 text-center">
          Showing {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default function TrainingModulesPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading training modules...</p>
      </div>
    }>
      <TrainingModulesContent />
    </Suspense>
  )
}
