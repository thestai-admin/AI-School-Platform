#!/bin/bash
# GitHub Actions → GCP Workload Identity Federation Setup Script
# Run this script after authenticating with: gcloud auth login

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

echo "========================================================"
echo "  GitHub Actions → GCP Workload Identity Federation"
echo "========================================================"
echo ""

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    print_error "No project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_info "Using project: $PROJECT_ID"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
print_info "Project number: $PROJECT_NUMBER"

# Configuration
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
GITHUB_REPO="thestai-admin/AI-School-Platform"

echo ""
echo "Configuration:"
echo "  Project ID:       $PROJECT_ID"
echo "  Project Number:   $PROJECT_NUMBER"
echo "  Pool Name:        $POOL_NAME"
echo "  Provider Name:    $PROVIDER_NAME"
echo "  Service Account:  $SERVICE_ACCOUNT_EMAIL"
echo "  GitHub Repo:      $GITHUB_REPO"
echo ""

read -p "Continue with this configuration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Aborted."
    exit 1
fi

# Step 1: Enable required APIs
echo ""
echo "========================================================"
echo "Step 1: Enabling required APIs..."
echo "========================================================"
gcloud services enable \
    iamcredentials.googleapis.com \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    --quiet

print_status "APIs enabled"

# Step 2: Create Workload Identity Pool
echo ""
echo "========================================================"
echo "Step 2: Creating Workload Identity Pool..."
echo "========================================================"
if gcloud iam workload-identity-pools describe $POOL_NAME --location="global" &>/dev/null; then
    print_warning "Pool '$POOL_NAME' already exists, skipping creation"
else
    gcloud iam workload-identity-pools create $POOL_NAME \
        --location="global" \
        --display-name="GitHub Actions Pool" \
        --description="Workload Identity Pool for GitHub Actions"
    print_status "Workload Identity Pool created"
fi

# Step 3: Create OIDC Provider for GitHub
echo ""
echo "========================================================"
echo "Step 3: Creating GitHub OIDC Provider..."
echo "========================================================"
if gcloud iam workload-identity-pools providers describe $PROVIDER_NAME --location="global" --workload-identity-pool=$POOL_NAME &>/dev/null; then
    print_warning "Provider '$PROVIDER_NAME' already exists, skipping creation"
else
    gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
        --location="global" \
        --workload-identity-pool=$POOL_NAME \
        --display-name="GitHub Provider" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
        --attribute-condition="assertion.repository_owner == 'thestai-admin'"
    print_status "GitHub OIDC Provider created"
fi

# Step 4: Create Service Account
echo ""
echo "========================================================"
echo "Step 4: Creating Service Account..."
echo "========================================================"
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    print_warning "Service account '$SERVICE_ACCOUNT_EMAIL' already exists, skipping creation"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="GitHub Actions Service Account" \
        --description="Used by GitHub Actions for CI/CD deployments"
    print_status "Service Account created"
fi

# Step 5: Grant IAM roles to Service Account
echo ""
echo "========================================================"
echo "Step 5: Granting IAM roles to Service Account..."
echo "========================================================"

ROLES=(
    "roles/run.admin"
    "roles/storage.admin"
    "roles/iam.serviceAccountUser"
    "roles/cloudsql.client"
    "roles/secretmanager.secretAccessor"
    "roles/cloudbuild.builds.builder"
)

for ROLE in "${ROLES[@]}"; do
    print_info "Granting $ROLE..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$ROLE" \
        --quiet \
        --condition=None 2>/dev/null || true
done
print_status "IAM roles granted"

# Step 6: Allow GitHub to impersonate Service Account
echo ""
echo "========================================================"
echo "Step 6: Configuring Workload Identity binding..."
echo "========================================================"
MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}"

gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT_EMAIL \
    --role="roles/iam.workloadIdentityUser" \
    --member="$MEMBER" \
    --quiet 2>/dev/null || print_warning "Binding may already exist"

print_status "Workload Identity binding configured"

# Step 7: Output the values for GitHub Secrets
echo ""
echo "========================================================"
echo "Step 7: GitHub Secrets Configuration"
echo "========================================================"
echo ""

WORKLOAD_IDENTITY_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"

echo -e "${GREEN}SUCCESS! Setup complete.${NC}"
echo ""
echo "Now add these secrets to your GitHub repository:"
echo ""
echo "Go to: https://github.com/${GITHUB_REPO}/settings/secrets/actions"
echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ Secret Name                      │ Value                        │"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│ GCP_WORKLOAD_IDENTITY_PROVIDER   │ (see below)                  │"
echo "│ GCP_SERVICE_ACCOUNT              │ (see below)                  │"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${YELLOW}GCP_WORKLOAD_IDENTITY_PROVIDER:${NC}"
echo "$WORKLOAD_IDENTITY_PROVIDER"
echo ""
echo -e "${YELLOW}GCP_SERVICE_ACCOUNT:${NC}"
echo "$SERVICE_ACCOUNT_EMAIL"
echo ""
echo "========================================================"
echo ""

# Save to a file for easy copy-paste
cat > /tmp/github-secrets.txt << EOF
GitHub Secrets for ${GITHUB_REPO}
=====================================

GCP_WORKLOAD_IDENTITY_PROVIDER:
$WORKLOAD_IDENTITY_PROVIDER

GCP_SERVICE_ACCOUNT:
$SERVICE_ACCOUNT_EMAIL
EOF

print_info "Secrets also saved to: /tmp/github-secrets.txt"
echo ""
print_status "After adding secrets, push a commit to main to trigger deployment!"
