# AI Pathshala (AI पाठशाला)

**By THEST AI Private Limited**

AI-powered education platform for Indian schools (Class 1-10), designed to work with facilitator teachers while AI handles subject expertise. Supports Hindi, English, and 22 Indian languages via BHASHINI.

🌐 **Live:** [www.thestai.com](https://www.thestai.com)

---

## Features

### For Teachers
- **AI Lesson Planner**: Generate CBSE/NCERT-aligned lesson plans with teaching scripts, activities, and board notes
- **Worksheet Generator**: Create practice worksheets with varying difficulty levels
- **Live Classroom**: Real-time translation and transcription for multilingual classrooms
- **Student Progress Tracking**: Monitor student performance across subjects

### For Students
- **AI Chatbot**: 24/7 doubt-solving in Hindi, English, and Hinglish
- **Practice Worksheets**: Auto-generated practice problems
- **Live Classroom**: Join sessions with real-time language translation
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
- **AI**: Vertex AI (Gemma 2) / Qwen / Claude / Ollama
- **Indian Languages**: BHASHINI API (ASR, NMT, TTS)
- **Testing**: Vitest + React Testing Library
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

The platform supports multiple AI providers (auto-detected):

| Provider | Setup | Best For |
|----------|-------|----------|
| **Vertex AI (Gemma 2)** | Set `GCP_PROJECT_ID` | Production on GCP |
| **Together.ai (Qwen)** | Set `TOGETHER_API_KEY` | Affordable cloud AI |
| **Anthropic Claude** | Set `ANTHROPIC_API_KEY` | Highest quality |
| **Ollama** | Install locally | Free local development |

```env
# Example: Use Vertex AI
GCP_PROJECT_ID=your-project
GCP_LOCATION=asia-south1
VERTEX_AI_MODEL=gemma-2-27b-it

# Or force a specific provider
AI_PROVIDER=vertex
```

---

## Deployment

### Deploy to Google Cloud Platform

See [**LIVE_DEPLOYMENT_GUIDE.md**](./LIVE_DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

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
./scripts/deploy-gcp.sh domain www.thestai.com
```

**Estimated Cost:** ~$40/month (free with GCP credits for 57+ months)

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
│   │       ├── ai/            # AI endpoints
│   │       ├── bhashini/      # Indian language APIs
│   │       └── classroom/     # Live classroom
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   ├── bhashini/          # Language components
│   │   └── layout/            # Layout components
│   ├── lib/
│   │   ├── ai/                # AI providers (vertex, claude, qwen, ollama)
│   │   ├── bhashini/          # BHASHINI integration
│   │   ├── db/                # Prisma client
│   │   └── prompts/           # AI prompt templates
│   └── hooks/                 # React hooks
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── scripts/
│   ├── create-school.ts       # School setup script
│   └── deploy-gcp.sh          # GCP deployment script
├── infrastructure/
│   └── terraform/gcp/         # GCP infrastructure as code
└── docker-compose.yml         # Local PostgreSQL
```

---

## Language Support

### Interface Languages
- **English** - Full support
- **Hindi** - Devanagari script (हिंदी)
- **Hinglish** - Mixed Hindi-English

### BHASHINI Integration (22 Indian Languages)
- Automatic Speech Recognition (ASR)
- Neural Machine Translation (NMT)
- Text-to-Speech (TTS)

Supported: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese, and more.

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full school management, analytics |
| **Teacher** | Lessons, worksheets, classroom, student progress |
| **Student** | AI chat, worksheets, live classroom |
| **Parent** | Child's progress and homework |

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run linter

# Testing
npm test                 # Watch mode
npm run test:run         # Single run
npm run test:coverage    # With coverage

# Database
docker-compose up -d     # Start PostgreSQL
npx prisma studio        # Database GUI
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed data

# Deployment
./scripts/deploy-gcp.sh deploy   # Deploy to GCP
./scripts/deploy-gcp.sh logs     # View logs
```

---

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret (32+ chars)
- `NEXTAUTH_URL` - App URL

AI (at least one):
- `GCP_PROJECT_ID` + `VERTEX_AI_MODEL` - For Vertex AI
- `TOGETHER_API_KEY` - For Together.ai
- `ANTHROPIC_API_KEY` - For Claude
- (none) - For Ollama

BHASHINI (optional):
- `BHASHINI_USER_ID` - ULCA user ID
- `BHASHINI_API_KEY` - ULCA API key

See [.env.example](./.env.example) for full list.

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and test: `npm test`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

---

## Support

- **Documentation**: [LIVE_DEPLOYMENT_GUIDE.md](./LIVE_DEPLOYMENT_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/thestai-admin/AI-School-Platform/issues)
- **Email**: support@thestai.com

---

## License

Copyright © 2024 THEST AI Private Limited. All rights reserved.

---

**Made with ❤️ in India for Indian Schools**
