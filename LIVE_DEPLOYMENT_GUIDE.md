# AI Pathshala - Live Deployment Guide

**Product:** AI Pathshala (AI पाठशाला)
**Company:** THEST AI Private Limited
**Domain:** www.thestai.com
**Tagline:** "Empowering Indian Education with AI"

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Google account (Gmail)
- [ ] Credit/Debit card for GCP billing (you get $300 free credits)
- [ ] Access to your domain DNS settings (www.thestai.com)
- [ ] BHASHINI API credentials (optional, for Indian language support)
- [ ] A computer with internet access

---

## STEP 1: Create GCP Account & Project

### 1.1 Sign up for Google Cloud

1. Go to: https://cloud.google.com/free
2. Click **"Get started for free"**
3. Sign in with your Google account
4. Enter billing information (you won't be charged - $300 free credit for 90 days)
5. Complete verification

### 1.2 Create a New Project

1. Go to: https://console.cloud.google.com
2. Click the project dropdown (top left, next to "Google Cloud")
3. Click **"New Project"**
4. Enter:
   - **Project name:** `ai-pathshala`
   - **Project ID:** `ai-pathshala-prod` (or auto-generated)
   - **Organization:** Select your organization or "No organization"
5. Click **"Create"**
6. Wait for project creation (30 seconds)
7. Select the new project from the dropdown

**Save your Project ID:** `ai-pathshala-prod` (you'll need this)

---

## STEP 2: Install Required Tools

### 2.1 Install Google Cloud CLI

**On Windows:**
1. Download: https://cloud.google.com/sdk/docs/install
2. Run the installer
3. Check "Run gcloud init" at the end

**On Mac:**
```bash
brew install google-cloud-sdk
```

**On Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2.2 Initialize and Login

Open Terminal/Command Prompt:

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project ai-pathshala-prod

# Verify
gcloud config list
```

A browser window will open - login with your Google account.

---

## STEP 3: Enable Required APIs

Run this command to enable all required services:

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com
```

Wait for completion (1-2 minutes).

---

## STEP 4: Create Cloud SQL Database

### 4.1 Create PostgreSQL Instance

```bash
# Create the database instance (takes 5-10 minutes)
gcloud sql instances create ai-pathshala-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-size=10GB \
  --storage-type=SSD \
  --database-flags=max_connections=100
```

Wait for completion...

### 4.2 Create Database and User

```bash
# Create the database
gcloud sql databases create ai_pathshala --instance=ai-pathshala-db

# Generate a secure password and create user
DB_PASSWORD=$(openssl rand -base64 24)
echo "============================================"
echo "SAVE THIS PASSWORD SECURELY!"
echo "Database Password: $DB_PASSWORD"
echo "============================================"

gcloud sql users create ai_pathshala_user \
  --instance=ai-pathshala-db \
  --password="$DB_PASSWORD"
```

**⚠️ IMPORTANT: Copy and save the database password displayed!**

---

## STEP 5: Create Secrets in Secret Manager

### 5.1 Create Required Secrets

```bash
# 1. NextAuth Secret (for authentication)
openssl rand -base64 32 | gcloud secrets create NEXTAUTH_SECRET --data-file=-

# 2. Database Password (paste the password from Step 4)
echo -n "YOUR_DB_PASSWORD_HERE" | gcloud secrets create DATABASE_PASSWORD --data-file=-

# 3. BHASHINI API Key (enter your key, or use placeholder)
echo -n "your-bhashini-api-key" | gcloud secrets create BHASHINI_API_KEY --data-file=-

# 4. BHASHINI User ID
echo -n "your-bhashini-user-id" | gcloud secrets create BHASHINI_USER_ID --data-file=-
```

### 5.2 Grant Access to Cloud Run

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe ai-pathshala-prod --format='value(projectNumber)')

# Grant access to each secret
for SECRET in NEXTAUTH_SECRET DATABASE_PASSWORD BHASHINI_API_KEY BHASHINI_USER_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
done

echo "Secrets configured successfully!"
```

---

## STEP 6: Build and Deploy to Cloud Run

### 6.1 Navigate to Project Directory

```bash
cd "/mnt/c/Users/tarke/Desktop/AI school/ai-school-platform"
# Or on Windows: cd "C:\Users\tarke\Desktop\AI school\ai-school-platform"
```

### 6.2 Build the Docker Image

```bash
# Submit build to Cloud Build
gcloud builds submit --tag gcr.io/ai-pathshala-prod/ai-pathshala:latest
```

This takes 5-10 minutes. Wait for "SUCCESS" message.

### 6.3 Deploy to Cloud Run

```bash
gcloud run deploy ai-pathshala \
  --image gcr.io/ai-pathshala-prod/ai-pathshala:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1 \
  --port 3000 \
  --add-cloudsql-instances ai-pathshala-prod:asia-south1:ai-pathshala-db \
  --set-secrets "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,BHASHINI_API_KEY=BHASHINI_API_KEY:latest,BHASHINI_USER_ID=BHASHINI_USER_ID:latest" \
  --set-env-vars "
NODE_ENV=production,
GCP_PROJECT_ID=ai-pathshala-prod,
GCP_LOCATION=asia-south1,
VERTEX_AI_MODEL=gemma-2-27b-it,
NEXTAUTH_URL=https://www.thestai.com,
DATABASE_URL=postgresql://ai_pathshala_user:\${DATABASE_PASSWORD}@/ai_pathshala?host=/cloudsql/ai-pathshala-prod:asia-south1:ai-pathshala-db,
DIRECT_URL=postgresql://ai_pathshala_user:\${DATABASE_PASSWORD}@/ai_pathshala?host=/cloudsql/ai-pathshala-prod:asia-south1:ai-pathshala-db,
BHASHINI_USE_MOCK=false,
BHASHINI_CONFIG_URL=https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline,
BHASHINI_COMPUTE_URL=https://dhruva-api.bhashini.gov.in/services/inference/pipeline
"
```

After deployment, you'll see:
```
Service URL: https://ai-pathshala-xxxxx-el.a.run.app
```

**Save this URL** - it's your temporary application URL.

---

## STEP 7: Run Database Migrations

### 7.1 Install Cloud SQL Proxy

**On Windows:**
Download from: https://cloud.google.com/sql/docs/postgres/connect-admin-proxy#windows

**On Mac/Linux:**
```bash
# Download
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
```

### 7.2 Start Proxy and Run Migrations

**Terminal 1 - Start Proxy:**
```bash
./cloud-sql-proxy ai-pathshala-prod:asia-south1:ai-pathshala-db
```

**Terminal 2 - Run Migrations:**
```bash
cd "/mnt/c/Users/tarke/Desktop/AI school/ai-school-platform"

# Set database URL (replace YOUR_PASSWORD with actual password)
export DATABASE_URL="postgresql://ai_pathshala_user:YOUR_PASSWORD@localhost:5432/ai_pathshala"
export DIRECT_URL="postgresql://ai_pathshala_user:YOUR_PASSWORD@localhost:5432/ai_pathshala"

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database with subjects
npx prisma db seed

echo "Database setup complete!"
```

---

## STEP 8: Configure Domain (www.thestai.com)

### 8.1 Map Custom Domain in Cloud Run

```bash
# Map your domain
gcloud beta run domain-mappings create \
  --service ai-pathshala \
  --domain www.thestai.com \
  --region asia-south1

# Also map the root domain
gcloud beta run domain-mappings create \
  --service ai-pathshala \
  --domain thestai.com \
  --region asia-south1
```

### 8.2 Get DNS Records

```bash
gcloud beta run domain-mappings describe \
  --domain www.thestai.com \
  --region asia-south1
```

This will show DNS records you need to add.

### 8.3 Configure DNS at Your Registrar

Go to your domain registrar (GoDaddy, Namecheap, Google Domains, etc.) and add:

| Type | Name | Value |
|------|------|-------|
| A | @ | (IP from above) |
| AAAA | @ | (IPv6 from above, if provided) |
| CNAME | www | ghs.googlehosted.com |

**DNS propagation takes 5 minutes to 48 hours.**

### 8.4 Verify Domain Status

```bash
# Check domain mapping status
gcloud beta run domain-mappings list --region asia-south1
```

Wait until status shows "Ready".

---

## STEP 9: Create School and Admin Account

### 9.1 Create Your School

With Cloud SQL Proxy still running (from Step 7), run:

```bash
cd "/mnt/c/Users/tarke/Desktop/AI school/ai-school-platform"

# Set environment variables
export DATABASE_URL="postgresql://ai_pathshala_user:YOUR_PASSWORD@localhost:5432/ai_pathshala"
export DIRECT_URL="$DATABASE_URL"
export SCHOOL_NAME="THEST AI Demo School"
export SCHOOL_SLUG="demo"
export ADMIN_EMAIL="admin@thestai.com"
export ADMIN_PASSWORD="Admin@123!"
export ADMIN_NAME="School Administrator"

# Create school and admin
npx tsx scripts/create-school.ts
```

### 9.2 Create Test Users

Create a few test users for different roles:

```bash
# Run Prisma Studio to manage data visually
npx prisma studio
```

This opens a browser at http://localhost:5555 where you can:
1. Create Teachers
2. Create Students
3. Create Classes
4. Assign teachers to classes

---

## STEP 10: Test the Deployment

### 10.1 Access Your Application

1. **Via Cloud Run URL:** https://ai-pathshala-xxxxx-el.a.run.app
2. **Via Custom Domain:** https://www.thestai.com (after DNS propagates)

### 10.2 Test Login

1. Go to https://www.thestai.com/login
2. Login with:
   - Email: `admin@thestai.com`
   - Password: `Admin@123!`

### 10.3 Test Key Features

| Feature | How to Test |
|---------|-------------|
| **Admin Dashboard** | Login as admin, check /admin |
| **Teacher Lesson Plan** | Create teacher, generate lesson |
| **Student AI Chat** | Create student, test /student/chat |
| **BHASHINI Translation** | Test in classroom with Hindi |

### 10.4 Health Check

```bash
curl https://www.thestai.com/api/health
```

Should return: `{"status":"ok"}`

---

## STEP 11: Get BHASHINI API Credentials (For Indian Languages)

### 11.1 Register on BHASHINI

1. Go to: https://bhashini.gov.in/ulca/user/register
2. Register with your company email
3. Verify your email
4. Login to dashboard

### 11.2 Get API Keys

1. Go to: https://bhashini.gov.in/ulca/user/my-profile/api-key
2. Generate new API key
3. Copy:
   - **User ID** (udyat-xxxxx)
   - **API Key** (your-api-key)

### 11.3 Update Secrets

```bash
# Update BHASHINI credentials
echo -n "your-actual-user-id" | gcloud secrets versions add BHASHINI_USER_ID --data-file=-
echo -n "your-actual-api-key" | gcloud secrets versions add BHASHINI_API_KEY --data-file=-

# Redeploy to pick up new secrets
gcloud run services update ai-pathshala --region asia-south1
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Cloud Run (min 1 instance) | ~$10 |
| Cloud SQL (db-f1-micro) | ~$9 |
| Vertex AI (Gemma 2) | ~$2-5 |
| Load Balancer + SSL | ~$18 |
| **Total** | **~$40/month** |

### Free Credits Available:
- **GCP Free Trial:** $300 for 90 days
- **Google for Startups:** $2,000/year (apply at https://startup.google.com/)
- **Total:** $2,300 = **~57 months free!**

---

## Quick Reference Commands

```bash
# View logs
gcloud run logs read --service ai-pathshala --region asia-south1 --limit 100

# Check service status
gcloud run services describe ai-pathshala --region asia-south1

# Redeploy after code changes
gcloud builds submit --tag gcr.io/ai-pathshala-prod/ai-pathshala:latest && \
gcloud run deploy ai-pathshala --image gcr.io/ai-pathshala-prod/ai-pathshala:latest --region asia-south1

# View database
./cloud-sql-proxy ai-pathshala-prod:asia-south1:ai-pathshala-db &
npx prisma studio

# Set up billing alerts
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="AI Pathshala Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

---

## Support Contacts

- **GCP Support:** https://cloud.google.com/support
- **BHASHINI Support:** https://bhashini.gov.in/support
- **GitHub Issues:** https://github.com/thestai-admin/AI-School-Platform/issues

---

## Next Steps After Deployment

1. **Onboard Teachers:** Create teacher accounts and train them
2. **Create Classes:** Set up Class 1-10 with subjects
3. **Add Students:** Bulk import or manual creation
4. **Configure BHASHINI:** Enable Indian language support
5. **Apply for Startup Credits:** Get $2,000 free credits
6. **Set Up Monitoring:** Configure alerts for errors

---

**Congratulations! AI Pathshala is now live at https://www.thestai.com** 🎉
