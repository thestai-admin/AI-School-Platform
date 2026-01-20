'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Subject {
  id: string
  name: string
}

interface Class {
  id: string
  name: string
  grade: number
}

interface Worksheet {
  id: string
  title: string
  questions: Question[]
  subject: { id: string; name: string }
}

interface Question {
  id?: string
  type: 'mcq' | 'fill_blank' | 'short_answer' | 'problem'
  question: string
  options?: string[]
  answer: string
  marks: number
  maxMarks?: number
  correctAnswer?: string
}

export default function CreateHomeworkPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Data loading states
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [worksheets, setWorksheets] = useState<Worksheet[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('23:59')
  const [difficulty, setDifficulty] = useState('MEDIUM')
  const [language, setLanguage] = useState('ENGLISH')
  const [useWorksheet, setUseWorksheet] = useState(false)
  const [selectedWorksheetId, setSelectedWorksheetId] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  // Fetch subjects and classes
  useEffect(() => {
    async function fetchData() {
      try {
        const [subjectsRes, classesRes, worksheetsRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch('/api/classes'),
          fetch('/api/worksheets'),
        ])

        if (subjectsRes.ok) {
          const data = await subjectsRes.json()
          setSubjects(data.subjects || [])
        }

        if (classesRes.ok) {
          const data = await classesRes.json()
          setClasses(data.classes || [])
        }

        if (worksheetsRes.ok) {
          const data = await worksheetsRes.json()
          setWorksheets(data.worksheets || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  // When worksheet is selected, populate questions
  useEffect(() => {
    if (selectedWorksheetId && useWorksheet) {
      const worksheet = worksheets.find(w => w.id === selectedWorksheetId)
      if (worksheet) {
        setTitle(`Homework: ${worksheet.title}`)
        setSubjectId(worksheet.subject.id)
        setQuestions(
          (worksheet.questions as Question[]).map((q, idx) => ({
            ...q,
            id: q.id || `q${idx + 1}`,
            maxMarks: q.marks || q.maxMarks || 1,
            correctAnswer: q.answer || q.correctAnswer || '',
          }))
        )
      }
    }
  }, [selectedWorksheetId, useWorksheet, worksheets])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `q${questions.length + 1}`,
        type: 'short_answer',
        question: '',
        answer: '',
        marks: 2,
        maxMarks: 2,
        correctAnswer: '',
      },
    ])
  }

  const updateQuestion = (index: number, field: keyof Question, value: string | number | string[]) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'answer') {
      updated[index].correctAnswer = value as string
    }
    if (field === 'marks') {
      updated[index].maxMarks = value as number
    }
    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title || !classId || !subjectId || !dueDate || questions.length === 0) {
      setError('Please fill in all required fields and add at least one question')
      return
    }

    setIsLoading(true)

    try {
      const dueDatetime = new Date(`${dueDate}T${dueTime}:00`)

      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          instructions,
          questions: questions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer || q.answer,
            maxMarks: q.maxMarks || q.marks,
            topic: title,
          })),
          totalMarks: questions.reduce((sum, q) => sum + (q.maxMarks || q.marks || 1), 0),
          difficulty,
          language,
          dueDate: dueDatetime.toISOString(),
          classId,
          subjectId,
          worksheetId: useWorksheet ? selectedWorksheetId : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create homework')
      }

      router.push('/teacher/homework')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create homework')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div data-testid="page-teacher-homework-create" className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assign New Homework</h1>
        <p className="text-gray-600 mt-1">Create homework from scratch or use an existing worksheet</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <Card variant="bordered" className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Use existing worksheet toggle */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="useWorksheet"
                checked={useWorksheet}
                onChange={(e) => {
                  setUseWorksheet(e.target.checked)
                  if (!e.target.checked) {
                    setSelectedWorksheetId('')
                    setQuestions([])
                  }
                }}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <label htmlFor="useWorksheet" className="font-medium">
                Use an existing worksheet
              </label>
            </div>

            {useWorksheet && (
              <Select
                label="Select Worksheet"
                value={selectedWorksheetId}
                onChange={(e) => setSelectedWorksheetId(e.target.value)}
                placeholder="Choose a worksheet..."
                options={worksheets.map((ws) => ({
                  value: ws.id,
                  label: `${ws.title} (${ws.subject.name})`,
                }))}
              />
            )}

            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Practice Questions"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions (optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add any special instructions for students..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Class *"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                placeholder="Select class..."
                options={classes.map((cls) => ({
                  value: cls.id,
                  label: `${cls.name} (Grade ${cls.grade})`,
                }))}
              />

              <Select
                label="Subject *"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                placeholder="Select subject..."
                options={subjects.map((sub) => ({
                  value: sub.id,
                  label: sub.name,
                }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Due Date *"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <Input
                label="Due Time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                options={[
                  { value: 'EASY', label: 'Easy' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HARD', label: 'Hard' },
                ]}
              />

              <Select
                label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { value: 'ENGLISH', label: 'English' },
                  { value: 'HINDI', label: 'Hindi' },
                  { value: 'MIXED', label: 'Hinglish (Mixed)' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card variant="bordered" className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Questions ({questions.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No questions added yet</p>
                <p className="text-sm mt-1">Click &quot;Add Question&quot; or select a worksheet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-medium text-gray-700">Question {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="md:col-span-3">
                        <Select
                          label="Type"
                          value={q.type}
                          onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                          options={[
                            { value: 'mcq', label: 'Multiple Choice' },
                            { value: 'fill_blank', label: 'Fill in the Blank' },
                            { value: 'short_answer', label: 'Short Answer' },
                            { value: 'problem', label: 'Problem Solving' },
                          ]}
                        />
                      </div>
                      <Input
                        label="Marks"
                        type="number"
                        min={1}
                        value={q.maxMarks || q.marks}
                        onChange={(e) => updateQuestion(idx, 'marks', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                      <textarea
                        value={q.question}
                        onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter question..."
                      />
                    </div>

                    {q.type === 'mcq' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma-separated)</label>
                        <Input
                          value={(q.options || []).join(', ')}
                          onChange={(e) => updateQuestion(idx, 'options', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="Option A, Option B, Option C, Option D"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                      <Input
                        value={q.correctAnswer || q.answer}
                        onChange={(e) => updateQuestion(idx, 'answer', e.target.value)}
                        placeholder="Enter correct answer..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {questions.length > 0 && (
          <Card variant="bordered" className="mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-600">Total Questions:</span>
                  <span className="ml-2 font-semibold">{questions.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Marks:</span>
                  <span className="ml-2 font-semibold">
                    {questions.reduce((sum, q) => sum + (q.maxMarks || q.marks || 1), 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Creating...
              </>
            ) : (
              'Assign Homework'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
