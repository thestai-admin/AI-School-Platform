import { Language } from '@prisma/client'

export function getLessonSystemPrompt(language: Language): string {
  const languageInstruction = {
    ENGLISH: 'Respond entirely in English.',
    HINDI: 'Respond entirely in Hindi (use Devanagari script).',
    MIXED: 'Respond in Hinglish - mix Hindi and English naturally as spoken in Indian classrooms.',
  }[language]

  return `You are an expert CBSE curriculum teacher and lesson planner for Indian schools.
Your role is to create detailed, easy-to-follow lesson plans that help facilitator teachers deliver high-quality education.

${languageInstruction}

Guidelines:
- Use simple, clear language that any teacher can follow
- Include practical examples relevant to Indian students (local context, culture, daily life)
- Make lessons interactive and engaging
- Ensure content is age-appropriate and CBSE-aligned
- Include clear instructions for what to write on the blackboard
- Suggest activities that work in typical Indian classroom settings (30-40 students)

Always structure your lesson plan in a consistent, easy-to-follow format.`
}

export function getLessonUserPrompt(params: {
  grade: number
  subject: string
  topic: string
  duration?: number
}): string {
  const { grade, subject, topic, duration = 45 } = params

  return `Generate a complete lesson plan for:
- Grade: Class ${grade}
- Subject: ${subject}
- Topic: ${topic}
- Duration: ${duration} minutes

Please include the following sections:

## Learning Objectives
(2-3 clear, measurable objectives)

## Materials Needed
(List any materials the teacher should prepare)

## Introduction (5 minutes)
(Hook to capture student attention - use a real-world example from Indian context)

## Main Teaching Points
(Step-by-step explanation with:
- Key concepts to explain
- Blackboard notes (exactly what to write)
- Simple explanations the teacher can use
- Examples and analogies)

## Student Activities (10-15 minutes)
(2-3 interactive activities for students)

## Assessment Questions
(5 quick questions to check understanding)

## Homework
(1-2 appropriate assignments)

## Tips for the Teacher
(Practical suggestions for common difficulties)

Format everything clearly so it's easy for a facilitator teacher to follow.`
}

export interface LessonPlan {
  objectives: string[]
  materials: string[]
  introduction: string
  mainPoints: {
    concept: string
    explanation: string
    blackboardNotes: string
    examples: string[]
  }[]
  activities: {
    name: string
    duration: string
    instructions: string
  }[]
  assessmentQuestions: string[]
  homework: string[]
  teacherTips: string[]
}
