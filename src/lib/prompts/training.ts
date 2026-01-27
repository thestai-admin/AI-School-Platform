import { Language } from '@prisma/client'

/**
 * Teaching Tips Generation Prompts
 */
export function getTeachingTipSystemPrompt(language: Language): string {
  const languageInstruction = {
    ENGLISH: 'Respond entirely in English.',
    HINDI: 'Respond entirely in Hindi (use Devanagari script).',
    MIXED: 'Respond in Hinglish - mix Hindi and English naturally as spoken in Indian classrooms.',
  }[language]

  return `You are an experienced master teacher and pedagogy expert for Indian schools (CBSE/ICSE curriculum).
Your role is to provide practical, actionable teaching tips that help teachers improve their classroom effectiveness.

${languageInstruction}

Guidelines:
- Focus on practical tips that can be immediately applied in Indian classroom settings
- Consider resource constraints common in Indian schools
- Include culturally relevant examples and approaches
- Address common challenges faced by Indian teachers (large class sizes, diverse learning levels)
- Be specific and actionable - avoid vague advice
- Draw from proven pedagogical methods adapted for Indian education context`
}

export function getTeachingTipUserPrompt(params: {
  topic: string
  subject: string
  gradeLevel: string
  specificChallenge?: string
}): string {
  const { topic, subject, gradeLevel, specificChallenge } = params

  return `Generate practical teaching tips for:
- Topic: ${topic}
- Subject: ${subject}
- Grade Level: ${gradeLevel}
${specificChallenge ? `- Specific Challenge: ${specificChallenge}` : ''}

Please provide:

## Main Teaching Tip
(A clear, actionable tip for teaching this topic effectively)

## Step-by-Step Implementation
(How to implement this tip in the classroom)

## Common Student Mistakes
(What mistakes students typically make and how to address them)

## Engaging Activities
(2-3 activities that work well for this topic)

## Assessment Strategies
(Quick ways to check student understanding)

## Differentiation Tips
(How to adapt for different learning levels in the same class)

## Real-World Connections
(How to relate this topic to students' daily lives in India)

Keep the response practical and focused on what teachers can immediately use.`
}

/**
 * Performance Insights Generation Prompts
 */
export function getPerformanceInsightSystemPrompt(): string {
  return `You are an educational data analyst and teaching coach for Indian schools.
Your role is to analyze teacher performance metrics and provide actionable insights for improvement.

Guidelines:
- Be encouraging while highlighting areas for growth
- Provide specific, actionable recommendations
- Consider the context of Indian schools (CBSE curriculum, class sizes, resources)
- Focus on high-impact improvements
- Celebrate strengths before addressing weaknesses
- Suggest realistic goals based on the data`
}

export function getPerformanceInsightUserPrompt(metrics: TeacherMetrics): string {
  return `Analyze the following teacher performance data and provide insights:

## Teaching Activity Metrics
- Lessons Created: ${metrics.lessonsCreated}
- Worksheets Generated: ${metrics.worksheetsGenerated}
- Homework Assignments: ${metrics.homeworkAssigned}
- Average Grading Time: ${metrics.avgGradingTime} hours

## Student Outcomes
- Average Student Score: ${metrics.avgStudentScore}%
- Student Progress Rate: ${metrics.studentProgressRate}%
- Homework Completion Rate: ${metrics.homeworkCompletionRate}%
- Active Students: ${metrics.activeStudents}

## Engagement Metrics
- AI Tools Usage: ${metrics.aiToolsUsage} times this month
- Training Modules Completed: ${metrics.trainingModulesCompleted}
- Community Participation: ${metrics.communityPosts} posts

## Time Period
- Analysis Period: ${metrics.period}

Please provide:

## Performance Summary
(2-3 sentence overview of this teacher's performance)

## Key Strengths
(Top 3 areas where this teacher excels)

## Growth Opportunities
(Top 3 areas for improvement with specific suggestions)

## Recommended Actions
(3-5 specific actions to improve in the next month)

## Suggested Training
(Relevant training modules or resources based on the data)

## Goal Setting
(Realistic goals for the next period based on current performance)

Be specific and actionable in your recommendations.`
}

export interface TeacherMetrics {
  lessonsCreated: number
  worksheetsGenerated: number
  homeworkAssigned: number
  avgGradingTime: number
  avgStudentScore: number
  studentProgressRate: number
  homeworkCompletionRate: number
  activeStudents: number
  aiToolsUsage: number
  trainingModulesCompleted: number
  communityPosts: number
  period: string
}

export interface TeachingTip {
  mainTip: string
  implementation: string[]
  commonMistakes: {
    mistake: string
    solution: string
  }[]
  activities: {
    name: string
    description: string
    duration: string
  }[]
  assessmentStrategies: string[]
  differentiation: {
    level: string
    approach: string
  }[]
  realWorldConnections: string[]
}

export interface PerformanceInsight {
  summary: string
  strengths: string[]
  growthAreas: {
    area: string
    suggestion: string
  }[]
  recommendedActions: string[]
  suggestedTraining: string[]
  goals: {
    goal: string
    metric: string
    target: string
  }[]
}

/**
 * Module Content Generation Prompts
 */
export function getModuleContentSystemPrompt(language: Language): string {
  const languageInstruction = {
    ENGLISH: 'Generate content in English.',
    HINDI: 'Generate content in Hindi (use Devanagari script).',
    MIXED: 'Generate content in Hinglish - mix Hindi and English naturally.',
  }[language]

  return `You are an instructional designer creating teacher training content for Indian schools.
Your role is to create engaging, practical training modules that help teachers improve their skills.

${languageInstruction}

Guidelines:
- Create content appropriate for teachers with varying experience levels
- Include practical examples from Indian classroom contexts
- Focus on actionable skills that can be immediately applied
- Include knowledge checks and reflection questions
- Use clear, simple language
- Structure content in digestible sections`
}

export function getModuleContentUserPrompt(params: {
  title: string
  subject?: string
  targetSkill: string
  duration: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}): string {
  const { title, subject, targetSkill, duration, difficulty } = params

  return `Create training module content for:
- Title: ${title}
- Subject Focus: ${subject || 'General Teaching'}
- Target Skill: ${targetSkill}
- Duration: ${duration} minutes
- Difficulty: ${difficulty}

Generate the following sections:

## Introduction
(Why this skill matters for teachers)

## Learning Objectives
(3-4 specific, measurable objectives)

## Section 1: Understanding the Concept
(Explanation of the core concept with examples)

## Section 2: Practical Application
(Step-by-step guide to applying this in the classroom)

## Section 3: Common Challenges
(Typical challenges and how to overcome them)

## Reflection Questions
(3-5 questions for teachers to reflect on their practice)

## Quiz Questions
(5 multiple choice questions to assess understanding)
Format: Question, Options A-D, Correct Answer

## Action Items
(2-3 things teachers can try in their next class)

## Additional Resources
(Books, videos, or websites for further learning)

Make the content engaging and immediately applicable to Indian classroom settings.`
}
