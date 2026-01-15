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
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (JWT-based)
- **AI**: Qwen3 via Together.ai / Claude API / Ollama
- **Testing**: Vitest + React Testing Library
- **Deployment**: Railway (recommended) / AWS / VPS

---

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for full guide.

**Requirements:**
1. Railway account (free tier available)
2. Together.ai API key (free $5 credit): [https://api.together.xyz/](https://api.together.xyz/)
3. Your domain (optional)

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)
- Git

### Option A: Using Claude API (Recommended for production parity)

1. **Clone the repository**
   ```bash
   git clone https://github.com/thestai-admin/AI-School-Platform.git
   cd AI-School-Platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start PostgreSQL with Docker**
   ```bash
   docker-compose up -d
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Anthropic API key:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ai_school?schema=public"
   DIRECT_URL="postgresql://postgres:postgres@localhost:5433/ai_school?schema=public"
   NEXTAUTH_SECRET="your-secret-key-min-32-chars"
   NEXTAUTH_URL="http://localhost:3000"
   ANTHROPIC_API_KEY="sk-ant-your-key-here"
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Seed the database**
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ai_school?schema=public" npx tsx prisma/seed.ts
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Option B: Using Ollama (Free, Local AI)

If you don't have an Anthropic API key, you can use Ollama for local AI:

1. **Install Ollama**
   - Download from [https://ollama.com/download](https://ollama.com/download)
   - Install and start Ollama

2. **Pull a model**
   ```bash
   ollama pull qwen3:8b
   ```

3. **Update the AI import in API routes**

   Change imports in these files from `@/lib/ai/claude` to `@/lib/ai/ollama`:
   - `src/app/api/ai/chat/route.ts`
   - `src/app/api/ai/lesson/route.ts`
   - `src/app/api/ai/worksheet/route.ts`

4. **Update `.env`**
   ```env
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_MODEL="qwen3:8b"
   ```

5. **Follow steps 1-7 from Option A** (skip the ANTHROPIC_API_KEY)

---

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start

# Database commands
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Create and run migrations
npx prisma migrate deploy  # Deploy migrations (production)
npx prisma generate        # Regenerate Prisma client
npx prisma db push         # Push schema changes (dev only)
```

---

## Project Structure

```
ai-school-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── admin/             # Admin portal
│   │   ├── api/               # API routes
│   │   │   ├── ai/            # AI endpoints (lesson, chat, worksheet)
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   └── health/        # Health check for load balancer
│   │   ├── parent/            # Parent portal
│   │   ├── student/           # Student portal
│   │   └── teacher/           # Teacher portal
│   ├── components/            # React components
│   │   ├── layout/            # Layout components
│   │   ├── providers/         # Context providers
│   │   └── ui/                # Base UI components
│   ├── lib/                   # Utilities
│   │   ├── ai/                # AI integrations (Claude, Ollama)
│   │   ├── db/                # Prisma client
│   │   └── prompts/           # AI prompt templates
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data
├── infrastructure/
│   └── terraform/             # AWS infrastructure as code
├── public/                    # Static assets
├── Dockerfile                 # Production container
├── docker-compose.yml         # Local PostgreSQL
└── buildspec.yml              # AWS CodeBuild config
```

---

## Multi-Tenancy (Schools)

The platform supports multiple schools with subdomain isolation:

- `school1.yourdomain.com` → School 1
- `school2.yourdomain.com` → School 2

Each school has:
- Unique `slug` for subdomain identification
- Isolated data (users, classes, lessons, etc.)
- Role-based access (Admin, Teacher, Student, Parent)

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access to all features and school management |
| **Teacher** | Create lessons, worksheets, view student progress |
| **Student** | AI chat, practice worksheets, view own progress |
| **Parent** | View child's progress and activities |

---

## Language Support

- **English** - Full support
- **Hindi** - Devanagari script
- **Hinglish** - Mixed Hindi-English (common in Indian classrooms)

---

## Testing

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage report
npm run test:coverage
```

Test files are located in `__tests__` directories:
- `src/components/ui/__tests__/` - UI component tests
- `src/lib/ai/__tests__/` - AI integration tests

---

## Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose down && docker-compose up -d

# Check logs
docker logs ai_school_db
```

### Prisma issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

---

## AWS Deployment

For production deployment to AWS, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create a Pull Request

---

## License

Private - All rights reserved
