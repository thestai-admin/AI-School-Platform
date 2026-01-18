#!/bin/bash
# AI School Platform - GCP Deployment Script
# This script sets up and deploys the platform to Google Cloud Platform

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-thestai-platform}"
REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="ai-school-platform"
DB_INSTANCE_NAME="ai-school-db"
DB_NAME="ai_school"
DB_USER="ai_school_user"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Parse command line arguments
COMMAND=${1:-help}

case $COMMAND in
    setup)
        echo "================================================"
        echo "Setting up GCP Project: $PROJECT_ID"
        echo "Region: $REGION"
        echo "================================================"
        echo ""

        # Set project
        print_status "Setting GCP project..."
        gcloud config set project $PROJECT_ID

        # Enable required APIs
        print_status "Enabling required APIs..."
        gcloud services enable \
            run.googleapis.com \
            sqladmin.googleapis.com \
            aiplatform.googleapis.com \
            secretmanager.googleapis.com \
            cloudbuild.googleapis.com \
            containerregistry.googleapis.com

        print_status "APIs enabled successfully!"
        echo ""
        echo "Next steps:"
        echo "  1. Run: ./scripts/deploy-gcp.sh create-db"
        echo "  2. Run: ./scripts/deploy-gcp.sh create-secrets"
        echo "  3. Run: ./scripts/deploy-gcp.sh deploy"
        ;;

    create-db)
        echo "================================================"
        echo "Creating Cloud SQL PostgreSQL Instance"
        echo "================================================"
        echo ""

        # Generate a random password
        DB_PASSWORD=$(openssl rand -base64 24)

        print_status "Creating Cloud SQL instance (this may take a few minutes)..."
        gcloud sql instances create $DB_INSTANCE_NAME \
            --database-version=POSTGRES_15 \
            --tier=db-f1-micro \
            --region=$REGION \
            --storage-size=10GB \
            --storage-type=SSD \
            --no-assign-ip \
            --enable-google-private-path

        print_status "Creating database..."
        gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

        print_status "Creating database user..."
        gcloud sql users create $DB_USER \
            --instance=$DB_INSTANCE_NAME \
            --password=$DB_PASSWORD

        echo ""
        print_status "Database created successfully!"
        echo ""
        echo "================================================"
        echo "IMPORTANT: Save this password securely!"
        echo "Database Password: $DB_PASSWORD"
        echo "================================================"
        echo ""
        echo "Connection string for Cloud Run:"
        echo "postgresql://$DB_USER:PASSWORD@/$DB_NAME?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE_NAME"
        ;;

    create-secrets)
        echo "================================================"
        echo "Creating Secret Manager Secrets"
        echo "================================================"
        echo ""

        # NEXTAUTH_SECRET
        if ! gcloud secrets describe NEXTAUTH_SECRET &> /dev/null; then
            print_status "Creating NEXTAUTH_SECRET..."
            openssl rand -base64 32 | gcloud secrets create NEXTAUTH_SECRET --data-file=-
        else
            print_warning "NEXTAUTH_SECRET already exists, skipping..."
        fi

        # DATABASE_PASSWORD
        if ! gcloud secrets describe DATABASE_PASSWORD &> /dev/null; then
            print_status "Creating DATABASE_PASSWORD..."
            echo "Enter the database password from the create-db step:"
            read -s DB_PASSWORD
            echo -n "$DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-
        else
            print_warning "DATABASE_PASSWORD already exists, skipping..."
        fi

        # BHASHINI_API_KEY
        if ! gcloud secrets describe BHASHINI_API_KEY &> /dev/null; then
            print_status "Creating BHASHINI_API_KEY..."
            echo "Enter your BHASHINI API key (or press Enter to skip):"
            read -s BHASHINI_KEY
            if [ -n "$BHASHINI_KEY" ]; then
                echo -n "$BHASHINI_KEY" | gcloud secrets create BHASHINI_API_KEY --data-file=-
            else
                echo -n "placeholder" | gcloud secrets create BHASHINI_API_KEY --data-file=-
                print_warning "Created placeholder BHASHINI_API_KEY. Update later with actual key."
            fi
        else
            print_warning "BHASHINI_API_KEY already exists, skipping..."
        fi

        # Grant Cloud Run access to secrets
        print_status "Granting Cloud Run access to secrets..."
        PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

        for SECRET in NEXTAUTH_SECRET DATABASE_PASSWORD BHASHINI_API_KEY; do
            gcloud secrets add-iam-policy-binding $SECRET \
                --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
                --role="roles/secretmanager.secretAccessor" \
                --quiet
        done

        print_status "Secrets created and permissions granted!"
        ;;

    build)
        echo "================================================"
        echo "Building Docker Image"
        echo "================================================"
        echo ""

        print_status "Submitting build to Cloud Build..."
        gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

        print_status "Build complete!"
        ;;

    deploy)
        echo "================================================"
        echo "Deploying to Cloud Run"
        echo "================================================"
        echo ""

        # Check if image exists
        if ! gcloud container images describe gcr.io/$PROJECT_ID/$SERVICE_NAME:latest &> /dev/null; then
            print_warning "No image found. Building first..."
            gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME
        fi

        print_status "Deploying to Cloud Run..."
        gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
            --platform managed \
            --region $REGION \
            --allow-unauthenticated \
            --min-instances 1 \
            --max-instances 3 \
            --memory 512Mi \
            --cpu 1 \
            --port 3000 \
            --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE_NAME \
            --set-secrets "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,BHASHINI_API_KEY=BHASHINI_API_KEY:latest" \
            --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,GCP_LOCATION=$REGION,VERTEX_AI_MODEL=gemma-2-27b-it,NEXTAUTH_URL=https://thestai.com,BHASHINI_USE_MOCK=false"

        print_status "Deployment complete!"
        echo ""

        # Get the service URL
        SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')
        echo "Service URL: $SERVICE_URL"
        ;;

    migrate)
        echo "================================================"
        echo "Running Database Migrations"
        echo "================================================"
        echo ""

        print_status "Starting Cloud SQL Proxy..."
        echo "In a separate terminal, run:"
        echo "  cloud-sql-proxy $PROJECT_ID:$REGION:$DB_INSTANCE_NAME"
        echo ""
        echo "Then run:"
        echo "  DATABASE_URL=\"postgresql://$DB_USER:PASSWORD@localhost:5432/$DB_NAME\" npx prisma migrate deploy"
        echo "  DATABASE_URL=\"postgresql://$DB_USER:PASSWORD@localhost:5432/$DB_NAME\" npx prisma db seed"
        ;;

    domain)
        echo "================================================"
        echo "Configuring Custom Domain"
        echo "================================================"
        echo ""

        DOMAIN=${2:-thestai.com}

        print_status "Mapping domain $DOMAIN to Cloud Run service..."
        gcloud beta run domain-mappings create \
            --service $SERVICE_NAME \
            --domain $DOMAIN \
            --region $REGION

        echo ""
        print_status "Domain mapping created!"
        echo ""
        echo "Add the following DNS records at your domain registrar:"
        gcloud beta run domain-mappings describe \
            --domain $DOMAIN \
            --region $REGION \
            --format='value(status.resourceRecords)'
        ;;

    logs)
        echo "================================================"
        echo "Viewing Cloud Run Logs"
        echo "================================================"
        echo ""

        gcloud run logs read --service $SERVICE_NAME --region $REGION --limit 100
        ;;

    status)
        echo "================================================"
        echo "Service Status"
        echo "================================================"
        echo ""

        gcloud run services describe $SERVICE_NAME --region $REGION
        ;;

    cleanup)
        echo "================================================"
        echo "Cleanup Resources (DANGEROUS)"
        echo "================================================"
        echo ""

        print_warning "This will delete ALL resources. Are you sure? (type 'yes' to confirm)"
        read CONFIRM

        if [ "$CONFIRM" != "yes" ]; then
            print_error "Cleanup cancelled."
            exit 1
        fi

        print_status "Deleting Cloud Run service..."
        gcloud run services delete $SERVICE_NAME --region $REGION --quiet || true

        print_status "Deleting Cloud SQL instance..."
        gcloud sql instances delete $DB_INSTANCE_NAME --quiet || true

        print_status "Deleting secrets..."
        gcloud secrets delete NEXTAUTH_SECRET --quiet || true
        gcloud secrets delete DATABASE_PASSWORD --quiet || true
        gcloud secrets delete BHASHINI_API_KEY --quiet || true

        print_status "Cleanup complete!"
        ;;

    help|*)
        echo "AI School Platform - GCP Deployment Script"
        echo ""
        echo "Usage: ./scripts/deploy-gcp.sh <command>"
        echo ""
        echo "Commands:"
        echo "  setup          Enable required GCP APIs"
        echo "  create-db      Create Cloud SQL PostgreSQL instance"
        echo "  create-secrets Create Secret Manager secrets"
        echo "  build          Build and push Docker image"
        echo "  deploy         Deploy to Cloud Run"
        echo "  migrate        Instructions for running database migrations"
        echo "  domain [name]  Configure custom domain (default: thestai.com)"
        echo "  logs           View recent logs"
        echo "  status         Check service status"
        echo "  cleanup        Delete all resources (DANGEROUS)"
        echo "  help           Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  GCP_PROJECT_ID  GCP project ID (default: thestai-platform)"
        echo "  GCP_REGION      GCP region (default: asia-south1)"
        echo ""
        echo "Quick Start:"
        echo "  1. ./scripts/deploy-gcp.sh setup"
        echo "  2. ./scripts/deploy-gcp.sh create-db"
        echo "  3. ./scripts/deploy-gcp.sh create-secrets"
        echo "  4. ./scripts/deploy-gcp.sh deploy"
        echo "  5. ./scripts/deploy-gcp.sh migrate"
        echo "  6. ./scripts/deploy-gcp.sh domain thestai.com"
        ;;
esac
