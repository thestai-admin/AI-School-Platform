#!/bin/bash
# Build and Deploy to Cloud Run (thestai.com)
# Service: ai-pathshala | Region: asia-south1 | Project: ai-pathshala-prod
#
# Usage: ./build-and-deploy.sh

set -e

cd "$(dirname "$0")"

echo "==========================================="
echo "Build and Deploy to thestai.com"
echo "==========================================="
echo

# Step 1: Get GCP auth token from Windows gcloud
echo "[Step 1/4] Getting GCP auth token..."
TOKEN=$(cmd.exe /c "\"C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud\" auth print-access-token" 2>/dev/null | tr -d '\r\n')
if [ -z "$TOKEN" ]; then
    echo "ERROR: Failed to get GCP token. Make sure gcloud is authenticated."
    exit 1
fi
echo "Token retrieved successfully"

# Step 2: Authenticate Docker
echo
echo "[Step 2/4] Authenticating Docker..."
docker login -u oauth2accesstoken -p "$TOKEN" asia-south1-docker.pkg.dev
echo

# Step 3: Build Docker image
echo "[Step 3/4] Building Docker image..."
docker build --no-cache --platform linux/amd64 \
    -t asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest .
echo

# Step 4: Push to registry
echo "[Step 4/4] Pushing image to Artifact Registry..."
docker push asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest
echo

echo "==========================================="
echo "Image pushed! Now deploying..."
echo "==========================================="

# Step 5: Deploy to Cloud Run
cmd.exe /c deploy.bat

echo
echo "Done! Site: https://thestai.com"
