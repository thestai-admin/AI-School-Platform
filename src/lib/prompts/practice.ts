import { Difficulty } from '@prisma/client'

export type ExamType = 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET' | 'OLYMPIAD' | 'NTSE' | 'KVPY' | 'SCHOOL_EXAM' | 'CBSE_BOARD' | 'ICSE_BOARD' | 'STATE_BOARD'
export type QuestionType = 'MCQ' | 'NUMERICAL' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'TRUE_FALSE' | 'MATCH_FOLLOWING' | 'ASSERTION_REASON'

/**
 * System prompt for generating practice questions
 */
export function getPracticeQuestionSystemPrompt(examType?: ExamType): string {
  const examContext = examType
    ? getExamQuestionContext(examType)
    : 'Generate questions suitable for school-level practice.'

  return `You are an expert question paper setter for Indian competitive exams and school assessments.
Your questions should be:
- Conceptually accurate and clearly worded
- Appropriate for the specified difficulty level
- Include proper options for MCQs (with one clearly correct answer)
- Have detailed explanations that teach the concept

${examContext}

For each question, ensure:
1. The question tests understanding, not just memory
2. Options (for MCQ) are plausible - no obviously wrong answers
3. The correct answer is unambiguous
4. The explanation teaches why the answer is correct AND why others are wrong`
}

/**
 * Get exam-specific question context
 */
function getExamQuestionContext(examType: ExamType): string {
  const contexts: Record<ExamType, string> = {
    JEE_MAIN: `JEE Main Question Standards:
- Single correct MCQs with 4 options
- Numerical value questions (integer or decimal)
- Focus on application of concepts
- Time: ~90 seconds per question
- Negative marking: -1 for wrong MCQ`,

    JEE_ADVANCED: `JEE Advanced Question Standards:
- Single correct, multiple correct, and paragraph-based questions
- Matrix match and integer type questions
- Deep conceptual understanding required
- Complex multi-step problems
- Partial marking for some questions`,

    NEET: `NEET Question Standards:
- Single correct MCQs with 4 options
- Biology (90), Physics (45), Chemistry (45) questions
- NCERT-focused content
- Assertion-Reason questions
- Negative marking: -1 for wrong answer`,

    OLYMPIAD: `Olympiad Question Standards:
- Non-standard, creative problems
- Proof-based questions
- Multi-step logical reasoning
- No negative marking typically
- Encourage elegant solutions`,

    NTSE: `NTSE Question Standards:
- MAT (Mental Ability) and SAT (Scholastic) sections
- Logical reasoning and pattern recognition
- NCERT-based scholastic questions
- Time management is crucial`,

    KVPY: `KVPY Question Standards:
- Research aptitude questions
- Deep conceptual understanding
- Application to real-world scenarios
- Scientific reasoning emphasis`,

    SCHOOL_EXAM: `School Exam Question Standards:
- Follow NCERT/textbook patterns
- Mix of easy, medium, and hard questions
- Include both objective and subjective
- Focus on comprehensive coverage`,

    CBSE_BOARD: `CBSE Board Question Standards:
- Follow latest CBSE pattern and marking scheme
- Include competency-based questions
- Case study/source-based questions
- Internal choice in sections`,

    ICSE_BOARD: `ICSE Board Question Standards:
- Detailed answer format
- Application-based questions
- Structured answer sections
- Higher difficulty than CBSE typically`,

    STATE_BOARD: `State Board Question Standards:
- Follow state syllabus strictly
- Regional context in questions
- Balance theory and application
- Standard marking schemes`,
  }

  return contexts[examType] || contexts.SCHOOL_EXAM
}

/**
 * User prompt for generating practice questions
 */
export function getPracticeQuestionUserPrompt(params: {
  subject: string
  topic: string
  subtopics?: string[]
  difficulty: Difficulty
  questionCount: number
  questionTypes: QuestionType[]
  examType?: ExamType
  grade?: number
  previousQuestionIds?: string[]
}): string {
  const {
    subject,
    topic,
    subtopics,
    difficulty,
    questionCount,
    questionTypes,
    examType,
    grade,
  } = params

  const difficultyGuide = {
    EASY: 'Basic concept application, direct formula use, simple calculations',
    MEDIUM: 'Multi-step problems, concept combination, moderate calculations',
    HARD: 'Complex multi-concept problems, tricky scenarios, advanced application',
  }

  return `Generate ${questionCount} ${difficulty} level questions for:

Subject: ${subject}
Topic: ${topic}
${subtopics ? `Subtopics: ${subtopics.join(', ')}` : ''}
${grade ? `Grade/Class: ${grade}` : ''}
${examType ? `Exam Type: ${examType.replace('_', ' ')}` : ''}

Question Types Required: ${questionTypes.join(', ')}

Difficulty Guide (${difficulty}): ${difficultyGuide[difficulty]}

For each question, provide in JSON format:
{
  "questions": [
    {
      "id": "unique_id",
      "question": "The question text with any necessary context",
      "type": "MCQ|NUMERICAL|SHORT_ANSWER|etc",
      "options": [
        {"label": "A", "text": "Option text"},
        {"label": "B", "text": "Option text"},
        {"label": "C", "text": "Option text"},
        {"label": "D", "text": "Option text"}
      ],
      "correctAnswer": "A or the actual answer for non-MCQ",
      "explanation": "Detailed explanation of why this is correct and why other options are wrong",
      "difficulty": "${difficulty}",
      "topic": "${topic}",
      "subtopic": "specific subtopic",
      "estimatedTime": 60,
      "tags": ["relevant", "tags"]
    }
  ]
}

Important:
- Each question must be unique and test different aspects
- Explanations should be educational, not just stating the answer
- For MCQs, all options should be plausible
- Include relevant formulas in explanations
- Estimate solving time in seconds`
}

/**
 * Prompt for generating personalized practice based on weak areas
 */
export function getPersonalizedPracticePrompt(params: {
  subject: string
  weakAreas: Array<{ topic: string; score: number }>
  targetImprovement: number
  availableTime: number // minutes
}): string {
  const { subject, weakAreas, targetImprovement, availableTime } = params

  return `Create a personalized practice plan for ${subject}:

Weak Areas (score%):
${weakAreas.map((w) => `- ${w.topic}: ${w.score}%`).join('\n')}

Target: Improve to ${targetImprovement}%
Available Time: ${availableTime} minutes

Generate a practice session with:

## Warm-up (5 mins)
(2-3 easy questions to build confidence)

## Foundation Building (${Math.floor(availableTime * 0.3)} mins)
(Questions addressing basic concepts in weak areas)

## Progressive Challenge (${Math.floor(availableTime * 0.4)} mins)
(Medium difficulty questions combining concepts)

## Stretch Goals (${Math.floor(availableTime * 0.2)} mins)
(1-2 harder questions for those doing well)

For each section, provide questions in JSON format with full explanations.
Focus primarily on the weakest areas but include some stronger areas for reinforcement.`
}

/**
 * Prompt for generating feedback on practice attempt
 */
export function getPracticeFeedbackPrompt(params: {
  question: string
  correctAnswer: string
  studentAnswer: string
  isCorrect: boolean
  timeTaken: number
  expectedTime: number
}): string {
  const { question, correctAnswer, studentAnswer, isCorrect, timeTaken, expectedTime } = params

  return `Provide feedback on this practice attempt:

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${studentAnswer}
Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}
Time Taken: ${timeTaken} seconds (Expected: ${expectedTime} seconds)

Please provide:

## Result Summary
(Acknowledge correct answer or identify the mistake)

## Concept Check
(The key concept being tested)

${!isCorrect ? `
## Where It Went Wrong
(Identify the likely mistake or misconception)

## Correct Approach
(Step-by-step solution)
` : ''}

## Speed Analysis
${timeTaken > expectedTime * 1.5 ? '(Took longer than expected - suggest faster approach)' : timeTaken < expectedTime * 0.5 ? '(Excellent speed!)' : '(Good time management)'}

## Next Step
(What to practice next based on this attempt)`
}

/**
 * Prompt for generating mock test
 */
export function getMockTestPrompt(params: {
  examType: ExamType
  subject: string
  totalQuestions: number
  totalTime: number // minutes
  topics: string[]
}): string {
  const { examType, subject, totalQuestions, totalTime, topics } = params

  return `Generate a mock test for ${examType.replace('_', ' ')}:

Subject: ${subject}
Total Questions: ${totalQuestions}
Time Limit: ${totalTime} minutes
Topics to Cover: ${topics.join(', ')}

Create a balanced test with:
- Easy questions: ${Math.floor(totalQuestions * 0.3)}
- Medium questions: ${Math.floor(totalQuestions * 0.5)}
- Hard questions: ${Math.floor(totalQuestions * 0.2)}

Follow the exact pattern of ${examType.replace('_', ' ')} exam:
- Question distribution
- Marking scheme
- Question types

Output as JSON with:
{
  "testId": "unique_id",
  "examType": "${examType}",
  "subject": "${subject}",
  "totalTime": ${totalTime},
  "totalMarks": calculated_total,
  "instructions": ["exam instructions"],
  "sections": [
    {
      "name": "Section A",
      "questions": [array of questions in standard format],
      "marks": section_marks
    }
  ],
  "markingScheme": {
    "correct": marks,
    "incorrect": negative_marks,
    "unattempted": 0
  }
}`
}
