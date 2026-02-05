# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Server
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint

# Unit Testing (Vitest)
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI mode)
npm run test:coverage  # Run with coverage report
npx vitest run src/lib/ai/__tests__/claude.test.ts  # Run single test file

# E2E Testing (Playwright) - Runs against deployed cloud environment
PLAYWRIGHT_BASE_URL=https://test.thestai.com npm run e2e  # Run all E2E tests
npm run e2e:headed        # Run with browser visible
npm run e2e:chromium      # Run Chromium only
npm run e2e:report        # View HTML report

# Type Checking
npx tsc --noEmit          # Type check without emitting

# Database (Cloud SQL)
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma migrate deploy  # Run migrations on cloud database
npx prisma db seed       # Seed database with default subjects

# School Management
npx tsx scripts/create-school.ts  # Create a new school with admin user (interactive)
# Or with env vars: SCHOOL_NAME="My School" SCHOOL_SLUG="myschool" ADMIN_EMAIL="admin@example.com" npx tsx scripts/create-school.ts

# GCP Setup
./scripts/setup-github-gcp-auth.sh  # Setup GitHub Actions auth with GCP
```

## Architecture Overview

This is a Next.js 16 (App Router) education platform for Indian schools (Class 1-10) with four user roles: Admin, Teacher, Student, and Parent.

### Key Architectural Patterns

**Role-Based Route Structure**: Each role has isolated routes with dedicated layouts:
- `/teacher/*` - Lesson planning, worksheet generation, diagrams, homework, training
- `/student/*` - AI chat, worksheets, progress tracking, diagrams, study companion
- `/admin/*` - School management, analytics, diagrams
- `/parent/*` - Child progress monitoring, homework tracking, diagrams

**Authentication Flow**: NextAuth.js with JWT strategy supporting both credentials and Google OAuth. The middleware (`src/middleware.ts`) enforces role-based access and user status checks. Session types are extended in `src/lib/auth.ts` to include `role`, `status`, and `schoolId`. Password utilities (`hashPassword`, `verifyPassword`, `generateToken`) are also exported from `src/lib/auth.ts`.

**User Status Workflow**: Users progress through statuses defined in `UserStatus` enum:
- `PENDING_VERIFICATION` - Email not verified (redirects to `/verify-email-required`)
- `PENDING_APPROVAL` - Email verified, awaiting admin approval for teachers (redirects to `/pending-approval`)
- `ACTIVE` - Fully active user
- `SUSPENDED` - Temporarily disabled (redirects to `/account-suspended`)
- `REJECTED` - Admin rejected registration (redirects to `/account-rejected`)

**AI Integration**: The platform supports multiple AI providers via a unified interface in `src/lib/ai/provider.ts`. Available providers (auto-detected in priority order):
1. **Google AI (Gemini)** - Recommended for production (`GOOGLE_AI_API_KEY`) - uses gemini-1.5-flash by default
2. **Vertex AI (Gemma 2)** - Open source, for GCP deployment (`GCP_PROJECT_ID` + `VERTEX_AI_MODEL`)
3. **Together.ai (Qwen)** - Good quality, affordable (`TOGETHER_API_KEY`)
4. **Anthropic Claude** - Highest quality (`ANTHROPIC_API_KEY`)

Two main functions available from any provider:
- `generateWithAI()` - Single-turn generation (lessons, worksheets)
- `chatWithAI()` - Multi-turn conversations (student chat)

All providers include exponential backoff retry logic (configurable via `AI_MAX_RETRIES`, default 3). Force a specific provider with `AI_PROVIDER` env var.

Prompt templates are in `src/lib/prompts/` and support three languages: English, Hindi (Devanagari), and Mixed (Hinglish). Each prompt file exports:
- `get[Feature]SystemPrompt()` - Returns the system prompt
- `get[Feature]UserPrompt()` - Returns the user message with parameters
- TypeScript interfaces for structured output (e.g., `LessonPlan`)

**Multi-Tenancy**: Schools are isolated by subdomain (e.g., `school1.domain.com`). The slug is extracted in middleware via `src/lib/tenant.ts` and all data is scoped by `schoolId`. Helper functions: `isValidSlug()`, `generateSlugFromName()`, `RESERVED_SLUGS` array for validating school slugs.

**Product Tiers & Feature Gating**: Schools have subscription tiers (`STARTER`, `AFFORDABLE`, `ELITE`, `ENTERPRISE`) defined in `src/lib/features/feature-gate.ts`. Features are gated by tier with inheritance (higher tiers include all lower-tier features). Key functions:
- `checkFeatureAccess(schoolId, feature)` - Check if school can access a feature
- `withFeatureGate(feature)` - HOF to wrap API routes with feature checks
- `requireFeature(schoolId, feature)` - Helper for manual feature checks in routes
- `trackFeatureUsage(schoolId, feature)` - Track usage for analytics

Feature-gated routes are defined in `FEATURE_GATED_ROUTES` in middleware.

**Rate Limiting**: Tier-based rate limits in `src/lib/rate-limit.ts`. Default limits: AI endpoints (20 req/min for AFFORDABLE, 50 for ELITE), Auth (10 req/min), Login (5 attempts/15 min). Use `tierRateLimiters` for tier-aware limiting.

**Security**: Middleware (`src/middleware.ts`) adds security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy).

**Database**: PostgreSQL with Prisma ORM using the `pg` adapter (required for Prisma 7+). The Prisma client is singleton-cached in `src/lib/db/prisma.ts` to prevent connection issues. Uses Cloud SQL for all environments with connection via Unix socket in Cloud Run.

**Docker**: Multi-stage Dockerfile uses standalone Next.js build for minimal production image (~150MB). The build requires placeholder DATABASE_URL at build time for Prisma client generation. Uses Cloud SQL Proxy for database connections in Cloud Run.

**Build Configuration**: Uses Next.js standalone output mode (`output: 'standalone'` in next.config.js) for optimized Docker deployments with minimal dependencies.

### Testing

**Unit Tests (Vitest):** Test files are co-located with source code in `__tests__/` directories (e.g., `src/lib/ai/__tests__/`). Uses Vitest with React Testing Library and jsdom environment.

**E2E Tests (Playwright):** Located in `e2e/tests/`. Tests run against deployed cloud environment specified by `PLAYWRIGHT_BASE_URL` environment variable. Global setup/teardown in `e2e/global-setup.ts` seeds test data and authenticates test users. Configure test credentials in `.env.test`.

**Test Utilities:** `src/__tests__/utils/` contains:
- `test-utils.ts` - Fixtures (`TEST_SCHOOL`, `TEST_USERS`), mock creators (`createMockSession`, `createMockRequest`)
- `mocks.ts` - `InMemoryDatabase`, `testDb`, `emailServiceMock`, `aiProviderMock`, `rateLimitMocks`

### API Route Patterns

All API routes are in `src/app/api/`:
- `api/ai/*` - AI generation endpoints (lesson, worksheet, chat)
- `api/auth/*` - Authentication (NextAuth handlers, registration)
- `api/lessons/*`, `api/worksheets/*` - CRUD for content
- `api/homework/*` - Homework assignment and submissions with AI grading
- `api/diagrams/*` - Visual diagram CRUD (React Flow)
- `api/training/*` - Teacher training modules and certifications
- `api/community/*` - Teacher community posts and comments
- `api/study/*` - Elite student study companion and learning paths
- `api/admin/*` - Admin endpoints (students, classes, analytics)
- `api/student/progress/*` - Student progress tracking
- `api/subjects/*`, `api/classes/*` - Subject and class listing
- `api/health/` - Load balancer health check

All API routes check `getServerSession(authOptions)` for authentication.

### Data Model Relationships

**Core Models:**
- Schools contain Users, Classes, Diagrams, and have a SchoolSubscription (tier-based)
- Users have roles (`UserRole`) and status (`UserStatus`), can be: Teachers, Students, Parents, or Admins
- Teachers are assigned to classes+subjects via TeacherClass junction table
- Students belong to one Class and optionally link to a Parent user

**Content Models:**
- Lessons and Worksheets are created by teachers for specific classes and subjects
- Homework is assigned by teachers; HomeworkSubmission stores student responses with AI grading (`src/lib/prompts/grading.ts`)
- Diagrams (React Flow) can be PRIVATE, CLASS, or SCHOOL visibility; types: FLOWCHART, DECISION_TREE, CONCEPT_MAP, LESSON_FLOW

**Student Learning (Elite Tier):**
- StudySession tracks AI tutoring sessions with type (DOUBT_SOLVING, CONCEPT_LEARNING, PRACTICE, REVISION, COMPETITIVE_PREP)
- PersonalizedLearningPath stores adaptive learning journeys with milestones
- PracticeQuestion/PracticeAttempt for competitive exam prep (JEE, NEET, Olympiad, etc.)
- StudyAnalytics tracks daily study metrics and streaks

**Teacher Training:**
- TrainingCategory → TrainingModule → TeacherTrainingProgress
- TeacherCertification (BRONZE, SILVER, GOLD, PLATINUM levels)
- TeachingTip for AI-generated subject-specific advice
- TeacherPerformanceSnapshot for periodic metrics

**Community:**
- CommunityPost (types: QUESTION, DISCUSSION, RESOURCE, TIP, ANNOUNCEMENT)
- CommunityComment with nested replies
- CommunityVote for upvoting

**BHASHINI Integration (Multi-language):**
- ClassroomSession for live multi-language classes
- SessionTranscript with TranscriptTranslation
- PeerChat/PeerMessage for cross-language student chat
- LanguageProgress for language learning gamification
- Supports 12 Indian languages via `BhashiniLanguage` enum

Key enums: `UserRole`, `UserStatus`, `Language`, `Difficulty`, `HomeworkStatus`, `DiagramType`, `DiagramVisibility`, `ProductTier`, `ExamType`

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy-gcp.yml`) runs on push to main:
1. **Test** - Runs tests with PostgreSQL service container
2. **Build** - Builds Docker image and pushes to Artifact Registry
3. **Deploy** - Deploys to Cloud Run with auto-migration
4. **Notify** - Sends email notifications on success/failure

The workflow uses Workload Identity Federation for secure GCP authentication and deploys with:
- Min instances: 1, Max instances: 3
- Memory: 512Mi, CPU: 1
- Auto-connects to Cloud SQL via Unix socket

### UI Components

Custom components in `src/components/ui/` use Tailwind CSS with variant/size props pattern:
- `Button` - variants: primary, secondary, outline, ghost, danger; sizes: sm, md, lg
- `Card`, `Input`, `Select` - similar pattern

All client components are marked with `'use client'` directive.

### Visual Diagrams (React Flow)

Diagram components in `src/components/diagrams/`:
- `DiagramEditor.tsx` - Full editing interface with toolbar and sidebar
- `DiagramCanvas.tsx` - React Flow canvas wrapper
- `DiagramViewer.tsx` - Read-only diagram display
- `DiagramToolbar.tsx` - Add nodes, undo/redo, export
- `DiagramSidebar.tsx` - Node properties panel
- Custom nodes in `nodes/`: ProcessNode, DecisionNode, ConceptNode, StartEndNode

### State Management

Zustand stores in `src/stores/`:
- `diagramStore.ts` - React Flow diagram state (nodes, edges, viewport, selection, history for undo/redo)

Stores use the pattern: state + actions + getters in a single `create<State>()` call.

### Custom Hooks

Located in `src/hooks/`:
- `useOfflineStatus` - Detects network connectivity changes

### Shared Types

Common types in `src/types/`:
- Re-exports Prisma enums: `UserRole`, `Language`, `Difficulty`, `DiagramType`, `DiagramVisibility`
- API response wrappers: `ApiResponse<T>`, `PaginatedResponse<T>`
- Form data interfaces: `LessonFormData`, `WorksheetFormData`
- Diagram types for React Flow integration

### Path Aliases

Use `@/*` to import from `src/*` (configured in tsconfig.json).

## Deployment

### GCP (Recommended for Production)

```bash
# Quick start with deployment script
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh setup      # Enable APIs
./scripts/deploy-gcp.sh create-db  # Create Cloud SQL
./scripts/deploy-gcp.sh create-secrets  # Store secrets
./scripts/deploy-gcp.sh deploy     # Deploy to Cloud Run
./scripts/deploy-gcp.sh domain thestai.com  # Configure domain
```

### Terraform (Infrastructure as Code)

```bash
cd infrastructure/terraform/gcp
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Cloud SQL PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (same as DATABASE_URL)
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - App URL (e.g., https://thestai.com)

AI Provider (at least one required):
- `GOOGLE_AI_API_KEY` - For Google AI/Gemini (recommended, get key from https://aistudio.google.com/apikey)
- `GCP_PROJECT_ID` + `VERTEX_AI_MODEL` - For Vertex AI/Gemma 2 (GCP)
- `TOGETHER_API_KEY` - For Together.ai/Qwen
- `ANTHROPIC_API_KEY` - For Claude

Optional:
- `AI_PROVIDER` - Force specific provider: `google-ai`, `vertex`, `qwen`, `claude`
- `GOOGLE_AI_MODEL` - Google AI model (default: `gemini-1.5-flash`)
- `AI_TIMEOUT` - Request timeout in ms (default: 60000)
- `AI_MAX_RETRIES` - Max retry attempts (default: 3)
- `GCP_LOCATION` - GCP region (default: `asia-south1`)

Google OAuth (optional):
- `GOOGLE_CLIENT_ID` - For Google Sign-In
- `GOOGLE_CLIENT_SECRET` - For Google Sign-In

E2E Testing:
- `PLAYWRIGHT_BASE_URL` - Deployed environment URL for E2E tests (e.g., https://test.thestai.com)

## Workflow Orchestration Guidelines

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user, update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for the relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff your behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes, pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it — don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### Task Management
- **Plan First**: Write plan to tasks/todo.md with checkable items
- **Verify Plan**: Check in before starting implementation
- **Track Progress**: Mark items complete as you go
- **Explain Changes**: High-level summary at each step
- **Document Results**: Add review section to tasks/todo.md
- **Capture Lessons**: Update tasks/lessons.md after corrections

### Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
