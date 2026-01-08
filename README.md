# AI School Platform

AI-powered education platform for Indian schools (Class 1-10), designed to work with facilitator teachers while AI handles subject expertise.

## Features

### For Teachers
- **AI Lesson Planner**: Generate CBSE-aligned lesson plans with teaching scripts, activities, and board notes
- **Worksheet Generator**: Create practice worksheets with varying difficulty levels
- **Student Progress Tracking**: Monitor student performance across subjects

### For Students
- **AI Chatbot**: 24/7 doubt-solving in Hindi and English (Hinglish supported)
- **Practice Worksheets**: Auto-generated practice problems
- **Progress Dashboard**: Track learning achievements

### For Parents
- **Child Progress View**: Monitor child's academic performance
- **Activity Updates**: Stay informed about learning activities

### For Admins
- **School Management**: Manage teachers, students, and classes
- **Analytics Dashboard**: School-wide performance metrics

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (credentials-based)
- **AI**: Claude API (Anthropic)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/ai_school"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ANTHROPIC_API_KEY="your-anthropic-api-key"
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/          # Login, Register pages
│   ├── admin/           # Admin portal
│   ├── api/             # API routes
│   │   ├── ai/          # AI endpoints (lesson, chat, worksheet)
│   │   └── auth/        # Auth endpoints
│   ├── parent/          # Parent portal
│   ├── student/         # Student portal
│   └── teacher/         # Teacher portal
├── components/          # Reusable UI components
│   ├── layout/          # Layout components
│   ├── providers/       # Context providers
│   └── ui/              # Base UI components
├── lib/                 # Utilities
│   ├── ai/              # Claude API helpers
│   ├── db/              # Prisma client
│   └── prompts/         # AI prompt templates
└── types/               # TypeScript types
```

## Language Support

- English
- Hindi (Devanagari script)
- Hinglish (mixed Hindi-English)

## License

Private - All rights reserved
