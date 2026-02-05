import { PrismaClient, UserRole, UserStatus, ProductTier, Difficulty, Language } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface TestData {
  school: { id: string; slug: string; name: string };
  class: { id: string; name: string; grade: number };
  subjects: { id: string; name: string }[];
  users: {
    admin: TestUser;
    teacher: TestUser;
    student: TestUser;
    parent: TestUser;
    pendingTeacher: TestUser;
  };
}

const TEST_SCHOOL_SLUG = process.env.TEST_SCHOOL_SLUG || 'e2e-test-school';
const TEST_SCHOOL_NAME = process.env.TEST_SCHOOL_NAME || 'E2E Test School';

const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@e2e.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
    name: 'Test Admin',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  },
  teacher: {
    email: process.env.TEST_TEACHER_EMAIL || 'test-teacher@e2e.test',
    password: process.env.TEST_TEACHER_PASSWORD || 'TestTeacher123!',
    name: 'Test Teacher',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'test-student@e2e.test',
    password: process.env.TEST_STUDENT_PASSWORD || 'TestStudent123!',
    name: 'Test Student',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  },
  parent: {
    email: process.env.TEST_PARENT_EMAIL || 'test-parent@e2e.test',
    password: process.env.TEST_PARENT_PASSWORD || 'TestParent123!',
    name: 'Test Parent',
    role: UserRole.PARENT,
    status: UserStatus.ACTIVE,
  },
  pendingTeacher: {
    email: process.env.TEST_PENDING_TEACHER_EMAIL || 'test-pending-teacher@e2e.test',
    password: process.env.TEST_PENDING_TEACHER_PASSWORD || 'TestPendingTeacher123!',
    name: 'Pending Teacher',
    role: UserRole.TEACHER,
    status: UserStatus.PENDING_APPROVAL,
  },
};

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function seedTestData(): Promise<TestData> {
  console.log('Seeding test data...');

  // Create or find test school
  let school = await prisma.school.findUnique({
    where: { slug: TEST_SCHOOL_SLUG },
  });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: TEST_SCHOOL_NAME,
        slug: TEST_SCHOOL_SLUG,
        email: 'test@e2e.test',
        isActive: true,
      },
    });
  }

  // Create subscription for the school
  const existingSubscription = await prisma.schoolSubscription.findUnique({
    where: { schoolId: school.id },
  });

  if (!existingSubscription) {
    await prisma.schoolSubscription.create({
      data: {
        schoolId: school.id,
        tier: ProductTier.ELITE,
        maxStudents: 100,
        maxTeachers: 20,
        isActive: true,
      },
    });
  }

  // Create or find subjects
  const subjectNames = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'];
  const subjects: { id: string; name: string }[] = [];

  for (const name of subjectNames) {
    let subject = await prisma.subject.findFirst({
      where: { name, gradeLevel: null },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: { name },
      });
    }

    subjects.push({ id: subject.id, name: subject.name });
  }

  // Create or find test class
  let testClass = await prisma.class.findFirst({
    where: { schoolId: school.id, grade: 5, section: 'A' },
  });

  if (!testClass) {
    testClass = await prisma.class.create({
      data: {
        name: 'Class 5-A',
        grade: 5,
        section: 'A',
        schoolId: school.id,
      },
    });
  }

  // Create test users
  const users: Record<string, TestUser> = {};

  for (const [key, userData] of Object.entries(TEST_USERS)) {
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      const hashedPassword = await hashPassword(userData.password);
      user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          status: userData.status,
          schoolId: school.id,
          emailVerified: userData.status === UserStatus.ACTIVE ? new Date() : null,
        },
      });

      // Create student record if needed
      if (userData.role === UserRole.STUDENT && user.status === UserStatus.ACTIVE) {
        const existingStudent = await prisma.student.findUnique({
          where: { userId: user.id },
        });

        if (!existingStudent) {
          await prisma.student.create({
            data: {
              userId: user.id,
              classId: testClass.id,
              rollNumber: '001',
            },
          });
        }
      }

      // Create teacher-class assignment if needed
      if (userData.role === UserRole.TEACHER && user.status === UserStatus.ACTIVE) {
        const existingAssignment = await prisma.teacherClass.findFirst({
          where: { teacherId: user.id },
        });

        if (!existingAssignment) {
          await prisma.teacherClass.create({
            data: {
              teacherId: user.id,
              classId: testClass.id,
              subjectId: subjects[0].id, // Mathematics
            },
          });
        }
      }
    }

    users[key] = {
      id: user.id,
      email: userData.email,
      password: userData.password,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }

  // --- Enhanced seed data for E2E tests ---

  const teacherId = users.teacher.id;
  const mathSubjectId = subjects[0].id;
  const studentRecord = await prisma.student.findUnique({
    where: { userId: users.student.id },
  });

  // Seed a sample lesson
  const existingLesson = await prisma.lesson.findFirst({
    where: { teacherId, topic: 'E2E Test: Fractions' },
  });
  if (!existingLesson) {
    await prisma.lesson.create({
      data: {
        topic: 'E2E Test: Fractions',
        generatedPlan: {
          objectives: ['Understand fractions', 'Add simple fractions'],
          activities: [
            { name: 'Introduction', duration: 10, description: 'Explain what fractions are' },
            { name: 'Practice', duration: 20, description: 'Solve fraction problems' },
          ],
          assessment: 'Quiz on adding fractions',
        },
        language: Language.ENGLISH,
        date: new Date(),
        status: 'published',
        teacherId,
        classId: testClass.id,
        subjectId: mathSubjectId,
      },
    });
  }

  // Seed a sample worksheet
  const existingWorksheet = await prisma.worksheet.findFirst({
    where: { createdById: teacherId, title: 'E2E Test: Math Worksheet' },
  });
  let worksheetId = existingWorksheet?.id;
  if (!existingWorksheet) {
    const ws = await prisma.worksheet.create({
      data: {
        title: 'E2E Test: Math Worksheet',
        questions: [
          { id: 'q1', question: 'What is 5 + 3?', type: 'MCQ', options: ['6', '7', '8', '9'], correctAnswer: '8', marks: 2 },
          { id: 'q2', question: 'What is 10 - 4?', type: 'MCQ', options: ['5', '6', '7', '8'], correctAnswer: '6', marks: 2 },
          { id: 'q3', question: 'Fill in the blank: 3 x __ = 12', type: 'FILL_BLANK', correctAnswer: '4', marks: 2 },
          { id: 'q4', question: 'What is the square root of 16?', type: 'SHORT_ANSWER', correctAnswer: '4', marks: 2 },
          { id: 'q5', question: 'Is 7 a prime number?', type: 'MCQ', options: ['Yes', 'No'], correctAnswer: 'Yes', marks: 2 },
        ],
        difficulty: Difficulty.MEDIUM,
        language: Language.ENGLISH,
        createdById: teacherId,
        classId: testClass.id,
        subjectId: mathSubjectId,
      },
    });
    worksheetId = ws.id;
  }

  // Seed a homework assignment
  const existingHomework = await prisma.homework.findFirst({
    where: { teacherId, title: 'E2E Test: Math Homework' },
  });
  let homeworkId = existingHomework?.id;
  if (!existingHomework) {
    const hw = await prisma.homework.create({
      data: {
        title: 'E2E Test: Math Homework',
        instructions: 'Complete all questions. Show your working.',
        questions: [
          { id: 'hw1', question: 'Solve: 15 + 27', type: 'SHORT_ANSWER', correctAnswer: '42', maxMarks: 5, topic: 'Addition' },
          { id: 'hw2', question: 'What is 8 x 7?', type: 'MCQ', options: ['54', '56', '58', '64'], correctAnswer: '56', maxMarks: 5, topic: 'Multiplication' },
          { id: 'hw3', question: 'Write 3/4 as a decimal', type: 'SHORT_ANSWER', correctAnswer: '0.75', maxMarks: 5, topic: 'Fractions' },
        ],
        totalMarks: 15,
        difficulty: Difficulty.MEDIUM,
        language: Language.ENGLISH,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        teacherId,
        classId: testClass.id,
        subjectId: mathSubjectId,
      },
    });
    homeworkId = hw.id;
  }

  // Seed a homework submission from student
  if (homeworkId && studentRecord) {
    const existingSubmission = await prisma.homeworkSubmission.findUnique({
      where: { studentId_homeworkId: { studentId: studentRecord.id, homeworkId } },
    });
    if (!existingSubmission) {
      await prisma.homeworkSubmission.create({
        data: {
          answers: [
            { questionId: 'hw1', answer: '42' },
            { questionId: 'hw2', answer: '56' },
            { questionId: 'hw3', answer: '0.75' },
          ],
          status: 'SUBMITTED',
          submittedAt: new Date(),
          studentId: studentRecord.id,
          homeworkId,
        },
      });
    }
  }

  // Seed a diagram
  const existingDiagram = await prisma.diagram.findFirst({
    where: { createdById: teacherId, title: 'E2E Test: Math Flowchart' },
  });
  if (!existingDiagram) {
    await prisma.diagram.create({
      data: {
        title: 'E2E Test: Math Flowchart',
        description: 'A flowchart for solving math problems',
        type: 'FLOWCHART',
        visibility: 'CLASS',
        nodes: [
          { id: 'n1', type: 'start-end', position: { x: 100, y: 50 }, data: { label: 'Start' } },
          { id: 'n2', type: 'process', position: { x: 100, y: 150 }, data: { label: 'Read Problem' } },
          { id: 'n3', type: 'decision', position: { x: 100, y: 250 }, data: { label: 'Understand?' } },
          { id: 'n4', type: 'start-end', position: { x: 100, y: 350 }, data: { label: 'Solve' } },
        ],
        edges: [
          { id: 'e1-2', source: 'n1', target: 'n2' },
          { id: 'e2-3', source: 'n2', target: 'n3' },
          { id: 'e3-4', source: 'n3', target: 'n4' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
        createdById: teacherId,
        schoolId: school.id,
        classId: testClass.id,
      },
    });
  }

  // Seed training category and module
  let trainingCategory = await prisma.trainingCategory.findFirst({
    where: { name: 'E2E Test: Teaching Methods' },
  });
  if (!trainingCategory) {
    trainingCategory = await prisma.trainingCategory.create({
      data: {
        name: 'E2E Test: Teaching Methods',
        description: 'Modern teaching methodologies for effective learning',
        icon: 'book',
        order: 1,
      },
    });
  }

  const existingModule = await prisma.trainingModule.findFirst({
    where: { title: 'E2E Test: Active Learning Techniques' },
  });
  if (!existingModule) {
    await prisma.trainingModule.create({
      data: {
        title: 'E2E Test: Active Learning Techniques',
        description: 'Learn how to implement active learning in your classroom',
        subject: 'Mathematics',
        gradeRange: '1-10',
        content: {
          sections: [
            { title: 'Introduction', body: 'Active learning engages students directly in the learning process.' },
            { title: 'Techniques', body: 'Group work, discussions, problem-solving activities.' },
          ],
        },
        duration: 30,
        difficulty: Difficulty.EASY,
        language: Language.ENGLISH,
        status: 'PUBLISHED',
        tags: ['active-learning', 'engagement'],
        categoryId: trainingCategory.id,
      },
    });
  }

  // Seed a community post
  const existingPost = await prisma.communityPost.findFirst({
    where: { authorId: teacherId, title: 'E2E Test: Teaching Tips for Math' },
  });
  if (!existingPost) {
    await prisma.communityPost.create({
      data: {
        title: 'E2E Test: Teaching Tips for Math',
        content: 'What are your best strategies for teaching fractions to Class 5 students?',
        type: 'QUESTION',
        subject: 'Mathematics',
        tags: ['math', 'fractions', 'class-5'],
        authorId: teacherId,
        schoolId: school.id,
      },
    });
  }

  // Link parent to student
  if (studentRecord && !studentRecord.parentId) {
    await prisma.student.update({
      where: { id: studentRecord.id },
      data: { parentId: users.parent.id },
    });
  }

  console.log('Test data seeded successfully');

  return {
    school: { id: school.id, slug: school.slug, name: school.name },
    class: { id: testClass.id, name: testClass.name, grade: testClass.grade },
    subjects,
    users: users as TestData['users'],
  };
}

export async function cleanTestData(): Promise<void> {
  console.log('Cleaning test data...');

  const school = await prisma.school.findUnique({
    where: { slug: TEST_SCHOOL_SLUG },
  });

  if (!school) {
    console.log('No test school found, nothing to clean');
    return;
  }

  // Delete in correct order to respect foreign key constraints

  // Delete community data
  const posts = await prisma.communityPost.findMany({ where: { schoolId: school.id }, select: { id: true } });
  const postIds = posts.map(p => p.id);
  if (postIds.length > 0) {
    await prisma.communityVote.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.communityComment.deleteMany({ where: { postId: { in: postIds } } });
    await prisma.communityPost.deleteMany({ where: { schoolId: school.id } });
  }

  // Delete training progress for school teachers
  const schoolUsers = await prisma.user.findMany({ where: { schoolId: school.id }, select: { id: true } });
  const userIds = schoolUsers.map(u => u.id);
  if (userIds.length > 0) {
    await prisma.teacherTrainingProgress.deleteMany({ where: { teacherId: { in: userIds } } });
    await prisma.teacherCertification.deleteMany({ where: { teacherId: { in: userIds } } });
  }

  // Delete training modules and categories seeded by tests
  await prisma.trainingModule.deleteMany({ where: { title: { startsWith: 'E2E Test:' } } });
  await prisma.trainingCategory.deleteMany({ where: { name: { startsWith: 'E2E Test:' } } });

  // Delete homework submissions, then homework
  const homeworks = await prisma.homework.findMany({ where: { class: { schoolId: school.id } }, select: { id: true } });
  const homeworkIds = homeworks.map(h => h.id);
  if (homeworkIds.length > 0) {
    await prisma.homeworkSubmission.deleteMany({ where: { homeworkId: { in: homeworkIds } } });
    await prisma.homework.deleteMany({ where: { id: { in: homeworkIds } } });
  }

  // Delete worksheet responses, then worksheets
  const worksheets = await prisma.worksheet.findMany({ where: { createdBy: { schoolId: school.id } }, select: { id: true } });
  const worksheetIds = worksheets.map(w => w.id);
  if (worksheetIds.length > 0) {
    await prisma.worksheetResponse.deleteMany({ where: { worksheetId: { in: worksheetIds } } });
    await prisma.worksheet.deleteMany({ where: { id: { in: worksheetIds } } });
  }

  // Delete lessons
  await prisma.lesson.deleteMany({ where: { class: { schoolId: school.id } } });

  // Delete student-related elite features
  const students = await prisma.student.findMany({ where: { class: { schoolId: school.id } }, select: { id: true } });
  const studentIds = students.map(s => s.id);
  if (studentIds.length > 0) {
    await prisma.studyAnalytics.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.practiceAttempt.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.personalizedLearningPath.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.studySession.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.chatHistory.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.studentProgress.deleteMany({ where: { studentId: { in: studentIds } } });
  }

  // Delete students first (depends on users and classes)
  await prisma.student.deleteMany({
    where: {
      class: { schoolId: school.id },
    },
  });

  // Delete teacher-class assignments
  await prisma.teacherClass.deleteMany({
    where: {
      class: { schoolId: school.id },
    },
  });

  // Delete classes
  await prisma.class.deleteMany({
    where: { schoolId: school.id },
  });

  // Delete subscription
  await prisma.schoolSubscription.deleteMany({
    where: { schoolId: school.id },
  });

  // Delete feature usage
  await prisma.featureUsage.deleteMany({
    where: { schoolId: school.id },
  });

  // Delete diagrams
  await prisma.diagram.deleteMany({
    where: { schoolId: school.id },
  });

  // Delete users (test users by email pattern)
  await prisma.user.deleteMany({
    where: {
      email: { contains: '@e2e.test' },
    },
  });

  // Delete school
  await prisma.school.delete({
    where: { slug: TEST_SCHOOL_SLUG },
  });

  console.log('Test data cleaned successfully');
}

export async function resetTestUserStatus(email: string, status: UserStatus): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { status },
  });
}

export async function getTestUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      student: true,
      teacherClasses: true,
    },
  });
}

export { prisma };
