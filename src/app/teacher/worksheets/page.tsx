'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Question {
  type: string
  question: string
  options?: string[]
  answer: string
  marks: number
  explanation: string
}

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
]

const difficultyOptions = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
]

const languageOptions = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'HINDI', label: 'Hindi' },
  { value: 'MIXED', label: 'Hinglish' },
]

export default function WorksheetGeneratorPage() {
  const [formData, setFormData] = useState({
    grade: '5',
    subject: 'Mathematics',
    topic: '',
    difficulty: 'MEDIUM',
    questionCount: '10',
    language: 'ENGLISH',
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [worksheetTitle, setWorksheetTitle] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setQuestions([])
    setSaveSuccess(false)
    setWorksheetTitle('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: parseInt(formData.grade),
          subject: formData.subject,
          topic: formData.topic,
          difficulty: formData.difficulty,
          questionCount: parseInt(formData.questionCount),
          language: formData.language,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate worksheet')
      }

      setQuestions(data.questions)
      setWorksheetTitle(`${formData.topic} - Worksheet`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (questions.length === 0) return

    setIsSaving(true)
    setSaveSuccess(false)
    setError('')

    try {
      const response = await fetch('/api/ai/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: parseInt(formData.grade),
          subject: formData.subject,
          topic: formData.topic,
          difficulty: formData.difficulty,
          questionCount: parseInt(formData.questionCount),
          language: formData.language,
          save: true,
          title: worksheetTitle || `${formData.topic} - Worksheet`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save worksheet')
      }

      if (data.savedWorksheet) {
        setSaveSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save worksheet')
    } finally {
      setIsSaving(false)
    }
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Worksheet Generator</h1>
          <p className="text-gray-600 mt-1">Generate practice worksheets for your students</p>
        </div>
        <Link href="/teacher/worksheets/saved">
          <Button variant="outline">View Saved Worksheets</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Worksheet Settings</CardTitle>
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
                  label="Difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  options={difficultyOptions}
                />

                <Input
                  label="Questions"
                  name="questionCount"
                  type="number"
                  value={formData.questionCount}
                  onChange={handleChange}
                  min="5"
                  max="20"
                />
              </div>

              <Select
                label="Language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                options={languageOptions}
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                {isLoading ? 'Generating Worksheet...' : 'Generate Worksheet'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card variant="bordered" className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Worksheet</CardTitle>
            {questions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnswers(!showAnswers)}
                >
                  {showAnswers ? 'Hide Answers' : 'Show Answers'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  Print
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {questions.length > 0 ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-lg font-bold">
                    Class {formData.grade} - {formData.subject}
                  </h2>
                  <p className="text-gray-600">Topic: {formData.topic}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Total Marks: {totalMarks} | Time: {totalMarks * 2} minutes
                  </p>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                  {questions.map((q, index) => (
                    <div key={index} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">Q{index + 1}.</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {q.marks} mark{q.marks > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-gray-800 mb-2">{q.question}</p>

                      {q.type === 'mcq' && q.options && (
                        <div className="ml-4 space-y-1">
                          {q.options.map((option, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-gray-500">{String.fromCharCode(65 + i)}.</span>
                              <span>{option}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'fill_blank' && (
                        <div className="ml-4 mt-2">
                          <div className="border-b-2 border-dashed border-gray-300 w-48 inline-block" />
                        </div>
                      )}

                      {showAnswers && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">
                            Answer: {q.answer}
                          </p>
                          {q.explanation && (
                            <p className="text-sm text-green-700 mt-1">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">No worksheet yet</p>
                <p className="text-sm mt-1">Fill in the details and click Generate</p>
              </div>
            )}
          </CardContent>

          {questions.length > 0 && (
            <div className="px-6 pb-6 space-y-3">
              {saveSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Worksheet saved successfully!{' '}
                  <Link href="/teacher/worksheets/saved" className="underline font-medium">
                    View saved worksheets
                  </Link>
                </div>
              )}
              <div className="space-y-2">
                <Input
                  label="Worksheet Title"
                  value={worksheetTitle}
                  onChange={(e) => setWorksheetTitle(e.target.value)}
                  placeholder="Enter a title for this worksheet"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || saveSuccess}
                  isLoading={isSaving}
                >
                  {saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Worksheet'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
