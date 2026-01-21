@echo off
REM Deploy to Cloud Run (thestai.com)
REM Service: ai-pathshala | Region: asia-south1 | Project: ai-pathshala-prod

echo Deploying to Cloud Run...
call "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud" run deploy ai-pathshala ^
  --image=asia-south1-docker.pkg.dev/ai-pathshala-prod/ai-school-platform/app:latest ^
  --region=asia-south1 ^
  --project=ai-pathshala-prod ^
  --platform=managed ^
  --allow-unauthenticated ^
  --port=3000 ^
  --add-cloudsql-instances=ai-pathshala-prod:asia-south1:ai-pathshala-db ^
  --set-env-vars="DATABASE_URL=postgresql://ai_pathshala_user:WS0HDKtbWtB6fQBXz4aT76gC2RFcWCq@/ai_pathshala?host=/cloudsql/ai-pathshala-prod:asia-south1:ai-pathshala-db,NEXTAUTH_URL=https://thestai.com,NODE_ENV=production,GOOGLE_AI_API_KEY=AIzaSyAe6eX5auvZgVurt_22XMaJ9CfK7V3UfNE" ^
  --set-secrets="NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest"

echo.
echo Deployment complete!
echo URL: https://thestai.com
