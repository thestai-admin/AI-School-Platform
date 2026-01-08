'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const gradeOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `Class ${i + 1}`,
}))

const subjectOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Science', label: 'Science' },
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Social Science', label: 'Social Science' },
  { value: 'Computer Science', label: 'Computer Science' },
]

const languageOptions = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'HINDI', label: 'Hindi' },
  { value: 'MIXED', label: 'Hinglish (Mixed)' },
]

export default function LessonPlannerPage() {
  const [formData, setFormData] = useState({
    grade: '5',
    subject: 'Mathematics',
    topic: '',
    language: 'ENGLISH',
    duration: '45',
  })
  const [lessonPlan, setLessonPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLessonPlan(null)
    setSaveSuccess(false)
    setSavedLessonId(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: parseInt(formData.grade),
          subject: formData.subject,
          topic: formData.topic,
          language: formData.language,
          duration: parseInt(formData.duration),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate lesson plan')
      }

      setLessonPlan(data.lessonPlan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!lessonPlan) return

    setIsSaving(true)
    setSaveSuccess(false)
    setError('')

    try {
      const response = await fetch('/api/ai/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: parseInt(formData.grade),
          subject: formData.subject,
          topic: formData.topic,
          language: formData.language,
          duration: parseInt(formData.duration),
          save: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save lesson plan')
      }

      if (data.savedLesson) {
        setSaveSuccess(true)
        setSavedLessonId(data.savedLesson.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson plan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Lesson Planner</h1>
          <p className="text-gray-600 mt-1">Generate detailed lesson plans for your classes</p>
        </div>
        <Link href="/teacher/lessons/saved">
          <Button variant="outline">View Saved Lessons</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Lesson Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Class"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  options={gradeOptions}
                />

                <Select
                  label="Subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  options={subjectOptions}
                />
              </div>

              <Input
                label="Topic"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g., Fractions, Photosynthesis, Tenses"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  options={languageOptions}
                />

                <Input
                  label="Duration (minutes)"
                  name="duration"
                  type="number"
                  value={formData.duration}
                  onChange={handleChange}
                  min="15"
                  max="90"
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                {isLoading ? 'Generating Lesson Plan...' : 'Generate Lesson Plan'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card variant="bordered" className="h-fit">
          <CardHeader>
            <CardTitle>Generated Lesson Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {lessonPlan ? (
              <div className="prose prose-sm max-w-none">
                <div
                  className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: lessonPlan
                      .replace(/## /g, '<h2 class="text-lg font-bold mt-4 mb-2 text-gray-900">')
                      .replace(/\n(?=<h2)/g, '</p>\n')
                      .replace(/### /g, '<h3 class="text-base font-semibold mt-3 mb-1 text-gray-800">')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/- /g, '<li class="ml-4">')
                      .replace(/\n\d+\. /g, '<li class="ml-4 list-decimal">')
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-lg font-medium">No lesson plan yet</p>
                <p className="text-sm mt-1">Fill in the details and click Generate</p>
              </div>
            )}
          </CardContent>

          {lessonPlan && (
            <div className="px-6 pb-6 space-y-3">
              {saveSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Lesson saved successfully!{' '}
                  <Link href="/teacher/lessons/saved" className="underline font-medium">
                    View saved lessons
                  </Link>
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || saveSuccess}
                  isLoading={isSaving}
                >
                  {saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Lesson'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(lessonPlan)}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                >
                  Print
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
