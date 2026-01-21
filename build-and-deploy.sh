#!/bin/bash
# Build and Deploy to ai-pathshala service (thestai.com)
# Run this from WSL

set -e

cd "$(dirname "$0")"

echo "==========================================="
echo "Build and Deploy to thestai.com"
echo "==========================================="
echo

# Step 1: Get GCP auth token
echo "[Step 1/4] Getting GCP auth token..."
TOKEN=$(cmd.exe /c get-token-for-wsl.bat 2>/dev/null | tr -d '\r\n')
if [ -z "$TOKEN" ]; then
    echo "ERROR: Failed to get GCP token"
    exit 1
fi
echo "Token retrieved successfully"

# Step 2: Authenticate Docker
echo
echo "[Step 2/4] Authenticating Docker..."
docker login -u oauth2accesstoken -p "$TOKEN" asia-south1-docker.pkg.dev
echo

# Step 3: Build Docker image
echo "[Step 3/4] Building Docker image (no cache)..."
docker build --no-cache --platform linux/amd64 \
    -t asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest .
echo

# Step 4: Push to registry
echo "[Step 4/4] Pushing image to Artifact Registry..."
docker push asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest
echo

echo "==========================================="
echo "Image pushed! Now run deploy.bat from Windows"
echo "Or run: cmd.exe /c deploy.bat"
echo "==========================================="
