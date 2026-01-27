import { Language } from '@prisma/client'

export type ExamType = 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET' | 'OLYMPIAD' | 'NTSE' | 'KVPY' | 'SCHOOL_EXAM' | 'CBSE_BOARD' | 'ICSE_BOARD' | 'STATE_BOARD'

export interface StudentContext {
  grade: number
  weakAreas?: string[]
  strongAreas?: string[]
  recentTopics?: string[]
  learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic'
}

/**
 * AI Study Companion System Prompt
 * For 24/7 AI tutoring and doubt solving
 */
export function getStudyCompanionSystemPrompt(params: {
  grade: number
  language: Language
  subject?: string
  examType?: ExamType
  studentContext?: StudentContext
}): string {
  const { grade, language, subject, examType, studentContext } = params

  const languageInstruction = {
    ENGLISH: 'Respond in English. Use simple, clear language.',
    HINDI: 'Respond in Hindi (Devanagari script). Use simple, everyday Hindi.',
    MIXED: 'Respond in Hinglish - mix Hindi and English naturally as students speak.',
  }[language]

  const examInstructions = examType
    ? getExamSpecificInstructions(examType)
    : ''

  const contextInfo = studentContext
    ? `
Student Context:
- Learning Style: ${studentContext.learningStyle || 'Not specified'}
- Weak Areas: ${studentContext.weakAreas?.join(', ') || 'Not identified yet'}
- Strong Areas: ${studentContext.strongAreas?.join(', ') || 'Not identified yet'}
- Recent Topics: ${studentContext.recentTopics?.join(', ') || 'None'}
`
    : ''

  return `You are an expert AI Study Companion for Class ${grade} students in India.
You are patient, encouraging, and adapt your teaching to the student's level.

${languageInstruction}

Your Role:
- Help students understand concepts deeply, not just memorize
- Solve doubts patiently with step-by-step explanations
- Use examples from Indian daily life and context
- Encourage questions and curiosity
- Build confidence while addressing weak areas
${subject ? `- Currently focusing on: ${subject}` : ''}

${examInstructions}

${contextInfo}

Guidelines:
1. Start by understanding what the student already knows
2. Break complex concepts into simple steps
3. Use analogies and real-world examples from India
4. Ask checking questions to ensure understanding
5. Provide practice problems when appropriate
6. Be encouraging but honest about mistakes
7. Identify and track weak areas for later review
8. Adapt explanation style based on student responses

Format your responses clearly with:
- Headings for different sections
- Numbered steps for procedures
- Examples in boxes or quotes
- Key formulas or facts highlighted

Remember: You are available 24/7, even late at night when no teacher is around.
Be the supportive mentor every student deserves.`
}

/**
 * Get exam-specific instructions
 */
function getExamSpecificInstructions(examType: ExamType): string {
  const instructions: Record<ExamType, string> = {
    JEE_MAIN: `
JEE Main Preparation Mode:
- Focus on conceptual clarity and problem-solving speed
- Cover Physics, Chemistry, Mathematics at Class 11-12 level
- Emphasize shortcuts and time-saving techniques
- Include previous year JEE questions when relevant
- Target 90 seconds per MCQ problem-solving approach`,

    JEE_ADVANCED: `
JEE Advanced Preparation Mode:
- Deep conceptual understanding is paramount
- Multi-concept problems and unconventional approaches
- Focus on derivations and first-principles thinking
- Include IIT-level difficulty problems
- Encourage creative problem-solving approaches`,

    NEET: `
NEET Preparation Mode:
- Focus on Biology (Botany & Zoology), Physics, Chemistry
- NCERT is the bible - emphasize NCERT-based concepts
- Include NEET-specific question patterns
- Focus on assertion-reason and matching questions
- Biology needs special attention (50% weightage)`,

    OLYMPIAD: `
Olympiad Preparation Mode:
- Emphasize creative and non-standard problem solving
- Go beyond textbook - explore deeper concepts
- Focus on proof-based and logical reasoning questions
- Encourage mathematical elegance in solutions`,

    NTSE: `
NTSE Preparation Mode:
- Balance between MAT (Mental Ability) and SAT (Scholastic)
- Include logical reasoning and pattern recognition
- Cover Science, Mathematics, Social Studies
- Focus on NCERT concepts with application`,

    KVPY: `
KVPY Preparation Mode:
- Deep conceptual understanding required
- Include research-oriented thinking
- Focus on application-based problems
- Encourage scientific curiosity and exploration`,

    SCHOOL_EXAM: `
School Exam Mode:
- Focus on NCERT/textbook concepts
- Clear explanations for exam-style answers
- Include important questions and marking schemes
- Help with last-minute revision strategies`,

    CBSE_BOARD: `
CBSE Board Exam Mode:
- Strictly follow NCERT syllabus and concepts
- Focus on board exam question patterns
- Include sample paper style questions
- Emphasize answer presentation and marking scheme`,

    ICSE_BOARD: `
ICSE Board Exam Mode:
- Follow ICSE syllabus requirements
- Include application-based questions
- Focus on detailed, well-structured answers
- Cover both objective and subjective patterns`,

    STATE_BOARD: `
State Board Exam Mode:
- Focus on state syllabus requirements
- Use region-appropriate examples
- Include state board question patterns
- Balance between theory and application`,
  }

  return instructions[examType] || ''
}

/**
 * Prompt for solving competitive exam doubts
 */
export function getCompetitiveDoubtPrompt(params: {
  question: string
  subject: string
  examType: ExamType
  showHint?: boolean
  difficulty?: 'easy' | 'medium' | 'hard'
}): string {
  const { question, subject, examType, showHint, difficulty } = params

  const hintSection = showHint
    ? `
First, provide a HINT without solving:
- Guide the student towards the approach
- Mention relevant concepts to recall
- Don't give away the answer

Then ask: "Would you like to try with this hint, or should I show the solution?"
`
    : ''

  return `A student is preparing for ${examType.replace('_', ' ')} and has this ${subject} doubt:

"${question}"

Difficulty Level: ${difficulty || 'unknown'}

${hintSection}

Please provide:

## Approach
(How to think about this problem)

## Concepts Needed
(Key formulas/concepts required)

## Step-by-Step Solution
(Detailed solution with each step explained)

## Common Mistakes
(What students typically get wrong here)

## Similar Problem
(One similar problem for practice)

## Exam Tip
(Specific tip for solving this in ${examType.replace('_', ' ')})`
}

/**
 * Prompt for generating session summary
 */
export function getSessionSummaryPrompt(params: {
  messages: Array<{ role: string; content: string }>
  subject: string
  duration: number
}): string {
  const { messages, subject, duration } = params

  const conversationSummary = messages
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}...`)
    .join('\n')

  return `Analyze this ${duration} minute ${subject} study session and provide a summary:

Session Transcript:
${conversationSummary}

Please provide:

## Session Summary
(2-3 sentence overview of what was studied)

## Concepts Covered
(List of topics/concepts discussed)

## Understanding Level
(Rate the student's understanding: Excellent/Good/Needs Practice/Struggling)

## Weak Areas Identified
(Concepts the student struggled with)

## Strong Areas
(Concepts the student understood well)

## Recommended Next Steps
(What the student should study next)

## Practice Suggestions
(Specific problems or topics to practice)

Format as JSON for database storage.`
}

/**
 * Prompt for identifying learning gaps
 */
export function getLearningGapPrompt(params: {
  subject: string
  grade: number
  recentScores: Array<{ topic: string; score: number }>
  studyPatterns: { avgSessionDuration: number; frequentTopics: string[] }
}): string {
  const { subject, grade, recentScores, studyPatterns } = params

  return `Analyze this Class ${grade} student's ${subject} performance and identify learning gaps:

Recent Assessment Scores:
${recentScores.map((s) => `- ${s.topic}: ${s.score}%`).join('\n')}

Study Patterns:
- Average session duration: ${studyPatterns.avgSessionDuration} minutes
- Frequently studied topics: ${studyPatterns.frequentTopics.join(', ')}

Please identify:

## Critical Gaps
(Topics scoring below 50% that need immediate attention)

## Foundation Issues
(Prerequisite concepts that might be weak)

## Recommended Study Plan
(Priority order of topics to study)

## Estimated Improvement Time
(How long to address each gap)

## Resources Needed
(Types of practice problems and explanations needed)`
}
