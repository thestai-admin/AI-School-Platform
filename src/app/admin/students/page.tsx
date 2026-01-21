'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Student {
  id: string
  rollNumber: string | null
  user: {
    id: string
    name: string
    email: string
  }
  class: {
    name: string
    grade: number
  }
  parent: {
    name: string
    email: string
  } | null
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch('/api/admin/students')
        const data = await res.json()
        if (res.ok) {
          setStudents(data.students || [])
        }
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const grades = [...new Set(students.map(s => s.class.grade))].sort((a, b) => a - b)
  const filteredStudents = filter === 'all'
    ? students
    : students.filter(s => s.class.grade === parseInt(filter))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="page-admin-students">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student accounts and class assignments</p>
        </div>
        <Button>Add New Student</Button>
      </div>

      {/* Grade Filter */}
      {grades.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Grades
          </button>
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setFilter(grade.toString())}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === grade.toString() ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Grade {grade}
            </button>
          ))}
        </div>
      )}

      {students.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No students yet</h3>
            <p className="text-gray-500 mb-4">Add your first student to get started.</p>
            <Button>Add New Student</Button>
          </CardContent>
        </Card>
      ) : (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>
              {filter === 'all' ? `All Students (${filteredStudents.length})` : `Grade ${filter} Students (${filteredStudents.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-green-600 font-medium">{student.user.name.charAt(0)}</span>
                          </div>
                          <span className="font-medium text-gray-900">{student.user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.rollNumber || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {student.class.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {student.parent ? student.parent.name : <span className="text-gray-400">Not linked</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button variant="ghost" size="sm">View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
