import { PrismaClient, UserRole, UserStatus, ProductTier } from '@prisma/client';
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
