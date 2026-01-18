# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Server
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint

# Testing
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI mode)
npm run test:coverage  # Run with coverage report
npx vitest run src/lib/ai/__tests__/claude.test.ts  # Run single test file

# Database
docker-compose up -d     # Start local PostgreSQL (port 5433)
docker-compose down      # Stop PostgreSQL
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma migrate dev   # Run database migrations
npx prisma studio        # Open Prisma database GUI
npx prisma db seed       # Seed database with default subjects

# School Management
npx tsx scripts/create-school.ts  # Create a new school with admin user (interactive)
# Or with env vars: SCHOOL_NAME="My School" SCHOOL_SLUG="myschool" ADMIN_EMAIL="admin@example.com" npx tsx scripts/create-school.ts
```

## Architecture Overview

This is a Next.js 16 (App Router) education platform for Indian schools (Class 1-10) with four user roles: Admin, Teacher, Student, and Parent.

### Key Architectural Patterns

**Role-Based Route Structure**: Each role has isolated routes with dedicated layouts:
- `/teacher/*` - Lesson planning, worksheet generation
- `/student/*` - AI chat, worksheets, progress tracking
- `/admin/*` - School management
- `/parent/*` - Child progress monitoring

**Authentication Flow**: NextAuth.js with JWT strategy and credentials provider. The middleware (`src/middleware.ts`) enforces role-based access on `/teacher/*`, `/student/*`, `/admin/*`, `/parent/*`, and `/dashboard/*` routes - users can only access routes matching their role (admins can access all routes). Session types are extended in `src/lib/auth.ts` to include `role` and `schoolId`. Password utilities (`hashPassword`, `verifyPassword`) are also exported from `src/lib/auth.ts`.

**AI Integration**: The platform supports multiple AI providers via a unified interface in `src/lib/ai/provider.ts`. Available providers (auto-detected in priority order):
1. **Vertex AI (Gemma 2)** - Open source, for GCP deployment (`GCP_PROJECT_ID` + `VERTEX_AI_MODEL`)
2. **Together.ai (Qwen)** - Good quality, affordable (`TOGETHER_API_KEY`)
3. **Anthropic Claude** - Highest quality (`ANTHROPIC_API_KEY`)
4. **Ollama** - Local development, no API key needed

Two main functions available from any provider:
- `generateWithAI()` - Single-turn generation (lessons, worksheets)
- `chatWithAI()` - Multi-turn conversations (student chat)

All providers include exponential backoff retry logic (configurable via `AI_MAX_RETRIES`, default 3). Force a specific provider with `AI_PROVIDER` env var.

Prompt templates are in `src/lib/prompts/` and support three languages: English, Hindi (Devanagari), and Mixed (Hinglish). Each prompt file exports:
- `get[Feature]SystemPrompt()` - Returns the system prompt
- `get[Feature]UserPrompt()` - Returns the user message with parameters
- TypeScript interfaces for structured output (e.g., `LessonPlan`)

**Multi-Tenancy**: Schools are isolated by subdomain (e.g., `school1.domain.com`). The slug is extracted in middleware via `src/lib/tenant.ts` and all data is scoped by `schoolId`. Helper functions: `isValidSlug()`, `generateSlugFromName()`, `RESERVED_SLUGS` array for validating school slugs.

**Rate Limiting**: API rate limits are configured in `src/lib/rate-limit.ts`. Key limits: AI endpoints (20 req/min), Auth (10 req/min), Login (5 attempts/15 min), Registration (3/hour).

**Security**: Middleware (`src/middleware.ts`) adds security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).

**Database**: PostgreSQL with Prisma ORM using the `pg` adapter (required for Prisma 7+). The Prisma client is singleton-cached in `src/lib/db/prisma.ts` to prevent connection issues in development. Use `docker-compose up -d` to start a local PostgreSQL instance (port 5433).

### Testing

Test files are co-located with source code in `__tests__/` directories (e.g., `src/lib/ai/__tests__/`). Uses Vitest with React Testing Library. Mock external dependencies in tests.

### API Route Patterns

All API routes are in `src/app/api/`:
- `api/ai/*` - AI generation endpoints (lesson, worksheet, chat)
- `api/auth/*` - Authentication (NextAuth handlers, registration)
- `api/lessons/*`, `api/worksheets/*` - CRUD for content
- `api/homework/*` - Homework assignment and submissions with AI grading
- `api/subjects/*`, `api/classes/*` - Subject and class listing
- `api/health/` - Load balancer health check

All API routes check `getServerSession(authOptions)` for authentication.

### Data Model Relationships

- Schools contain Users and Classes
- Users have roles and can be: Teachers (assigned to classes via TeacherClass), Students (belong to one class, optionally linked to parent), Parents, or Admins
- Lessons and Worksheets are created by teachers for specific classes and subjects
- Homework is assigned by teachers; HomeworkSubmission stores student responses with AI grading (`src/lib/prompts/grading.ts`) and optional teacher review
- ChatHistory tracks student AI conversations by subject
- StudentProgress stores per-subject metrics for each student

Key enums from Prisma: `UserRole`, `Language` (ENGLISH/HINDI/MIXED), `Difficulty` (EASY/MEDIUM/HARD), `HomeworkStatus` (PENDING/SUBMITTED/GRADED/LATE)

### UI Components

Custom components in `src/components/ui/` use Tailwind CSS with variant/size props pattern:
- `Button` - variants: primary, secondary, outline, ghost, danger; sizes: sm, md, lg
- `Card`, `Input`, `Select` - similar pattern

All client components are marked with `'use client'` directive.

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

See `GCP_DEPLOYMENT.md` for detailed instructions.

### Terraform (Infrastructure as Code)

```bash
cd infrastructure/terraform/gcp
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection (same as DATABASE_URL for local dev)
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - App URL (http://localhost:3000 for dev)

AI Provider (at least one required):
- `GCP_PROJECT_ID` + `VERTEX_AI_MODEL` - For Vertex AI/Gemma 2 (GCP)
- `TOGETHER_API_KEY` - For Together.ai/Qwen
- `ANTHROPIC_API_KEY` - For Claude
- None needed for Ollama (local development)

Optional:
- `AI_PROVIDER` - Force specific provider: `vertex`, `qwen`, `claude`, `ollama`
- `AI_TIMEOUT` - Request timeout in ms (default: 60000)
- `AI_MAX_RETRIES` - Max retry attempts (default: 3)
- `GCP_LOCATION` - GCP region (default: `asia-south1`)
- `OLLAMA_BASE_URL` - Ollama URL for local AI (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - Ollama model name (default: `qwen3:8b`)
