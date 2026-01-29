# AI School Platform - E2E Test Suite

## Overview

Comprehensive end-to-end test suite for the AI School Platform covering 67+ test cases across 11 categories.

## Test Categories

| Category | Test File | Tests | Status |
|----------|-----------|-------|--------|
| Registration Flow | `api/auth/register.test.ts` | TC-REG-001 to TC-REG-010 | ✅ |
| Email Verification | `api/auth/verify-email.test.ts` | TC-VER-001 to TC-VER-006 | ✅ |
| Teacher Approval | `api/admin/teacher-approval.test.ts` | TC-APR-001 to TC-APR-006 | ✅ |
| Login Flow | `api/auth/login.test.ts` | TC-LOGIN-001 to TC-LOGIN-008 | ✅ |
| RBAC | `middleware/rbac.test.ts` | TC-RBAC-001 to TC-RBAC-011 | ✅ |
| Rate Limiting | `lib/rate-limit.test.ts` | TC-RATE-001 to TC-RATE-004 | ✅ |
| Teacher Features | `api/ai/teacher-features.test.ts` | TC-TEACH-001 to TC-TEACH-006 | ✅ |
| Student Features | `api/ai/student-features.test.ts` | TC-STU-001 to TC-STU-006 | ✅ |
| Admin Features | `api/admin/admin-features.test.ts` | TC-ADMIN-001 to TC-ADMIN-004 | ✅ |
| Password Reset | `api/auth/password-reset.test.ts` | TC-PWD-001 to TC-PWD-004 | ✅ |
| E2E User Journeys | `e2e/user-journeys.test.ts` | E2E-001 to E2E-004 | ✅ |

## Running Tests

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm test

# Run specific test file
npm run test:run -- src/__tests__/lib/rate-limit.test.ts

# Run with coverage
npm run test:coverage

# Run with verbose output
npm run test:run -- --reporter=verbose
```

## Test Structure

```
src/__tests__/
├── api/
│   ├── admin/
│   │   ├── admin-features.test.ts    # Admin analytics, teachers, students, classes
│   │   └── teacher-approval.test.ts  # Teacher approval workflow
│   ├── ai/
│   │   ├── student-features.test.ts  # AI chat, homework submission
│   │   └── teacher-features.test.ts  # Lesson/worksheet generation
│   └── auth/
│       ├── login.test.ts             # Login flow, status blocking
│       ├── password-reset.test.ts    # Password reset flow
│       ├── register.test.ts          # Registration validation
│       └── verify-email.test.ts      # Email verification
├── e2e/
│   └── user-journeys.test.ts         # Complete user flow tests
├── lib/
│   └── rate-limit.test.ts            # Rate limiting tests
├── middleware/
│   └── rbac.test.ts                  # Role-based access control
└── utils/
    ├── index.ts                      # Exports
    ├── mocks.ts                      # Mock implementations
    └── test-utils.ts                 # Test utilities and fixtures
```

## Test Utilities

### Test Fixtures (`utils/test-utils.ts`)

- `TEST_SCHOOL` - Mock school fixture
- `TEST_USERS` - Mock user fixtures for all roles and statuses
- `createMockSession()` - Create mock NextAuth session
- `createMockRequest()` - Create mock HTTP request
- `VALID_PASSWORDS` / `INVALID_PASSWORDS` - Password test data
- `XSS_PAYLOADS` - XSS test payloads

### Mocks (`utils/mocks.ts`)

- `InMemoryDatabase` - In-memory test database
- `testDb` - Global test database instance
- `emailServiceMock` - Email service mock
- `rateLimitMocks` - Rate limit mocks with state
- `aiProviderMock` - AI provider mock
- `createSessionMock()` - Create mock session

## Key Test Scenarios

### Registration Flow
- Student/Teacher/Parent registration with PENDING_VERIFICATION status
- Admin registration blocked
- Email and password validation
- XSS sanitization in name field
- Duplicate email rejection

### Email Verification
- Student → ACTIVE (auto-approved)
- Teacher → PENDING_APPROVAL (requires admin)
- Parent → ACTIVE (auto-approved)
- Invalid/expired token handling

### Teacher Approval Workflow
- List pending teachers
- Approve/reject teacher
- Cross-school approval prevention
- Non-admin access blocking

### Login Flow
- ACTIVE user login success
- Status-based blocking (PENDING_VERIFICATION, PENDING_APPROVAL, SUSPENDED, REJECTED)
- Wrong credentials handling
- Google OAuth flow

### RBAC (Role-Based Access Control)
- Student access to /student/* only
- Teacher access to /teacher/* only
- Admin access to all routes
- Parent access to /parent/* only
- Status-based redirects

### Rate Limiting
- Registration: 3/hour
- Login: 5/15min
- Auth endpoints: 10/min
- AI chat: 20/min
- Tier-based limits

### E2E User Journeys
- Complete student onboarding flow
- Teacher onboarding with admin approval
- Homework lifecycle
- Password reset flow

## Environment Setup

The tests use Vitest with jsdom environment. Mock implementations replace:
- Prisma database operations
- Email service
- AI providers
- Rate limiting
- NextAuth sessions

## Notes

- Test environment setup takes ~3 minutes per file due to jsdom environment initialization
- Use `--reporter=dot` for faster feedback on large test runs
- Mock implementations are isolated between test suites
