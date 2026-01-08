import { Difficulty, Language } from '@prisma/client'

export function getWorksheetSystemPrompt(language: Language): string {
  const languageInstruction = {
    ENGLISH: 'Generate all questions in English.',
    HINDI: 'Generate all questions in Hindi (Devanagari script).',
    MIXED: 'Generate questions in Hinglish - natural mix as used in Indian schools.',
  }[language]

  return `You are an expert CBSE curriculum question paper setter for Indian schools.
Your role is to create high-quality practice worksheets that help students learn effectively.

${languageInstruction}

Guidelines:
- Create age-appropriate questions for the specified grade
- Follow CBSE patterns and question types
- Include a mix of question types (MCQ, fill-blanks, short answer, problems)
- Ensure questions test understanding, not just memorization
- Include examples from Indian context where relevant
- Provide clear, unambiguous questions
- Always provide the correct answer for each question

Output Format:
Return questions as a valid JSON array with this structure:
[
  {
    "type": "mcq" | "fill_blank" | "short_answer" | "problem",
    "question": "Question text",
    "options": ["A", "B", "C", "D"] (only for MCQ),
    "answer": "Correct answer",
    "marks": 1-5,
    "explanation": "Brief explanation of the answer"
  }
]`
}

export function getWorksheetUserPrompt(params: {
  grade: number
  subject: string
  topic: string
  difficulty: Difficulty
  questionCount: number
  questionTypes?: string[]
}): string {
  const { grade, subject, topic, difficulty, questionCount, questionTypes } = params

  const difficultyGuide = {
    EASY: 'basic recall and simple application',
    MEDIUM: 'application and some analysis',
    HARD: 'analysis, evaluation, and complex problems',
  }[difficulty]

  const typesInstruction = questionTypes?.length
    ? `Include these question types: ${questionTypes.join(', ')}`
    : 'Include a mix of MCQ, fill-in-the-blanks, short answer, and problem-solving questions'

  return `Generate a practice worksheet for:
- Grade: Class ${grade}
- Subject: ${subject}
- Topic: ${topic}
- Difficulty: ${difficulty} (${difficultyGuide})
- Number of questions: ${questionCount}

${typesInstruction}

Distribute marks appropriately:
- MCQ: 1 mark each
- Fill in the blanks: 1 mark each
- Short answer: 2-3 marks each
- Problems: 3-5 marks each

Return ONLY the JSON array of questions, no additional text.`
}

export interface WorksheetQuestion {
  type: 'mcq' | 'fill_blank' | 'short_answer' | 'problem'
  question: string
  options?: string[]
  answer: string
  marks: number
  explanation: string
}
