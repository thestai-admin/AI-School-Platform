# AI Pathshala - Deployment Guide

**Product:** AI Pathshala (AI School Platform)
**Company:** THEST AI Private Limited
**Domain:** thestai.com

---

## Prerequisites

- Google Cloud account with billing enabled ($300 free credits available)
- Access to domain DNS settings
- Node.js 20+ installed locally

---

## Quick Deploy (5 Steps)

### Step 1: Setup GCP Project

```bash
# Login to GCP
gcloud auth login

# Create project
gcloud projects create ai-pathshala-prod --name="AI Pathshala"
gcloud config set project ai-pathshala-prod

# Enable billing (via console: https://console.cloud.google.com/billing)

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2: Create Database

```bash
# Create Cloud SQL instance
gcloud sql instances create ai-pathshala-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-size=10GB

# Create database and user
gcloud sql databases create ai_pathshala --instance=ai-pathshala-db

DB_PASSWORD=$(openssl rand -base64 24)
echo "Database Password: $DB_PASSWORD"  # SAVE THIS!

gcloud sql users create ai_pathshala_user \
  --instance=ai-pathshala-db \
  --password="$DB_PASSWORD"
```

### Step 3: Create Secrets

```bash
# Create secrets
openssl rand -base64 32 | gcloud secrets create NEXTAUTH_SECRET --data-file=-
echo -n "$DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-
echo -n "YOUR_GOOGLE_AI_API_KEY" | gcloud secrets create GOOGLE_AI_API_KEY --data-file=-

# Grant access to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe ai-pathshala-prod --format='value(projectNumber)')

for SECRET in NEXTAUTH_SECRET DATABASE_PASSWORD GOOGLE_AI_API_KEY; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done
```

### Step 4: Build and Deploy

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create ai-school-platform \
  --repository-format=docker \
  --location=asia-south1

# Build and push image
gcloud builds submit \
  --tag asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest

# Deploy to Cloud Run
gcloud run deploy ai-pathshala \
  --image asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1 \
  --port 3000 \
  --add-cloudsql-instances ai-pathshala-prod:asia-south1:ai-pathshala-db \
  --set-secrets "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,GOOGLE_AI_API_KEY=GOOGLE_AI_API_KEY:latest" \
  --set-env-vars "
NODE_ENV=production,
NEXTAUTH_URL=https://thestai.com,
DATABASE_URL=postgresql://ai_pathshala_user:PASSWORD@/ai_pathshala?host=/cloudsql/ai-pathshala-prod:asia-south1:ai-pathshala-db,
DIRECT_URL=postgresql://ai_pathshala_user:PASSWORD@/ai_pathshala?host=/cloudsql/ai-pathshala-prod:asia-south1:ai-pathshala-db
"
```

### Step 5: Run Migrations

```bash
# Start Cloud SQL Proxy (in separate terminal)
cloud-sql-proxy ai-pathshala-prod:asia-south1:ai-pathshala-db

# Run migrations
export DATABASE_URL="postgresql://ai_pathshala_user:PASSWORD@localhost:5432/ai_pathshala"
export DIRECT_URL="$DATABASE_URL"

npx prisma migrate deploy
npx prisma db seed

# Create school
npx tsx scripts/create-school.ts
```

---

## Configure Domain

```bash
# Map custom domain
gcloud beta run domain-mappings create \
  --service ai-pathshala \
  --domain thestai.com \
  --region asia-south1

# Get DNS records
gcloud beta run domain-mappings describe \
  --domain thestai.com \
  --region asia-south1
```

Add the displayed DNS records to your domain registrar.

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@thestai.com | AIPathshala2026! |
| Teacher | testteacher@thestai.com | TestTeacher2026! |
| Student | teststudent@thestai.com | TestStudent2026! |

---

## Useful Commands

```bash
# View logs
gcloud logging read 'resource.type="cloud_run_revision"' --limit 50

# Check service status
gcloud run services describe ai-pathshala --region asia-south1

# Redeploy after changes
gcloud builds submit --tag asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest && \
gcloud run deploy ai-pathshala --image asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest --region asia-south1

# Health check
curl https://thestai.com/api/health
```

---

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Cloud Run | ~$10 |
| Cloud SQL | ~$9 |
| Load Balancer | ~$18 |
| **Total** | **~$37/month** |

**Free Credits:**
- GCP Free Trial: $300 (90 days)
- Google for Startups: $2,000/year

---

## Support

- GitHub Issues: https://github.com/thestai-admin/AI-School-Platform/issues
- Email: support@thestai.com
