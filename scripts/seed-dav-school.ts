/**
 * Seed script for DAV Public School, Lakhisarai
 * Creates school, admin, teachers, students, parents, and classes
 */

import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// School details
const SCHOOL = {
  name: 'DAV Public School, Lakhisarai',
  slug: 'dav-lakhisarai',
  email: 'admin@davlakhisarai.edu.in',
}

// Demo password for all users (easy to remember for testing)
const DEFAULT_PASSWORD = 'Demo@123'

// Admin
const ADMIN = {
  name: 'Dr. Rajendra Prasad',
  email: 'admin@davlakhisarai.edu.in',
}

// Teachers
const TEACHERS = [
  { name: 'Priya Sharma', email: 'priya.sharma@davlakhisarai.edu.in', subject: 'Mathematics' },
  { name: 'Rajesh Kumar', email: 'rajesh.kumar@davlakhisarai.edu.in', subject: 'Science' },
  { name: 'Sunita Devi', email: 'sunita.devi@davlakhisarai.edu.in', subject: 'English' },
  { name: 'Amit Singh', email: 'amit.singh@davlakhisarai.edu.in', subject: 'Hindi' },
  { name: 'Neha Gupta', email: 'neha.gupta@davlakhisarai.edu.in', subject: 'Social Science' },
]

// Students (organized by class)
const STUDENTS = [
  // Class 6A
  { name: 'Aryan Singh', email: 'aryan.singh@student.davlakhisarai.edu.in', grade: 6, section: 'A', rollNumber: '6A01' },
  { name: 'Priya Kumari', email: 'priya.kumari@student.davlakhisarai.edu.in', grade: 6, section: 'A', rollNumber: '6A02' },
  { name: 'Rahul Verma', email: 'rahul.verma@student.davlakhisarai.edu.in', grade: 6, section: 'A', rollNumber: '6A03' },
  { name: 'Ananya Sharma', email: 'ananya.sharma@student.davlakhisarai.edu.in', grade: 6, section: 'A', rollNumber: '6A04' },
  { name: 'Vikram Kumar', email: 'vikram.kumar@student.davlakhisarai.edu.in', grade: 6, section: 'A', rollNumber: '6A05' },
  // Class 6B
  { name: 'Sneha Patel', email: 'sneha.patel@student.davlakhisarai.edu.in', grade: 6, section: 'B', rollNumber: '6B01' },
  { name: 'Rohan Das', email: 'rohan.das@student.davlakhisarai.edu.in', grade: 6, section: 'B', rollNumber: '6B02' },
  // Class 8A
  { name: 'Aditya Raj', email: 'aditya.raj@student.davlakhisarai.edu.in', grade: 8, section: 'A', rollNumber: '8A01' },
  { name: 'Kavya Singh', email: 'kavya.singh@student.davlakhisarai.edu.in', grade: 8, section: 'A', rollNumber: '8A02' },
  { name: 'Mohit Yadav', email: 'mohit.yadav@student.davlakhisarai.edu.in', grade: 8, section: 'A', rollNumber: '8A03' },
  // Class 10A
  { name: 'Riya Sharma', email: 'riya.sharma@student.davlakhisarai.edu.in', grade: 10, section: 'A', rollNumber: '10A01' },
  { name: 'Karan Mehta', email: 'karan.mehta@student.davlakhisarai.edu.in', grade: 10, section: 'A', rollNumber: '10A02' },
]

// Parents (linked to students by index)
const PARENTS = [
  { name: 'Mr. Ramesh Singh', email: 'ramesh.singh@gmail.com', childIndex: 0 }, // Aryan's parent
  { name: 'Mrs. Sunita Kumari', email: 'sunita.kumari@gmail.com', childIndex: 1 }, // Priya's parent
  { name: 'Mr. Vijay Verma', email: 'vijay.verma@gmail.com', childIndex: 2 }, // Rahul's parent
  { name: 'Mr. Suresh Raj', email: 'suresh.raj@gmail.com', childIndex: 7 }, // Aditya's parent
  { name: 'Mrs. Meena Sharma', email: 'meena.sharma@gmail.com', childIndex: 10 }, // Riya's parent
]

// Sample Lessons - spread across teachers and grades
const SAMPLE_LESSONS = [
  // Mathematics lessons (Priya Sharma)
  { topic: 'Introduction to Fractions', subject: 'Mathematics', grade: 6, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Adding and Subtracting Fractions', subject: 'Mathematics', grade: 6, section: 'B', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Algebraic Expressions', subject: 'Mathematics', grade: 8, section: 'A', language: 'MIXED' as const, status: 'published' },
  { topic: 'Quadratic Equations', subject: 'Mathematics', grade: 10, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Geometry - Triangles', subject: 'Mathematics', grade: 6, section: 'A', language: 'ENGLISH' as const, status: 'draft' },
  // Science lessons (Rajesh Kumar)
  { topic: 'Photosynthesis in Plants', subject: 'Science', grade: 6, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Human Digestive System', subject: 'Science', grade: 8, section: 'A', language: 'MIXED' as const, status: 'published' },
  { topic: 'Newton Laws of Motion', subject: 'Science', grade: 10, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Chemical Reactions', subject: 'Science', grade: 8, section: 'A', language: 'ENGLISH' as const, status: 'draft' },
  // English lessons (Sunita Devi)
  { topic: 'Present Tenses', subject: 'English', grade: 6, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Active and Passive Voice', subject: 'English', grade: 8, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Essay Writing Skills', subject: 'English', grade: 10, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Reading Comprehension', subject: 'English', grade: 6, section: 'B', language: 'ENGLISH' as const, status: 'draft' },
  // Hindi lessons (Amit Singh)
  { topic: 'संज्ञा और उसके भेद', subject: 'Hindi', grade: 6, section: 'A', language: 'HINDI' as const, status: 'published' },
  { topic: 'क्रिया विशेषण', subject: 'Hindi', grade: 8, section: 'A', language: 'HINDI' as const, status: 'published' },
  { topic: 'निबंध लेखन', subject: 'Hindi', grade: 10, section: 'A', language: 'MIXED' as const, status: 'published' },
  // Social Science lessons (Neha Gupta)
  { topic: 'The French Revolution', subject: 'Social Science', grade: 8, section: 'A', language: 'ENGLISH' as const, status: 'published' },
  { topic: 'Indian Constitution', subject: 'Social Science', grade: 10, section: 'A', language: 'MIXED' as const, status: 'published' },
  { topic: 'Natural Resources', subject: 'Social Science', grade: 6, section: 'A', language: 'ENGLISH' as const, status: 'draft' },
]

// Generate lesson plan JSON based on topic
function generateLessonPlan(topic: string, subject: string, grade: number) {
  return {
    title: topic,
    grade: grade,
    subject: subject,
    duration: '45 minutes',
    objectives: [
      `Understand the fundamental concepts of ${topic}`,
      `Apply knowledge of ${topic} to solve problems`,
      `Analyze and evaluate concepts related to ${topic}`,
    ],
    sections: [
      {
        title: 'Introduction',
        duration: '10 minutes',
        content: `Begin by reviewing previous knowledge and introducing ${topic}. Use visual aids and real-world examples to engage students.`,
        activities: ['Brainstorming session', 'Quick review quiz'],
      },
      {
        title: 'Main Content',
        duration: '25 minutes',
        content: `Detailed explanation of ${topic} concepts with examples and demonstrations.`,
        activities: ['Guided practice', 'Group discussion', 'Worked examples'],
      },
      {
        title: 'Practice & Assessment',
        duration: '10 minutes',
        content: 'Students work on practice problems independently while teacher provides support.',
        activities: ['Individual practice', 'Peer review', 'Exit ticket'],
      },
    ],
    materials: ['Textbook', 'Whiteboard', 'Worksheets', 'Visual aids'],
    homework: `Complete exercises 1-5 from the textbook on ${topic}`,
    assessment: 'Formative assessment through class participation and exit ticket',
  }
}

// Sample Worksheets
const SAMPLE_WORKSHEETS = [
  // Mathematics worksheets
  {
    title: 'Fractions Practice',
    subject: 'Mathematics',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'What is 1/2 + 1/4?', options: ['1/4', '2/4', '3/4', '1'], correctAnswer: '3/4', marks: 2, explanation: 'Convert to same denominator: 2/4 + 1/4 = 3/4' },
      { id: 2, type: 'mcq', question: 'Which fraction is largest?', options: ['1/2', '1/3', '1/4', '1/5'], correctAnswer: '1/2', marks: 2, explanation: 'Larger denominator means smaller fraction' },
      { id: 3, type: 'short', question: 'Simplify: 6/8', correctAnswer: '3/4', marks: 3, explanation: 'Divide both by GCD 2' },
      { id: 4, type: 'mcq', question: '3/5 as a decimal is:', options: ['0.3', '0.5', '0.6', '0.35'], correctAnswer: '0.6', marks: 2, explanation: '3 ÷ 5 = 0.6' },
      { id: 5, type: 'short', question: 'What is 2/3 of 12?', correctAnswer: '8', marks: 3, explanation: '12 × 2/3 = 24/3 = 8' },
    ],
  },
  {
    title: 'Algebra Basics',
    subject: 'Mathematics',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'Solve: 2x + 6 = 12', options: ['x=2', 'x=3', 'x=4', 'x=6'], correctAnswer: 'x=3', marks: 3, explanation: '2x = 6, x = 3' },
      { id: 2, type: 'mcq', question: 'Simplify: 3x + 2x', options: ['5x', '6x', '5x²', '6x²'], correctAnswer: '5x', marks: 2, explanation: 'Combine like terms' },
      { id: 3, type: 'short', question: 'Expand: (x+2)(x+3)', correctAnswer: 'x²+5x+6', marks: 4, explanation: 'Use FOIL method' },
      { id: 4, type: 'mcq', question: 'What is the value of x if 3x - 9 = 0?', options: ['0', '1', '3', '9'], correctAnswer: '3', marks: 3, explanation: '3x = 9, x = 3' },
      { id: 5, type: 'short', question: 'Factorize: x² - 9', correctAnswer: '(x+3)(x-3)', marks: 4, explanation: 'Difference of squares: a² - b² = (a+b)(a-b)' },
    ],
  },
  {
    title: 'Quadratic Equations',
    subject: 'Mathematics',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'The roots of x² - 5x + 6 = 0 are:', options: ['1, 6', '2, 3', '-2, -3', '1, 5'], correctAnswer: '2, 3', marks: 3, explanation: 'Factorize: (x-2)(x-3) = 0' },
      { id: 2, type: 'short', question: 'Find the discriminant of x² + 4x + 4 = 0', correctAnswer: '0', marks: 4, explanation: 'D = b² - 4ac = 16 - 16 = 0' },
      { id: 3, type: 'mcq', question: 'If discriminant < 0, the equation has:', options: ['Two real roots', 'One real root', 'No real roots', 'Infinite roots'], correctAnswer: 'No real roots', marks: 3, explanation: 'Complex roots when D < 0' },
      { id: 4, type: 'short', question: 'Sum of roots for ax² + bx + c = 0', correctAnswer: '-b/a', marks: 3, explanation: 'Sum = -b/a (Vieta\'s formulas)' },
      { id: 5, type: 'short', question: 'Solve: x² = 16', correctAnswer: 'x = ±4', marks: 3, explanation: 'Take square root of both sides' },
    ],
  },
  // Science worksheets
  {
    title: 'Photosynthesis Quiz',
    subject: 'Science',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'Where does photosynthesis occur?', options: ['Roots', 'Stem', 'Leaves', 'Flowers'], correctAnswer: 'Leaves', marks: 2, explanation: 'Chlorophyll in leaves captures sunlight' },
      { id: 2, type: 'mcq', question: 'What gas do plants release during photosynthesis?', options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], correctAnswer: 'Oxygen', marks: 2, explanation: 'O₂ is released as a byproduct' },
      { id: 3, type: 'short', question: 'Name the green pigment in plants', correctAnswer: 'Chlorophyll', marks: 2, explanation: 'Chlorophyll absorbs light energy' },
      { id: 4, type: 'mcq', question: 'Photosynthesis requires:', options: ['Only sunlight', 'Only water', 'Sunlight, water, and CO₂', 'Only CO₂'], correctAnswer: 'Sunlight, water, and CO₂', marks: 3, explanation: 'All three are essential' },
      { id: 5, type: 'short', question: 'What is the food produced by photosynthesis?', correctAnswer: 'Glucose', marks: 2, explanation: 'Glucose (sugar) is the primary product' },
    ],
  },
  {
    title: 'Human Body Systems',
    subject: 'Science',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'The longest part of the alimentary canal is:', options: ['Stomach', 'Small intestine', 'Large intestine', 'Esophagus'], correctAnswer: 'Small intestine', marks: 2, explanation: 'About 6 meters long' },
      { id: 2, type: 'short', question: 'Name the enzyme in saliva', correctAnswer: 'Amylase', marks: 3, explanation: 'Salivary amylase breaks down starch' },
      { id: 3, type: 'mcq', question: 'Bile is produced by:', options: ['Pancreas', 'Stomach', 'Liver', 'Gallbladder'], correctAnswer: 'Liver', marks: 2, explanation: 'Stored in gallbladder, produced in liver' },
      { id: 4, type: 'mcq', question: 'Absorption of nutrients mainly occurs in:', options: ['Stomach', 'Small intestine', 'Large intestine', 'Mouth'], correctAnswer: 'Small intestine', marks: 3, explanation: 'Villi increase surface area for absorption' },
      { id: 5, type: 'short', question: 'What is peristalsis?', correctAnswer: 'Wave-like muscle contractions that move food', marks: 4, explanation: 'Muscular movement of food through digestive tract' },
    ],
  },
  {
    title: 'Physics - Motion',
    subject: 'Science',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'Newton\'s first law is also called:', options: ['Law of acceleration', 'Law of inertia', 'Law of reaction', 'Law of gravity'], correctAnswer: 'Law of inertia', marks: 2, explanation: 'Objects resist change in motion' },
      { id: 2, type: 'short', question: 'State Newton\'s second law formula', correctAnswer: 'F = ma', marks: 3, explanation: 'Force equals mass times acceleration' },
      { id: 3, type: 'mcq', question: 'A 5 kg object accelerates at 2 m/s². The force is:', options: ['2.5 N', '7 N', '10 N', '3 N'], correctAnswer: '10 N', marks: 3, explanation: 'F = 5 × 2 = 10 N' },
      { id: 4, type: 'short', question: 'What is the unit of momentum?', correctAnswer: 'kg⋅m/s', marks: 2, explanation: 'Momentum = mass × velocity' },
      { id: 5, type: 'mcq', question: 'Which illustrates Newton\'s third law?', options: ['Ball rolling down', 'Car braking', 'Rocket launching', 'Apple falling'], correctAnswer: 'Rocket launching', marks: 3, explanation: 'Action (gas expulsion) and reaction (upward thrust)' },
    ],
  },
  // English worksheets
  {
    title: 'Grammar - Tenses',
    subject: 'English',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: '"She ___ to school daily" - Choose correct verb:', options: ['go', 'goes', 'going', 'gone'], correctAnswer: 'goes', marks: 2, explanation: 'Third person singular uses "goes"' },
      { id: 2, type: 'mcq', question: 'Identify the tense: "I am reading a book"', options: ['Simple present', 'Present continuous', 'Past continuous', 'Future'], correctAnswer: 'Present continuous', marks: 2, explanation: 'am/is/are + verb-ing = present continuous' },
      { id: 3, type: 'short', question: 'Convert to past tense: "He eats an apple"', correctAnswer: 'He ate an apple', marks: 3, explanation: 'Irregular verb: eat → ate' },
      { id: 4, type: 'mcq', question: 'Which is future tense?', options: ['I played', 'I play', 'I will play', 'I am playing'], correctAnswer: 'I will play', marks: 2, explanation: 'will + base verb = simple future' },
      { id: 5, type: 'short', question: 'Fill in: "They ___ (watch) TV right now"', correctAnswer: 'are watching', marks: 3, explanation: 'Present continuous for ongoing action' },
    ],
  },
  {
    title: 'Voice and Narration',
    subject: 'English',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'Convert to passive: "She writes a letter"', options: ['A letter is written by her', 'A letter was written by her', 'A letter will be written by her', 'A letter has been written by her'], correctAnswer: 'A letter is written by her', marks: 3, explanation: 'Simple present passive: is/are + past participle' },
      { id: 2, type: 'short', question: 'Change to active: "The cake was baked by mom"', correctAnswer: 'Mom baked the cake', marks: 3, explanation: 'Subject performs the action' },
      { id: 3, type: 'mcq', question: 'Identify the voice: "The window was broken"', options: ['Active', 'Passive', 'Neither', 'Both'], correctAnswer: 'Passive', marks: 2, explanation: 'Action is done to the subject' },
      { id: 4, type: 'short', question: 'Convert to indirect: He said, "I am happy"', correctAnswer: 'He said that he was happy', marks: 4, explanation: 'Change pronoun and tense' },
      { id: 5, type: 'mcq', question: 'In passive voice, the subject is:', options: ['Doer of action', 'Receiver of action', 'Neither', 'A verb'], correctAnswer: 'Receiver of action', marks: 2, explanation: 'The subject receives the action in passive voice' },
    ],
  },
  // Hindi worksheets
  {
    title: 'व्याकरण - संज्ञा',
    subject: 'Hindi',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'HINDI' as const,
    questions: [
      { id: 1, type: 'mcq', question: '"राम" कौन सी संज्ञा है?', options: ['जातिवाचक', 'व्यक्तिवाचक', 'भाववाचक', 'समूहवाचक'], correctAnswer: 'व्यक्तिवाचक', marks: 2, explanation: 'व्यक्ति का नाम व्यक्तिवाचक संज्ञा है' },
      { id: 2, type: 'mcq', question: '"ईमानदारी" कौन सी संज्ञा है?', options: ['जातिवाचक', 'व्यक्तिवाचक', 'भाववाचक', 'द्रव्यवाचक'], correctAnswer: 'भाववाचक', marks: 2, explanation: 'गुण या भाव को दर्शाती है' },
      { id: 3, type: 'short', question: '"लड़का" का बहुवचन लिखिए', correctAnswer: 'लड़के', marks: 2, explanation: 'आकारांत पुल्लिंग शब्द में आ → ए' },
      { id: 4, type: 'mcq', question: 'जातिवाचक संज्ञा का उदाहरण है:', options: ['गंगा', 'पुस्तक', 'दिल्ली', 'सुंदरता'], correctAnswer: 'पुस्तक', marks: 2, explanation: 'एक जाति के सभी व्यक्तियों का बोध' },
      { id: 5, type: 'short', question: '"सेना" किस प्रकार की संज्ञा है?', correctAnswer: 'समूहवाचक', marks: 3, explanation: 'समूह या झुंड का बोध कराती है' },
    ],
  },
  // Social Science worksheets
  {
    title: 'French Revolution',
    subject: 'Social Science',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'The French Revolution began in:', options: ['1776', '1789', '1799', '1804'], correctAnswer: '1789', marks: 2, explanation: 'Started with storming of Bastille on July 14, 1789' },
      { id: 2, type: 'short', question: 'What was the Bastille?', correctAnswer: 'A prison/fortress in Paris', marks: 3, explanation: 'Symbol of royal authority' },
      { id: 3, type: 'mcq', question: 'Who said "Let them eat cake"?', options: ['King Louis XVI', 'Marie Antoinette', 'Napoleon', 'Robespierre'], correctAnswer: 'Marie Antoinette', marks: 2, explanation: 'Attributed to the queen (possibly apocryphal)' },
      { id: 4, type: 'mcq', question: 'The slogan of the Revolution was:', options: ['Unity, Faith, Discipline', 'Liberty, Equality, Fraternity', 'Power to the People', 'Long Live the King'], correctAnswer: 'Liberty, Equality, Fraternity', marks: 2, explanation: 'Core ideals of the revolution' },
      { id: 5, type: 'short', question: 'Name the period of mass executions during the Revolution', correctAnswer: 'Reign of Terror', marks: 3, explanation: 'Led by Robespierre, 1793-1794' },
    ],
  },
  {
    title: 'Indian Constitution',
    subject: 'Social Science',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'MIXED' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'The Indian Constitution was adopted on:', options: ['15 August 1947', '26 January 1950', '26 November 1949', '2 October 1950'], correctAnswer: '26 November 1949', marks: 2, explanation: 'Adopted on 26 Nov 1949, came into effect on 26 Jan 1950' },
      { id: 2, type: 'short', question: 'Who is known as the Father of Indian Constitution?', correctAnswer: 'Dr. B.R. Ambedkar', marks: 2, explanation: 'Chairman of the Drafting Committee' },
      { id: 3, type: 'mcq', question: 'How many Fundamental Rights are there?', options: ['5', '6', '7', '8'], correctAnswer: '6', marks: 2, explanation: 'Originally 7, now 6 (Right to Property removed)' },
      { id: 4, type: 'short', question: 'What is the Preamble?', correctAnswer: 'Introduction to the Constitution stating its objectives', marks: 3, explanation: 'Contains ideals and philosophy of the Constitution' },
      { id: 5, type: 'mcq', question: 'Directive Principles are:', options: ['Legally enforceable', 'Not legally enforceable', 'Fundamental Rights', 'None of these'], correctAnswer: 'Not legally enforceable', marks: 3, explanation: 'Guidelines for governance, not justiciable' },
    ],
  },
  // More worksheets
  {
    title: 'Geometry Basics',
    subject: 'Mathematics',
    grade: 6,
    section: 'B',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'Sum of angles in a triangle is:', options: ['90°', '180°', '270°', '360°'], correctAnswer: '180°', marks: 2, explanation: 'Triangle angle sum property' },
      { id: 2, type: 'mcq', question: 'A triangle with all equal sides is:', options: ['Isosceles', 'Scalene', 'Equilateral', 'Right-angled'], correctAnswer: 'Equilateral', marks: 2, explanation: 'All three sides are equal' },
      { id: 3, type: 'short', question: 'What is the perimeter of a square with side 5 cm?', correctAnswer: '20 cm', marks: 3, explanation: 'Perimeter = 4 × side = 4 × 5 = 20' },
      { id: 4, type: 'mcq', question: 'Area of rectangle with l=8, b=5 is:', options: ['13', '26', '40', '80'], correctAnswer: '40', marks: 2, explanation: 'Area = length × breadth' },
      { id: 5, type: 'short', question: 'A right angle measures how many degrees?', correctAnswer: '90', marks: 2, explanation: 'Right angle = 90°' },
    ],
  },
  {
    title: 'Essay Writing Practice',
    subject: 'English',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'An essay introduction should:', options: ['Summarize the conclusion', 'Present all arguments', 'Hook reader and state thesis', 'List references'], correctAnswer: 'Hook reader and state thesis', marks: 2, explanation: 'Introduction captures attention and presents main idea' },
      { id: 2, type: 'short', question: 'What is a thesis statement?', correctAnswer: 'The main argument or point of the essay', marks: 3, explanation: 'Central claim that guides the essay' },
      { id: 3, type: 'mcq', question: 'Body paragraphs should contain:', options: ['Only opinions', 'Topic sentence and evidence', 'Just examples', 'Summary only'], correctAnswer: 'Topic sentence and evidence', marks: 3, explanation: 'Each paragraph supports thesis with evidence' },
      { id: 4, type: 'short', question: 'What are transition words?', correctAnswer: 'Words that connect ideas between sentences/paragraphs', marks: 3, explanation: 'Examples: however, furthermore, therefore' },
      { id: 5, type: 'mcq', question: 'A conclusion should NOT:', options: ['Restate thesis', 'Introduce new arguments', 'Summarize key points', 'Leave lasting impression'], correctAnswer: 'Introduce new arguments', marks: 2, explanation: 'Conclusion wraps up, doesn\'t add new content' },
    ],
  },
  {
    title: 'Natural Resources',
    subject: 'Social Science',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    questions: [
      { id: 1, type: 'mcq', question: 'Which is a renewable resource?', options: ['Coal', 'Petroleum', 'Solar energy', 'Natural gas'], correctAnswer: 'Solar energy', marks: 2, explanation: 'Solar energy is inexhaustible' },
      { id: 2, type: 'mcq', question: 'Forests are important because they:', options: ['Only provide wood', 'Produce oxygen and prevent erosion', 'Have no use', 'Only for animals'], correctAnswer: 'Produce oxygen and prevent erosion', marks: 2, explanation: 'Multiple ecological benefits' },
      { id: 3, type: 'short', question: 'Name two fossil fuels', correctAnswer: 'Coal and petroleum (or natural gas)', marks: 3, explanation: 'Formed from ancient organic matter' },
      { id: 4, type: 'mcq', question: 'Water cycle is also called:', options: ['Carbon cycle', 'Hydrological cycle', 'Nitrogen cycle', 'Rock cycle'], correctAnswer: 'Hydrological cycle', marks: 2, explanation: 'Continuous movement of water on Earth' },
      { id: 5, type: 'short', question: 'What is conservation?', correctAnswer: 'Protection and careful management of natural resources', marks: 3, explanation: 'Sustainable use of resources' },
    ],
  },
]

// Sample Homework - mix of active, upcoming, and overdue
const SAMPLE_HOMEWORK = [
  // Active homework (due in future)
  {
    title: 'Fractions Weekly Assignment',
    subject: 'Mathematics',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    instructions: 'Complete all questions. Show your work for full marks.',
    daysFromNow: 5, // due in 5 days
    questions: [
      { id: '1', question: 'Simplify: 12/16', type: 'short', correctAnswer: '3/4', maxMarks: 3, topic: 'Fractions' },
      { id: '2', question: 'Add: 1/3 + 1/6', type: 'short', correctAnswer: '1/2', maxMarks: 3, topic: 'Fractions' },
      { id: '3', question: 'Which is greater: 2/3 or 3/5?', type: 'short', correctAnswer: '2/3', maxMarks: 4, topic: 'Fractions' },
    ],
    totalMarks: 10,
  },
  {
    title: 'Photosynthesis Assignment',
    subject: 'Science',
    grade: 6,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    instructions: 'Answer all questions. Draw diagrams where necessary.',
    daysFromNow: 7,
    questions: [
      { id: '1', question: 'Write the equation for photosynthesis', type: 'short', correctAnswer: '6CO2 + 6H2O + Light → C6H12O6 + 6O2', maxMarks: 5, topic: 'Photosynthesis' },
      { id: '2', question: 'Name three factors affecting photosynthesis', type: 'short', correctAnswer: 'Light intensity, CO2 concentration, temperature', maxMarks: 3, topic: 'Photosynthesis' },
      { id: '3', question: 'Why are leaves green?', type: 'short', correctAnswer: 'Due to chlorophyll pigment', maxMarks: 2, topic: 'Photosynthesis' },
    ],
    totalMarks: 10,
  },
  {
    title: 'Grammar - Tenses Practice',
    subject: 'English',
    grade: 6,
    section: 'B',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    instructions: 'Convert the sentences as directed.',
    daysFromNow: 3,
    questions: [
      { id: '1', question: 'Convert to past: "I write a letter"', type: 'short', correctAnswer: 'I wrote a letter', maxMarks: 2, topic: 'Tenses' },
      { id: '2', question: 'Convert to future: "She sings a song"', type: 'short', correctAnswer: 'She will sing a song', maxMarks: 2, topic: 'Tenses' },
      { id: '3', question: 'Convert to present continuous: "They play cricket"', type: 'short', correctAnswer: 'They are playing cricket', maxMarks: 2, topic: 'Tenses' },
      { id: '4', question: 'Identify tense: "I have finished my work"', type: 'short', correctAnswer: 'Present perfect', maxMarks: 2, topic: 'Tenses' },
    ],
    totalMarks: 8,
  },
  // Class 8 homework
  {
    title: 'Algebraic Expressions Test',
    subject: 'Mathematics',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    instructions: 'Solve all problems. Simplify your answers.',
    daysFromNow: 4,
    questions: [
      { id: '1', question: 'Simplify: 3x + 2y + 5x - y', type: 'short', correctAnswer: '8x + y', maxMarks: 3, topic: 'Algebra' },
      { id: '2', question: 'Expand: (a + b)²', type: 'short', correctAnswer: 'a² + 2ab + b²', maxMarks: 4, topic: 'Algebra' },
      { id: '3', question: 'Factorize: x² - 16', type: 'short', correctAnswer: '(x+4)(x-4)', maxMarks: 4, topic: 'Algebra' },
      { id: '4', question: 'Solve: 2x + 7 = 15', type: 'short', correctAnswer: 'x = 4', maxMarks: 4, topic: 'Algebra' },
    ],
    totalMarks: 15,
  },
  {
    title: 'Digestive System Quiz',
    subject: 'Science',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'MIXED' as const,
    instructions: 'Answer in detail. Diagrams carry extra marks.',
    daysFromNow: 6,
    questions: [
      { id: '1', question: 'List the organs of the digestive system in order', type: 'short', correctAnswer: 'Mouth, Esophagus, Stomach, Small intestine, Large intestine', maxMarks: 5, topic: 'Digestion' },
      { id: '2', question: 'What is the role of HCl in stomach?', type: 'short', correctAnswer: 'Kills bacteria and activates pepsin', maxMarks: 3, topic: 'Digestion' },
      { id: '3', question: 'Where does maximum absorption occur?', type: 'short', correctAnswer: 'Small intestine', maxMarks: 2, topic: 'Digestion' },
    ],
    totalMarks: 10,
  },
  {
    title: 'French Revolution Analysis',
    subject: 'Social Science',
    grade: 8,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    instructions: 'Write detailed answers with examples.',
    daysFromNow: 10,
    questions: [
      { id: '1', question: 'What were the main causes of the French Revolution?', type: 'long', correctAnswer: 'Social inequality, financial crisis, Enlightenment ideas', maxMarks: 8, topic: 'French Revolution' },
      { id: '2', question: 'Explain the significance of the Bastille storming', type: 'short', correctAnswer: 'Symbolic end of royal authority', maxMarks: 4, topic: 'French Revolution' },
      { id: '3', question: 'Who were the Jacobins?', type: 'short', correctAnswer: 'Radical political club led by Robespierre', maxMarks: 3, topic: 'French Revolution' },
    ],
    totalMarks: 15,
  },
  // Class 10 homework
  {
    title: 'Quadratic Equations Assignment',
    subject: 'Mathematics',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    instructions: 'Use appropriate methods. Show all steps.',
    daysFromNow: 5,
    questions: [
      { id: '1', question: 'Solve by factorization: x² - 7x + 12 = 0', type: 'short', correctAnswer: 'x = 3, 4', maxMarks: 4, topic: 'Quadratics' },
      { id: '2', question: 'Find discriminant: 2x² + 4x + 2 = 0', type: 'short', correctAnswer: '0', maxMarks: 3, topic: 'Quadratics' },
      { id: '3', question: 'Solve using formula: x² + 5x + 6 = 0', type: 'short', correctAnswer: 'x = -2, -3', maxMarks: 5, topic: 'Quadratics' },
      { id: '4', question: 'Nature of roots when D > 0', type: 'short', correctAnswer: 'Two distinct real roots', maxMarks: 3, topic: 'Quadratics' },
    ],
    totalMarks: 15,
  },
  {
    title: 'Essay: Technology in Education',
    subject: 'English',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    instructions: 'Write an essay of 300-400 words with proper structure.',
    daysFromNow: 8,
    questions: [
      { id: '1', question: 'Write an essay on "Technology in Education" covering benefits, challenges, and your opinion', type: 'essay', correctAnswer: 'Well-structured essay with intro, body, conclusion', maxMarks: 20, topic: 'Essay Writing' },
    ],
    totalMarks: 20,
  },
  {
    title: 'Indian Constitution Test',
    subject: 'Social Science',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'MIXED' as const,
    instructions: 'Answer all questions. Give examples where possible.',
    daysFromNow: 6,
    questions: [
      { id: '1', question: 'List any 4 Fundamental Rights', type: 'short', correctAnswer: 'Right to Equality, Freedom, Against Exploitation, Religion, Constitutional Remedies, Education', maxMarks: 4, topic: 'Constitution' },
      { id: '2', question: 'What is the difference between Fundamental Rights and DPSP?', type: 'long', correctAnswer: 'FR are justiciable, DPSP are not', maxMarks: 6, topic: 'Constitution' },
      { id: '3', question: 'Explain the Preamble', type: 'long', correctAnswer: 'Introduction stating ideals: sovereign, socialist, secular, democratic republic', maxMarks: 5, topic: 'Constitution' },
    ],
    totalMarks: 15,
  },
  // Overdue homework (negative days = past due)
  {
    title: 'Basic Algebra Quiz',
    subject: 'Mathematics',
    grade: 6,
    section: 'A',
    difficulty: 'EASY' as const,
    language: 'ENGLISH' as const,
    instructions: 'Solve all equations.',
    daysFromNow: -3, // overdue by 3 days
    questions: [
      { id: '1', question: 'Solve: x + 5 = 12', type: 'short', correctAnswer: 'x = 7', maxMarks: 2, topic: 'Algebra' },
      { id: '2', question: 'Solve: 2y = 10', type: 'short', correctAnswer: 'y = 5', maxMarks: 2, topic: 'Algebra' },
      { id: '3', question: 'Solve: z - 3 = 9', type: 'short', correctAnswer: 'z = 12', maxMarks: 2, topic: 'Algebra' },
    ],
    totalMarks: 6,
  },
  {
    title: 'Cell Structure Quiz',
    subject: 'Science',
    grade: 8,
    section: 'A',
    difficulty: 'MEDIUM' as const,
    language: 'ENGLISH' as const,
    instructions: 'Label the cell diagram and answer questions.',
    daysFromNow: -5,
    questions: [
      { id: '1', question: 'Name the control center of the cell', type: 'short', correctAnswer: 'Nucleus', maxMarks: 2, topic: 'Cells' },
      { id: '2', question: 'What is the function of mitochondria?', type: 'short', correctAnswer: 'Energy production (ATP)', maxMarks: 3, topic: 'Cells' },
      { id: '3', question: 'Difference between plant and animal cell', type: 'long', correctAnswer: 'Plant cell has cell wall, chloroplasts, large vacuole', maxMarks: 5, topic: 'Cells' },
    ],
    totalMarks: 10,
  },
  {
    title: 'Newton Laws Assignment',
    subject: 'Science',
    grade: 10,
    section: 'A',
    difficulty: 'HARD' as const,
    language: 'ENGLISH' as const,
    instructions: 'Solve numericals with proper steps.',
    daysFromNow: -2,
    questions: [
      { id: '1', question: 'A 10 kg object accelerates at 5 m/s². Find force.', type: 'short', correctAnswer: '50 N', maxMarks: 4, topic: 'Motion' },
      { id: '2', question: 'State Newton\'s third law with an example', type: 'short', correctAnswer: 'Every action has equal and opposite reaction', maxMarks: 4, topic: 'Motion' },
      { id: '3', question: 'Calculate momentum of 5 kg object moving at 10 m/s', type: 'short', correctAnswer: '50 kg⋅m/s', maxMarks: 4, topic: 'Motion' },
    ],
    totalMarks: 12,
  },
]

// Sample Chat History - conversations between students and AI tutor
const SAMPLE_CHAT_TOPICS = [
  { topic: 'Help with fractions', subject: 'Mathematics', gradeRange: [6] },
  { topic: 'Understanding photosynthesis', subject: 'Science', gradeRange: [6] },
  { topic: 'English grammar doubt', subject: 'English', gradeRange: [6, 8] },
  { topic: 'Algebra problem solving', subject: 'Mathematics', gradeRange: [8] },
  { topic: 'Digestive system explanation', subject: 'Science', gradeRange: [8] },
  { topic: 'French Revolution summary', subject: 'Social Science', gradeRange: [8] },
  { topic: 'Quadratic equations help', subject: 'Mathematics', gradeRange: [10] },
  { topic: 'Essay writing tips', subject: 'English', gradeRange: [10] },
  { topic: 'Physics motion problems', subject: 'Science', gradeRange: [10] },
  { topic: 'Constitution fundamentals', subject: 'Social Science', gradeRange: [10] },
]

function generateChatMessages(topic: string, subject: string) {
  const messages = [
    { role: 'user', content: `I need help with ${topic.toLowerCase()}. Can you explain?`, timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    { role: 'assistant', content: `Of course! I'd be happy to help you with ${topic.toLowerCase()}. Let me explain the key concepts step by step.\n\nFirst, let's understand the basics...`, timestamp: new Date(Date.now() - 29 * 60000).toISOString() },
    { role: 'user', content: `That makes sense. But I'm still confused about one part...`, timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
    { role: 'assistant', content: `Great question! Let me clarify that specific part. Think of it this way...\n\nWould you like me to give you a practice problem to try?`, timestamp: new Date(Date.now() - 24 * 60000).toISOString() },
    { role: 'user', content: `Yes please, that would help!`, timestamp: new Date(Date.now() - 20 * 60000).toISOString() },
    { role: 'assistant', content: `Here's a practice problem for you:\n\n[Practice problem related to ${topic}]\n\nTake your time and let me know your answer!`, timestamp: new Date(Date.now() - 19 * 60000).toISOString() },
  ]
  return messages
}

// Student progress metrics template
function generateProgressMetrics(subject: string, studentGrade: number) {
  const baseScore = 60 + Math.floor(Math.random() * 30) // 60-90 range
  const topicsCompleted = 5 + Math.floor(Math.random() * 10)

  const subjectStrengths: Record<string, string[]> = {
    'Mathematics': ['Problem solving', 'Calculations', 'Logical reasoning'],
    'Science': ['Conceptual understanding', 'Diagrams', 'Experiments'],
    'English': ['Grammar', 'Vocabulary', 'Comprehension'],
    'Hindi': ['व्याकरण', 'शब्दावली', 'पठन'],
    'Social Science': ['Dates and events', 'Map work', 'Critical analysis'],
  }

  const subjectWeaknesses: Record<string, string[]> = {
    'Mathematics': ['Word problems', 'Geometry proofs', 'Time management'],
    'Science': ['Numerical problems', 'Memorization', 'Application'],
    'English': ['Essay structure', 'Punctuation', 'Idioms'],
    'Hindi': ['निबंध', 'अलंकार', 'छंद'],
    'Social Science': ['Long answers', 'Chronological order', 'Connecting events'],
  }

  const strengths = subjectStrengths[subject] || ['General understanding']
  const weaknesses = subjectWeaknesses[subject] || ['Practice needed']

  return {
    topicsCompleted,
    averageScore: baseScore,
    totalQuizzes: topicsCompleted + Math.floor(Math.random() * 5),
    strengths: strengths.slice(0, 2),
    weaknesses: weaknesses.slice(0, 1),
    lastActivity: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
  }
}

async function main() {
  console.log('\n🏫 Creating DAV Public School, Lakhisarai...\n')

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  // Check if school already exists
  const existingSchool = await prisma.school.findUnique({
    where: { slug: SCHOOL.slug },
  })

  if (existingSchool) {
    console.log('⚠️  School already exists. Deleting and recreating...\n')

    // Get users of this school for related data deletion
    const schoolUsers = await prisma.user.findMany({
      where: { school: { id: existingSchool.id } },
      select: { id: true },
    })
    const userIds = schoolUsers.map(u => u.id)

    // Get classes of this school
    const schoolClasses = await prisma.class.findMany({
      where: { school: { id: existingSchool.id } },
      select: { id: true },
    })
    const classIds = schoolClasses.map(c => c.id)

    // Delete all related data first
    if (classIds.length > 0) {
      await prisma.homeworkSubmission.deleteMany({ where: { homework: { classId: { in: classIds } } } })
      await prisma.homework.deleteMany({ where: { classId: { in: classIds } } })
    }
    if (userIds.length > 0) {
      await prisma.worksheetResponse.deleteMany({ where: { student: { userId: { in: userIds } } } })
      await prisma.worksheet.deleteMany({ where: { createdById: { in: userIds } } })
      await prisma.lesson.deleteMany({ where: { teacherId: { in: userIds } } })
      await prisma.chatHistory.deleteMany({ where: { student: { userId: { in: userIds } } } })
      await prisma.studentProgress.deleteMany({ where: { student: { userId: { in: userIds } } } })
      await prisma.student.deleteMany({ where: { userId: { in: userIds } } })
      await prisma.account.deleteMany({ where: { userId: { in: userIds } } })
    }
    if (classIds.length > 0) {
      await prisma.teacherClass.deleteMany({ where: { classId: { in: classIds } } })
    }
    await prisma.user.deleteMany({ where: { school: { id: existingSchool.id } } })
    await prisma.class.deleteMany({ where: { school: { id: existingSchool.id } } })
    await prisma.school.delete({ where: { id: existingSchool.id } })
  }

  // Create school
  const school = await prisma.school.create({
    data: {
      name: SCHOOL.name,
      slug: SCHOOL.slug,
      email: SCHOOL.email,
      settings: {
        language: 'MIXED',
        timezone: 'Asia/Kolkata',
      },
    },
  })
  console.log(`✅ School created: ${school.name}`)

  // Get subjects
  const subjects = await prisma.subject.findMany()
  console.log(`📚 Found ${subjects.length} subjects:`, subjects.map(s => s.name).join(', '))
  const subjectMap = new Map(subjects.map(s => [s.name, s.id]))

  // Create classes
  const classMap = new Map<string, string>()
  for (let grade = 1; grade <= 10; grade++) {
    for (const section of ['A', 'B']) {
      const cls = await prisma.class.create({
        data: {
          name: `Class ${grade}${section}`,
          grade,
          section,
          school: { connect: { id: school.id } },
        },
      })
      classMap.set(`${grade}${section}`, cls.id)
    }
  }
  console.log(`✅ Created 20 classes (Grades 1-10, Sections A & B)`)

  // Create admin
  const admin = await prisma.user.create({
    data: {
      email: ADMIN.email,
      password: hashedPassword,
      name: ADMIN.name,
      role: 'ADMIN',
      languagePreference: 'MIXED',
      school: { connect: { id: school.id } },
    },
  })
  console.log(`✅ Admin created: ${admin.email}`)

  // Create teachers and assign to classes
  const teacherIds: string[] = []
  for (const teacher of TEACHERS) {
    const t = await prisma.user.create({
      data: {
        email: teacher.email,
        password: hashedPassword,
        name: teacher.name,
        role: 'TEACHER',
        languagePreference: 'MIXED',
        school: { connect: { id: school.id } },
      },
    })
    teacherIds.push(t.id)

    // Assign teacher to classes (grades 6-10)
    const subjectId = subjectMap.get(teacher.subject) || (subjects.length > 0 ? subjects[0].id : null)
    if (subjectId) {
      for (let grade = 6; grade <= 10; grade++) {
        for (const section of ['A', 'B']) {
          const classId = classMap.get(`${grade}${section}`)
          if (classId) {
            await prisma.teacherClass.create({
              data: {
                teacherId: t.id,
                classId,
                subjectId,
              },
            })
          }
        }
      }
    } else {
      console.log(`⚠️  Skipping class assignments for ${teacher.name} - no subjects found`)
    }
  }
  console.log(`✅ Created ${TEACHERS.length} teachers`)

  // Create students (User + Student records)
  const studentUserIds: string[] = []
  const studentRecordIds: string[] = []
  for (const student of STUDENTS) {
    const classId = classMap.get(`${student.grade}${student.section}`)

    // Create User first
    const u = await prisma.user.create({
      data: {
        email: student.email,
        password: hashedPassword,
        name: student.name,
        role: 'STUDENT',
        languagePreference: 'MIXED',
        school: { connect: { id: school.id } },
      },
    })
    studentUserIds.push(u.id)

    // Create Student record linking to class
    if (classId) {
      const s = await prisma.student.create({
        data: {
          user: { connect: { id: u.id } },
          class: { connect: { id: classId } },
          rollNumber: student.rollNumber,
        },
      })
      studentRecordIds.push(s.id)
    }
  }
  console.log(`✅ Created ${STUDENTS.length} students`)

  // Create parents and link to students
  for (const parent of PARENTS) {
    const p = await prisma.user.create({
      data: {
        email: parent.email,
        password: hashedPassword,
        name: parent.name,
        role: 'PARENT',
        languagePreference: 'MIXED',
        school: { connect: { id: school.id } },
      },
    })

    // Link parent to child's Student record
    if (studentRecordIds[parent.childIndex]) {
      await prisma.student.update({
        where: { id: studentRecordIds[parent.childIndex] },
        data: { parent: { connect: { id: p.id } } },
      })
    }
  }
  console.log(`✅ Created ${PARENTS.length} parents`)

  // Create teacher map for lessons/worksheets
  const teacherBySubject = new Map<string, string>()
  for (let i = 0; i < TEACHERS.length; i++) {
    teacherBySubject.set(TEACHERS[i].subject, teacherIds[i])
  }

  // Create Lessons
  console.log('\n📚 Creating sample lessons...')
  let lessonCount = 0
  for (const lesson of SAMPLE_LESSONS) {
    const teacherId = teacherBySubject.get(lesson.subject)
    const classId = classMap.get(`${lesson.grade}${lesson.section}`)
    const subjectId = subjectMap.get(lesson.subject)

    if (teacherId && classId && subjectId) {
      await prisma.lesson.create({
        data: {
          topic: lesson.topic,
          generatedPlan: generateLessonPlan(lesson.topic, lesson.subject, lesson.grade),
          language: lesson.language,
          date: new Date(Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000),
          status: lesson.status,
          teacher: { connect: { id: teacherId } },
          class: { connect: { id: classId } },
          subject: { connect: { id: subjectId } },
        },
      })
      lessonCount++
    }
  }
  console.log(`✅ Created ${lessonCount} lessons`)

  // Create Worksheets
  console.log('\n📝 Creating sample worksheets...')
  let worksheetCount = 0
  const worksheetIds: string[] = []
  for (const worksheet of SAMPLE_WORKSHEETS) {
    const teacherId = teacherBySubject.get(worksheet.subject)
    const classId = classMap.get(`${worksheet.grade}${worksheet.section}`)
    const subjectId = subjectMap.get(worksheet.subject)

    if (teacherId && classId && subjectId) {
      const ws = await prisma.worksheet.create({
        data: {
          title: worksheet.title,
          questions: worksheet.questions,
          difficulty: worksheet.difficulty,
          language: worksheet.language,
          createdBy: { connect: { id: teacherId } },
          class: { connect: { id: classId } },
          subject: { connect: { id: subjectId } },
        },
      })
      worksheetIds.push(ws.id)
      worksheetCount++
    }
  }
  console.log(`✅ Created ${worksheetCount} worksheets`)

  // Create Homework
  console.log('\n📋 Creating sample homework...')
  const homeworkIds: { id: string; grade: number; section: string }[] = []
  for (const hw of SAMPLE_HOMEWORK) {
    const teacherId = teacherBySubject.get(hw.subject)
    const classId = classMap.get(`${hw.grade}${hw.section}`)
    const subjectId = subjectMap.get(hw.subject)

    if (teacherId && classId && subjectId) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + hw.daysFromNow)

      const homework = await prisma.homework.create({
        data: {
          title: hw.title,
          instructions: hw.instructions,
          questions: hw.questions,
          totalMarks: hw.totalMarks,
          difficulty: hw.difficulty,
          language: hw.language,
          dueDate,
          teacher: { connect: { id: teacherId } },
          class: { connect: { id: classId } },
          subject: { connect: { id: subjectId } },
        },
      })
      homeworkIds.push({ id: homework.id, grade: hw.grade, section: hw.section })
    }
  }
  console.log(`✅ Created ${homeworkIds.length} homework assignments`)

  // Create Homework Submissions
  console.log('\n✏️ Creating homework submissions...')
  let submissionCount = 0

  // Helper function to generate submission answers
  function generateSubmissionAnswers(questions: { id: string; maxMarks: number; correctAnswer: string }[], isCorrect: boolean, percentage: number) {
    return questions.map((q) => {
      const correct = isCorrect && Math.random() < percentage / 100
      const marksAwarded = correct ? q.maxMarks : Math.floor(q.maxMarks * Math.random() * 0.5)
      return {
        questionId: q.id,
        answer: correct ? q.correctAnswer : 'Student answer here',
        isCorrect: correct,
        marksAwarded,
        feedback: correct ? 'Correct!' : 'Needs improvement',
      }
    })
  }

  // Create submissions for each homework
  for (const hw of homeworkIds) {
    // Find students in this class
    const classStudents = STUDENTS.filter((s) => s.grade === hw.grade && s.section === hw.section)

    for (let i = 0; i < classStudents.length; i++) {
      const studentIdx = STUDENTS.findIndex((s) => s.email === classStudents[i].email)
      if (studentIdx === -1 || !studentRecordIds[studentIdx]) continue

      const studentId = studentRecordIds[studentIdx]

      // Get homework questions
      const homework = await prisma.homework.findUnique({ where: { id: hw.id } })
      if (!homework) continue

      const questions = homework.questions as { id: string; maxMarks: number; correctAnswer: string }[]

      // Determine submission status (40% pending, 30% submitted, 30% graded)
      const rand = Math.random()
      let status: 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE'
      let submittedAt: Date | null = null
      let gradedAt: Date | null = null
      let answers: ReturnType<typeof generateSubmissionAnswers> | null = null
      let totalScore: number | null = null
      let percentage: number | null = null
      let aiFeedback: object | null = null
      let isLate = false

      if (rand < 0.4) {
        // Pending (not submitted)
        status = 'PENDING'
      } else if (rand < 0.7) {
        // Submitted but not graded
        status = 'SUBMITTED'
        submittedAt = new Date(Date.now() - Math.floor(Math.random() * 3) * 24 * 60 * 60 * 1000)
        answers = generateSubmissionAnswers(questions, false, 0)
        isLate = homework.dueDate < submittedAt
        if (isLate) status = 'LATE'
      } else {
        // Graded
        status = 'GRADED'
        submittedAt = new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000)
        gradedAt = new Date(submittedAt.getTime() + Math.floor(Math.random() * 24) * 60 * 60 * 1000)
        const studentPerformance = 60 + Math.floor(Math.random() * 35) // 60-95%
        answers = generateSubmissionAnswers(questions, true, studentPerformance)
        totalScore = answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0)
        percentage = (totalScore / homework.totalMarks) * 100
        isLate = homework.dueDate < submittedAt
        aiFeedback = {
          overallFeedback: percentage >= 70 ? 'Good effort! Keep up the good work.' : 'You need more practice in this topic.',
          strengths: ['Clear understanding of basic concepts'],
          weaknesses: percentage < 70 ? ['Needs more practice with complex problems'] : [],
          suggestedTopics: ['Review related chapters'],
        }
      }

      await prisma.homeworkSubmission.create({
        data: {
          answers: answers || [],
          totalScore,
          percentage,
          status,
          submittedAt,
          gradedAt,
          ...(aiFeedback && { aiFeedback }),
          isLate,
          student: { connect: { id: studentId } },
          homework: { connect: { id: hw.id } },
        },
      })
      submissionCount++
    }
  }
  console.log(`✅ Created ${submissionCount} homework submissions`)

  // Create Student Progress
  console.log('\n📊 Creating student progress data...')
  let progressCount = 0
  const progressSubjects = ['Mathematics', 'Science', 'English']

  for (let i = 0; i < STUDENTS.length; i++) {
    const studentId = studentRecordIds[i]
    if (!studentId) continue

    for (const subjectName of progressSubjects) {
      const subjectId = subjectMap.get(subjectName)
      if (!subjectId) continue

      const metrics = generateProgressMetrics(subjectName, STUDENTS[i].grade)

      await prisma.studentProgress.create({
        data: {
          metrics,
          student: { connect: { id: studentId } },
          subject: { connect: { id: subjectId } },
        },
      })
      progressCount++
    }
  }
  console.log(`✅ Created ${progressCount} student progress records`)

  // Create Chat History
  console.log('\n💬 Creating chat history...')
  let chatCount = 0

  for (let i = 0; i < STUDENTS.length; i++) {
    const student = STUDENTS[i]
    const studentId = studentRecordIds[i]
    if (!studentId) continue

    // Find chat topics relevant to this student's grade
    const relevantTopics = SAMPLE_CHAT_TOPICS.filter((t) => t.gradeRange.includes(student.grade))

    // Create 2-3 chat sessions per student
    const numChats = 2 + Math.floor(Math.random() * 2)
    const selectedTopics = relevantTopics.slice(0, numChats)

    for (const chatTopic of selectedTopics) {
      const subjectId = subjectMap.get(chatTopic.subject)
      if (!subjectId) continue

      await prisma.chatHistory.create({
        data: {
          messages: generateChatMessages(chatTopic.topic, chatTopic.subject),
          topic: chatTopic.topic,
          student: { connect: { id: studentId } },
          subject: { connect: { id: subjectId } },
        },
      })
      chatCount++
    }
  }
  console.log(`✅ Created ${chatCount} chat history records`)

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 DAV PUBLIC SCHOOL, LAKHISARAI - DEMO ACCOUNTS')
  console.log('='.repeat(60))
  console.log(`\n🔐 Default Password for all accounts: ${DEFAULT_PASSWORD}\n`)

  console.log('👤 ADMIN:')
  console.log(`   Email: ${ADMIN.email}`)
  console.log(`   Name: ${ADMIN.name}`)

  console.log('\n👩‍🏫 TEACHERS:')
  for (const teacher of TEACHERS) {
    console.log(`   ${teacher.name} (${teacher.subject})`)
    console.log(`   Email: ${teacher.email}`)
  }

  console.log('\n👨‍🎓 STUDENTS:')
  for (const student of STUDENTS) {
    console.log(`   ${student.name} - Class ${student.grade}${student.section} (Roll: ${student.rollNumber})`)
    console.log(`   Email: ${student.email}`)
  }

  console.log('\n👪 PARENTS:')
  for (const parent of PARENTS) {
    const childName = STUDENTS[parent.childIndex].name
    console.log(`   ${parent.name} (Parent of ${childName})`)
    console.log(`   Email: ${parent.email}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 CONTENT DATA SUMMARY')
  console.log('='.repeat(60))
  console.log(`   📚 Lessons: ${lessonCount}`)
  console.log(`   📝 Worksheets: ${worksheetCount}`)
  console.log(`   📋 Homework: ${homeworkIds.length}`)
  console.log(`   ✏️  Submissions: ${submissionCount}`)
  console.log(`   📈 Student Progress: ${progressCount}`)
  console.log(`   💬 Chat History: ${chatCount}`)

  console.log('\n' + '='.repeat(60))
  console.log('🚀 LOGIN URL: https://thestai.com/login')
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e.message)
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
