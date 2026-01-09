import { Language } from '@prisma/client'

export function getGradingSystemPrompt(language: Language): string {
  const languageInstruction = {
    ENGLISH: 'Provide all feedback in English.',
    HINDI: 'Provide all feedback in Hindi (Devanagari script).',
    MIXED: 'Provide feedback in Hinglish - natural mix as used in Indian schools.',
  }[language]

  return `You are an expert CBSE teacher evaluating student homework answers.
Your role is to grade answers fairly and provide constructive, encouraging feedback that helps students learn.

${languageInstruction}

Guidelines:
- Be fair and consistent in grading
- Award partial marks for partially correct answers
- For MCQs, the answer must match exactly (no partial marks)
- For subjective questions, evaluate understanding, not just exact wording
- Provide specific, actionable feedback for wrong answers
- Explain WHY an answer is wrong and HOW to arrive at the correct answer
- Be encouraging - focus on improvement, not criticism
- Use simple language appropriate for the student's grade level
- Consider common mistakes students make and address them

Grading Criteria:
- MCQ: 0 (wrong) or full marks (correct)
- Fill in blanks: 0 (wrong) or full marks (correct), allow minor spelling variations
- Short answer: 0-100% based on completeness and accuracy
- Problem solving: Step-by-step partial credit for correct approach

Output must be valid JSON. No additional text before or after the JSON.`
}

export function getGradingUserPrompt(params: {
  grade: number
  subject: string
  topic: string
  questions: GradingQuestion[]
  studentAnswers: StudentAnswer[]
}): string {
  const { grade, subject, topic, questions, studentAnswers } = params

  const questionsWithAnswers = questions.map((q, idx) => {
    const studentAnswer = studentAnswers.find(a => a.questionId === q.id)
    return {
      questionNumber: idx + 1,
      questionId: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      maxMarks: q.maxMarks,
      studentAnswer: studentAnswer?.answer || '[No answer provided]',
    }
  })

  return `Grade the following homework submission:

Student Details:
- Grade: Class ${grade}
- Subject: ${subject}
- Topic: ${topic}

Questions and Student Answers:
${JSON.stringify(questionsWithAnswers, null, 2)}

For each question, provide:
1. isCorrect: boolean (true if answer is correct or substantially correct)
2. marksAwarded: number (partial marks allowed for subjective questions)
3. feedback: string (specific feedback explaining why right/wrong and how to improve)

Also provide an overall assessment.

Return ONLY valid JSON in this exact format:
{
  "gradedAnswers": [
    {
      "questionId": "string",
      "isCorrect": boolean,
      "marksAwarded": number,
      "feedback": "Specific feedback for this answer"
    }
  ],
  "totalScore": number,
  "totalMarks": number,
  "percentage": number,
  "overallFeedback": "Encouraging summary of performance",
  "strengths": ["Array of things done well"],
  "weaknesses": ["Array of areas to improve"],
  "suggestedTopics": ["Topics to revise based on mistakes"]
}`
}

// Types
export interface GradingQuestion {
  id: string
  question: string
  type: 'mcq' | 'fill_blank' | 'short_answer' | 'problem'
  options?: string[]
  correctAnswer: string
  maxMarks: number
  topic?: string
}

export interface StudentAnswer {
  questionId: string
  answer: string
}

export interface GradingResult {
  gradedAnswers: GradedAnswer[]
  totalScore: number
  totalMarks: number
  percentage: number
  overallFeedback: string
  strengths: string[]
  weaknesses: string[]
  suggestedTopics: string[]
}

export interface GradedAnswer {
  questionId: string
  isCorrect: boolean
  marksAwarded: number
  feedback: string
}
