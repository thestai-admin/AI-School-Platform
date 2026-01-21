'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Class {
  id: string
  name: string
  grade: number
  section: string
  _count: {
    students: number
    teacherClasses: number
  }
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch('/api/admin/classes')
        const data = await res.json()
        if (res.ok) {
          setClasses(data.classes || [])
        }
      } catch (error) {
        console.error('Error fetching classes:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchClasses()
  }, [])

  // Group classes by grade
  const classesByGrade = classes.reduce((acc, cls) => {
    if (!acc[cls.grade]) acc[cls.grade] = []
    acc[cls.grade].push(cls)
    return acc
  }, {} as Record<number, Class[]>)

  const grades = Object.keys(classesByGrade).map(Number).sort((a, b) => a - b)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="page-admin-classes">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-600">Manage classes and sections</p>
        </div>
        <Button>Create New Class</Button>
      </div>

      {classes.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-500 mb-4">Create your first class to get started.</p>
            <Button>Create New Class</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grades.map((grade) => (
            <Card key={grade} variant="bordered">
              <CardHeader>
                <CardTitle>Grade {grade}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classesByGrade[grade].sort((a, b) => a.section.localeCompare(b.section)).map((cls) => (
                    <div
                      key={cls.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          Section {cls.section}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>{cls._count.students} students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{cls._count.teacherClasses} teachers</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
