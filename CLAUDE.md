# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev  # Run database migrations
npx prisma studio    # Open Prisma database GUI
npx tsx prisma/seed.ts  # Seed database with default subjects
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

**AI Integration**: All AI features use Claude (`claude-sonnet-4-20250514`) via `src/lib/ai/claude.ts`. Two main functions:
- `generateWithClaude()` - Single-turn generation (lessons, worksheets)
- `chatWithClaude()` - Multi-turn conversations (student chat)

Prompt templates are in `src/lib/prompts/` and support three languages: English, Hindi (Devanagari), and Mixed (Hinglish). Each prompt file exports:
- `get[Feature]SystemPrompt()` - Returns the system prompt
- `get[Feature]UserPrompt()` - Returns the user message with parameters
- TypeScript interfaces for structured output (e.g., `LessonPlan`)

**Database**: PostgreSQL with Prisma ORM using the `pg` adapter (required for Prisma 7+). The Prisma client is singleton-cached in `src/lib/db/prisma.ts` to prevent connection issues in development. Use `docker-compose up -d` to start a local PostgreSQL instance.

### API Route Patterns

All API routes are in `src/app/api/`:
- `api/ai/*` - AI generation endpoints (lesson, worksheet, chat)
- `api/auth/*` - Authentication (NextAuth handlers, registration)
- `api/lessons/*`, `api/worksheets/*` - CRUD for content
- `api/subjects/*` - Subject listing

All API routes check `getServerSession(authOptions)` for authentication.

### Data Model Relationships

- Schools contain Users and Classes
- Users have roles and can be: Teachers (assigned to classes via TeacherClass), Students (belong to one class, optionally linked to parent), Parents, or Admins
- Lessons and Worksheets are created by teachers for specific classes and subjects
- ChatHistory tracks student AI conversations by subject
- StudentProgress stores per-subject metrics for each student

Key enums from Prisma: `UserRole`, `Language` (ENGLISH/HINDI/MIXED), `Difficulty` (EASY/MEDIUM/HARD)

### UI Components

Custom components in `src/components/ui/` use Tailwind CSS with variant/size props pattern:
- `Button` - variants: primary, secondary, outline, ghost, danger; sizes: sm, md, lg
- `Card`, `Input`, `Select` - similar pattern

All client components are marked with `'use client'` directive.

### Path Aliases

Use `@/*` to import from `src/*` (configured in tsconfig.json).

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret
- `NEXTAUTH_URL` - App URL (http://localhost:3000 for dev)
- `ANTHROPIC_API_KEY` - Claude API key
