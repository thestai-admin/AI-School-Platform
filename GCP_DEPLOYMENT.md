# AI School Platform - GCP Deployment Guide

This guide covers deploying the AI School Platform to Google Cloud Platform using Cloud Run, Cloud SQL, and Vertex AI with Gemma 2.

## Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              Cloud Load Balancer            │
                    │         (SSL/TLS with thestai.com)         │
                    └─────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────────┐
                    │              Cloud Run                      │
                    │         Next.js Application (MIT)           │
                    │    • Auto-scaling (0 to N instances)        │
                    │    • SSE for live classroom                 │
                    └─────────────────┬───────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
│   Cloud SQL     │      │   Secret Manager    │      │   Vertex AI          │
│   PostgreSQL    │      │   • NEXTAUTH_SECRET │      │   Gemma 2 (Open)     │
│   (OSS)         │      │   • DB Password     │      │   • Chat             │
│   • All data    │      │   • API Keys        │      │   • Lesson gen       │
└─────────────────┘      └─────────────────────┘      └──────────────────────┘
```

## Cost Breakdown

| Service | Tier/Size | Monthly Cost | Notes |
|---------|-----------|--------------|-------|
| **Cloud Run** | min_instances=1 | ~$5-10 | Keeps app warm |
| **Cloud SQL PostgreSQL** | db-f1-micro | ~$9 | 10GB storage |
| **Vertex AI (Gemma 2)** | Pay-per-use | ~$1-5 | ~100 queries/day |
| **Cloud Load Balancer** | + SSL | ~$18 | For custom domain |
| **Secret Manager** | Free tier | $0 | 10,000 accesses/month |
| **Total** | | **~$33-42/month** | |

### With GCP Credits

| Source | Amount |
|--------|--------|
| Free Trial | $300 (90 days) |
| Google for Startups | $2,000/year |
| **Total Available** | **$2,300** |

At ~$35/month = **65+ months free** (~5.5 years)

## Prerequisites

1. **GCP Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Docker** installed locally
4. **Domain** DNS access (for thestai.com)

## Quick Start (Script-Based)

The fastest way to deploy is using the provided deployment script:

```bash
# 1. Make the script executable
chmod +x scripts/deploy-gcp.sh

# 2. Set your project ID
export GCP_PROJECT_ID="thestai-platform"

# 3. Enable APIs
./scripts/deploy-gcp.sh setup

# 4. Create database
./scripts/deploy-gcp.sh create-db
# Save the password displayed!

# 5. Create secrets
./scripts/deploy-gcp.sh create-secrets

# 6. Build and deploy
./scripts/deploy-gcp.sh deploy

# 7. Run migrations
./scripts/deploy-gcp.sh migrate

# 8. Configure domain
./scripts/deploy-gcp.sh domain thestai.com
```

## Manual Deployment

### Step 1: Project Setup

```bash
# Create project
gcloud projects create thestai-platform --name="AI School Platform"
gcloud config set project thestai-platform

# Enable billing (required)
# Do this in the GCP Console

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com
```

### Step 2: Create Cloud SQL Instance

```bash
# Create instance (~5 minutes)
gcloud sql instances create ai-school-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-size=10GB \
  --storage-type=SSD

# Create database
gcloud sql databases create ai_school --instance=ai-school-db

# Create user with secure password
DB_PASSWORD=$(openssl rand -base64 24)
echo "Database password: $DB_PASSWORD"
gcloud sql users create ai_school_user \
  --instance=ai-school-db \
  --password=$DB_PASSWORD
```

### Step 3: Create Secrets

```bash
# Generate and store NextAuth secret
openssl rand -base64 32 | gcloud secrets create NEXTAUTH_SECRET --data-file=-

# Store database password
echo -n "$DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-

# Store BHASHINI API key (if you have one)
echo -n "your-bhashini-key" | gcloud secrets create BHASHINI_API_KEY --data-file=-

# Grant Cloud Run access to secrets
PROJECT_NUMBER=$(gcloud projects describe thestai-platform --format='value(projectNumber)')

for SECRET in NEXTAUTH_SECRET DATABASE_PASSWORD BHASHINI_API_KEY; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Step 4: Build and Deploy

```bash
# Build container image
gcloud builds submit --tag gcr.io/thestai-platform/ai-school-platform

# Deploy to Cloud Run
gcloud run deploy ai-school-platform \
  --image gcr.io/thestai-platform/ai-school-platform:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --add-cloudsql-instances thestai-platform:asia-south1:ai-school-db \
  --set-secrets "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,BHASHINI_API_KEY=BHASHINI_API_KEY:latest" \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=thestai-platform,GCP_LOCATION=asia-south1,VERTEX_AI_MODEL=gemma-2-27b-it,NEXTAUTH_URL=https://thestai.com,BHASHINI_USE_MOCK=false"
```

### Step 5: Run Database Migrations

```bash
# Start Cloud SQL Proxy (in separate terminal)
cloud-sql-proxy thestai-platform:asia-south1:ai-school-db &

# Run migrations
DATABASE_URL="postgresql://ai_school_user:$DB_PASSWORD@localhost:5432/ai_school" \
  npx prisma migrate deploy

# Seed the database
DATABASE_URL="postgresql://ai_school_user:$DB_PASSWORD@localhost:5432/ai_school" \
  npx prisma db seed

# Create a school and admin user
DATABASE_URL="postgresql://ai_school_user:$DB_PASSWORD@localhost:5432/ai_school" \
  npx tsx scripts/create-school.ts
```

### Step 6: Configure Custom Domain

```bash
# Map custom domain
gcloud beta run domain-mappings create \
  --service ai-school-platform \
  --domain thestai.com \
  --region asia-south1

# Get DNS records
gcloud beta run domain-mappings describe \
  --domain thestai.com \
  --region asia-south1
```

Add these DNS records at your registrar:
- `A` record: `@` → (IP from above)
- `CNAME` record: `www` → `ghs.googlehosted.com`

## Terraform Deployment (Infrastructure as Code)

For reproducible deployments, use the provided Terraform configuration:

```bash
cd infrastructure/terraform/gcp

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply
```

## Environment Variables

The platform automatically selects the AI provider based on configuration:

```env
# GCP/Vertex AI (production)
GCP_PROJECT_ID=thestai-platform
GCP_LOCATION=asia-south1
VERTEX_AI_MODEL=gemma-2-27b-it

# Or force a specific provider
AI_PROVIDER=vertex  # Options: vertex, qwen, claude, ollama
```

## Monitoring

### View Logs

```bash
gcloud run logs read --service ai-school-platform --region asia-south1 --limit 100
```

### Set Up Billing Alerts

```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="AI School Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### Health Check

The platform exposes a health endpoint at `/api/health`:

```bash
curl https://thestai.com/api/health
```

## Troubleshooting

### Database Connection Issues

1. Verify Cloud SQL instance is running:
   ```bash
   gcloud sql instances describe ai-school-db
   ```

2. Check Cloud Run has Cloud SQL connection:
   ```bash
   gcloud run services describe ai-school-platform --region asia-south1
   ```

### Vertex AI Errors

1. Verify API is enabled:
   ```bash
   gcloud services list --enabled | grep aiplatform
   ```

2. Check service account has permissions:
   ```bash
   gcloud projects get-iam-policy thestai-platform \
     --filter="bindings.role:roles/aiplatform.user"
   ```

### Cold Start Issues

If the app is slow on first request:
- Increase `min-instances` to 1 (already configured)
- This costs ~$5-10/month but eliminates cold starts

## Updating the Application

```bash
# Build and deploy new version
gcloud builds submit --tag gcr.io/thestai-platform/ai-school-platform
gcloud run deploy ai-school-platform \
  --image gcr.io/thestai-platform/ai-school-platform:latest \
  --region asia-south1

# Or use Cloud Build trigger for automatic deploys
# See cloudbuild.yaml for CI/CD configuration
```

## Cleanup

To remove all resources (DANGEROUS):

```bash
./scripts/deploy-gcp.sh cleanup
```

Or manually:

```bash
# Delete Cloud Run service
gcloud run services delete ai-school-platform --region asia-south1

# Delete Cloud SQL (takes ~5 minutes)
gcloud sql instances delete ai-school-db

# Delete secrets
gcloud secrets delete NEXTAUTH_SECRET
gcloud secrets delete DATABASE_PASSWORD
gcloud secrets delete BHASHINI_API_KEY
```

## Getting GCP Credits

### 1. Free Trial ($300)
- Sign up at: https://cloud.google.com/free
- Instant activation
- Valid for 90 days

### 2. Google for Startups ($2,000)
- Apply at: https://startup.google.com/cloud/
- Requirements:
  - Website (you have thestai.com)
  - Business email
- Timeline: 1-2 weeks approval

## Support

- **Platform Issues**: Check logs with `./scripts/deploy-gcp.sh logs`
- **GCP Issues**: https://cloud.google.com/support
- **BHASHINI API**: https://bhashini.gov.in/support
