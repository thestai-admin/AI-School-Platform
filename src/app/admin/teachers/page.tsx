'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Teacher {
  id: string
  name: string
  email: string
  createdAt: string
  teacherClasses: {
    class: { name: string }
    subject: { name: string }
  }[]
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const res = await fetch('/api/admin/teachers')
        const data = await res.json()
        if (res.ok) {
          setTeachers(data.teachers || [])
        }
      } catch (error) {
        console.error('Error fetching teachers:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTeachers()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading teachers...</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="page-admin-teachers">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600">Manage teacher accounts and assignments</p>
        </div>
        <Button>Add New Teacher</Button>
      </div>

      {teachers.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No teachers yet</h3>
            <p className="text-gray-500 mb-4">Add your first teacher to get started.</p>
            <Button>Add New Teacher</Button>
          </CardContent>
        </Card>
      ) : (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>All Teachers ({teachers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher) => {
                    const subjects = [...new Set(teacher.teacherClasses.map(tc => tc.subject.name))]
                    const classes = [...new Set(teacher.teacherClasses.map(tc => tc.class.name))]
                    return (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 font-medium">{teacher.name.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-gray-900">{teacher.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{teacher.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {subjects.slice(0, 3).map((subject) => (
                              <span key={subject} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                {subject}
                              </span>
                            ))}
                            {subjects.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                +{subjects.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{classes.length} classes</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button variant="ghost" size="sm">View</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
