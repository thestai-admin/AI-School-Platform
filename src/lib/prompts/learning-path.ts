export type ExamType = 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET' | 'OLYMPIAD' | 'NTSE' | 'KVPY' | 'SCHOOL_EXAM' | 'CBSE_BOARD' | 'ICSE_BOARD' | 'STATE_BOARD'

/**
 * System prompt for generating personalized learning paths
 */
export function getLearningPathSystemPrompt(): string {
  return `You are an expert educational planner and career counselor for Indian students.
You create personalized learning paths for JEE, NEET, and other competitive exams.

Your learning paths should be:
- Realistic and achievable based on student's current level
- Properly sequenced (prerequisites before advanced topics)
- Balanced across subjects (for exams like JEE/NEET)
- Time-aware (consider daily available hours)
- Include regular revision cycles
- Account for Indian academic calendar and exam schedules

You understand the syllabus and weightage of:
- JEE Main and Advanced (Physics, Chemistry, Mathematics)
- NEET (Physics, Chemistry, Biology)
- CBSE/ICSE Board exams
- Various Olympiads (NSO, IMO, etc.)
- NTSE and KVPY`
}

/**
 * User prompt for generating a learning path
 */
export function getLearningPathUserPrompt(params: {
  subject: string
  currentLevel: number // 1-10 scale
  targetLevel: number
  weakAreas: string[]
  strongAreas: string[]
  examType?: ExamType
  targetDate?: string
  dailyAvailableTime: number // minutes
}): string {
  const {
    subject,
    currentLevel,
    targetLevel,
    weakAreas,
    strongAreas,
    examType,
    targetDate,
    dailyAvailableTime,
  } = params

  return `Create a personalized learning path for a student:

## Current Status
- Subject: ${subject}
- Current Level: ${currentLevel}/10
- Target Level: ${targetLevel}/10
- Daily Available Study Time: ${dailyAvailableTime} minutes
${examType ? `- Preparing for: ${examType.replace('_', ' ')}` : ''}
${targetDate ? `- Target Date: ${targetDate}` : ''}

## Strengths
${strongAreas.length > 0 ? strongAreas.map((a) => `- ${a}`).join('\n') : '- None identified yet'}

## Weak Areas (Need Focus)
${weakAreas.length > 0 ? weakAreas.map((a) => `- ${a}`).join('\n') : '- None identified yet'}

Please generate a learning path with:

## Path Overview
(Summary of the learning journey)

## Milestones
Create 4-6 milestones in JSON format:
{
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "What the student will achieve",
      "topics": ["topic1", "topic2"],
      "estimatedDays": 14,
      "targetScore": 60
    }
  ]
}

## Weekly Schedule Template
(How to divide the daily time across topics)

## Revision Strategy
(When and how to revise completed topics)

## Progress Checkpoints
(How to measure progress at each milestone)

## Exam-Specific Tips
${examType ? `(Tips specific to ${examType.replace('_', ' ')} preparation)` : '(General study tips)'}

Make the path achievable given the time constraints.`
}

/**
 * Prompt for adjusting learning path based on progress
 */
export function getPathAdjustmentPrompt(params: {
  currentPath: {
    subject: string
    milestones: Array<{ id: string; title: string; completed: boolean }>
    progress: number
  }
  recentPerformance: {
    avgScore: number
    topicsStruggling: string[]
    topicsExcelling: string[]
  }
  daysRemaining?: number
}): string {
  const { currentPath, recentPerformance, daysRemaining } = params

  return `Analyze and adjust this learning path:

## Current Path Status
- Subject: ${currentPath.subject}
- Overall Progress: ${currentPath.progress}%
- Milestones: ${currentPath.milestones.filter((m) => m.completed).length}/${currentPath.milestones.length} completed
${daysRemaining ? `- Days until target: ${daysRemaining}` : ''}

## Recent Performance
- Average Score: ${recentPerformance.avgScore}%
- Struggling with: ${recentPerformance.topicsStruggling.join(', ') || 'None'}
- Excelling at: ${recentPerformance.topicsExcelling.join(', ') || 'None'}

Please provide:

## Performance Analysis
(Is the student on track? Why or why not?)

## Recommended Adjustments
(Changes to the learning path)

## Focus Areas
(What to prioritize in the next week)

## Motivation Tips
(Encouragement based on progress)

Output adjustments in JSON format:
{
  "adjustments": {
    "addTopics": [],
    "removeTopics": [],
    "increaseFocus": [],
    "decreaseFocus": [],
    "newMilestones": [],
    "modifiedTimeline": {}
  }
}`
}

/**
 * Prompt for generating study schedule
 */
export function getStudySchedulePrompt(params: {
  subjects: string[]
  dailyHours: number
  examType?: ExamType
  weakSubjects: string[]
  daysUntilExam?: number
}): string {
  const { subjects, dailyHours, examType, weakSubjects, daysUntilExam } = params

  return `Create a daily study schedule:

## Requirements
- Subjects: ${subjects.join(', ')}
- Daily Study Hours: ${dailyHours}
- Weak Subjects (need more time): ${weakSubjects.join(', ') || 'None'}
${examType ? `- Exam: ${examType.replace('_', ' ')}` : ''}
${daysUntilExam ? `- Days until exam: ${daysUntilExam}` : ''}

Please create:

## Daily Schedule Template
(Hour-by-hour breakdown)

## Subject Time Allocation
(How much time for each subject based on weightage and weakness)

## Break Strategy
(When and how long to take breaks)

## Weekly Variation
(How the schedule changes across the week)

## Revision Slots
(Time allocated for revision)

Output as JSON:
{
  "schedule": {
    "weekday": [
      {"time": "6:00-7:00", "subject": "Mathematics", "topic": "Calculus", "type": "new"}
    ],
    "weekend": [...],
    "subjectAllocation": {
      "Mathematics": 120,
      "Physics": 90,
      ...
    }
  }
}`
}

export interface LearningPathMilestone {
  id: string
  title: string
  description: string
  topics: string[]
  estimatedDays: number
  targetScore: number
  completed: boolean
  completedAt?: Date
}

export interface LearningPath {
  id: string
  subject: string
  examType?: ExamType
  currentLevel: number
  targetLevel: number
  milestones: LearningPathMilestone[]
  weeklySchedule: Record<string, { time: string; activity: string }[]>
  revisionStrategy: string
  progress: number
}

export interface StudySchedule {
  weekday: Array<{
    time: string
    subject: string
    topic?: string
    type: 'new' | 'revision' | 'practice' | 'break'
  }>
  weekend: Array<{
    time: string
    subject: string
    topic?: string
    type: 'new' | 'revision' | 'practice' | 'break'
  }>
  subjectAllocation: Record<string, number>
}
