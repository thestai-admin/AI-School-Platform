# AI Pathshala (AI School Platform)

**By THEST AI Private Limited**

AI-powered education platform for Indian schools (Class 1-10), designed to work with facilitator teachers while AI handles subject expertise.

**Live:** [thestai.com](https://thestai.com)

---

## Features

### For Teachers
- **AI Lesson Planner**: Generate CBSE/NCERT-aligned lesson plans with teaching scripts, activities, and board notes
- **Worksheet Generator**: Create practice worksheets with varying difficulty levels
- **Homework Management**: Assign homework with AI-powered auto-grading
- **Student Progress Tracking**: Monitor student performance across subjects

### For Students
- **AI Chatbot**: 24/7 doubt-solving assistant
- **Practice Worksheets**: Auto-generated practice problems
- **Homework Submission**: Submit and receive instant AI feedback
- **Progress Dashboard**: Track learning achievements

### For Parents
- **Child Progress View**: Monitor child's academic performance
- **Homework Tracking**: View assignments and submissions
- **Activity Updates**: Stay informed about learning activities

### For Admins
- **School Management**: Manage teachers, students, and classes
- **Analytics Dashboard**: School-wide performance metrics

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (JWT-based)
- **AI**: Google AI (Gemini) - primary provider
- **Deployment**: Google Cloud Platform (Cloud Run)

---

## Quick Start

### Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/thestai-admin/AI-School-Platform.git
   cd AI-School-Platform
   npm install
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Setup database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Create a school**
   ```bash
   npx tsx scripts/create-school.ts
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

---

## AI Provider Options

The platform supports multiple cloud AI providers (auto-detected in priority order):

| Provider | Setup | Best For |
|----------|-------|----------|
| **Google AI (Gemini)** | Set `GOOGLE_AI_API_KEY` | Production (recommended) |
| **Vertex AI (Gemma 2)** | Set `GCP_PROJECT_ID` | GCP-native deployment |
| **Together.ai (Qwen)** | Set `TOGETHER_API_KEY` | Affordable cloud AI |
| **Anthropic Claude** | Set `ANTHROPIC_API_KEY` | Highest quality |

```env
# Recommended: Google AI (get key from https://aistudio.google.com/apikey)
GOOGLE_AI_API_KEY=your-api-key

# Or force a specific provider
AI_PROVIDER=google-ai
```

---

## Deployment

### Deploy to Google Cloud Platform

See [**LIVE_DEPLOYMENT_GUIDE.md**](./LIVE_DEPLOYMENT_GUIDE.md) for complete instructions.

**Quick deploy:**
```bash
# 1. Setup GCP
./scripts/deploy-gcp.sh setup

# 2. Create database
./scripts/deploy-gcp.sh create-db

# 3. Create secrets
./scripts/deploy-gcp.sh create-secrets

# 4. Deploy
./scripts/deploy-gcp.sh deploy

# 5. Configure domain
./scripts/deploy-gcp.sh domain thestai.com
```

**Estimated Cost:** ~$30/month (free with GCP credits)

---

## Project Structure

```
ai-school-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Login, Register pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── teacher/           # Teacher portal
│   │   ├── student/           # Student portal
│   │   ├── parent/            # Parent portal
│   │   └── api/               # API routes
│   │       ├── ai/            # AI endpoints (chat, lesson, worksheet)
│   │       ├── homework/      # Homework management
│   │       └── auth/          # Authentication
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   └── layout/            # Layout components
│   ├── lib/
│   │   ├── ai/                # AI providers (google-ai, vertex, claude, qwen)
│   │   ├── db/                # Prisma client
│   │   └── prompts/           # AI prompt templates
│   └── hooks/                 # React hooks
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
└── scripts/
    ├── create-school.ts       # School setup script
    └── deploy-gcp.sh          # GCP deployment script
```

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full school management, analytics |
| **Teacher** | Lessons, worksheets, homework, student progress |
| **Student** | AI chat, worksheets, homework submission |
| **Parent** | Child's progress and homework |

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run linter

# Database (Cloud SQL)
npx prisma studio        # Database GUI
npx prisma migrate deploy # Run migrations
npx prisma db seed       # Seed data

# Deployment
./scripts/deploy-gcp.sh deploy   # Deploy to GCP
```

---

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret (32+ chars)
- `NEXTAUTH_URL` - App URL

**AI (at least one required):**
- `GOOGLE_AI_API_KEY` - For Google AI/Gemini (recommended)
- `GCP_PROJECT_ID` + `VERTEX_AI_MODEL` - For Vertex AI
- `TOGETHER_API_KEY` - For Together.ai
- `ANTHROPIC_API_KEY` - For Claude

See [.env.example](./.env.example) for full list.

---

## Test Accounts (Production)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@thestai.com | AIPathshala2026! |
| Teacher | testteacher@thestai.com | TestTeacher2026! |
| Student | teststudent@thestai.com | TestStudent2026! |

---

## Support

- **Documentation**: [LIVE_DEPLOYMENT_GUIDE.md](./LIVE_DEPLOYMENT_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/thestai-admin/AI-School-Platform/issues)
- **Email**: support@thestai.com

---

## License

Copyright 2024 THEST AI Private Limited. All rights reserved.

---

**Made in India for Indian Schools**
