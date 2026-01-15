# Railway Deployment Guide

Deploy AI School Platform to Railway with PostgreSQL and Qwen3 AI.

## Architecture

```
Your Domain (yourdomain.com)
         │
         ▼
    ┌─────────┐
    │ Railway │
    │   App   │──────► Together.ai (Qwen3 AI)
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │PostgreSQL│
    │(Railway) │
    └─────────┘
```

## Cost Estimate

| Service | Cost |
|---------|------|
| Railway (Hobby) | $5/month |
| Together.ai | Free tier ($5 credit) |
| Domain | ~$10/year |
| **Total** | **~$6/month** |

---

## Step 1: Create Together.ai Account (Free)

1. Go to [https://api.together.xyz/](https://api.together.xyz/)
2. Sign up (get $5 free credit)
3. Go to Settings → API Keys
4. Create new API key and save it

---

## Step 2: Deploy to Railway

### Option A: One-Click Deploy (Easiest)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

### Option B: Manual Deploy

1. **Create Railway Account**
   - Go to [https://railway.app/](https://railway.app/)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub and select this repository

3. **Add PostgreSQL**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-configures DATABASE_URL

4. **Configure Environment Variables**
   
   Click on your app service → Variables → Add these:

   ```
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   NEXTAUTH_URL=https://<your-app>.up.railway.app
   TOGETHER_API_KEY=<your-together-api-key>
   QWEN_MODEL=Qwen/Qwen2.5-72B-Instruct
   AI_TIMEOUT=60000
   AI_MAX_RETRIES=3
   ```

5. **Deploy**
   - Railway auto-deploys on push to main branch
   - First deploy takes ~5 minutes

---

## Step 3: Run Database Migrations

After first deployment:

1. Go to Railway Dashboard → Your Project
2. Click on the app service
3. Go to "Settings" → "Deploy" section
4. Add this as a one-time deploy command:
   ```
   npx prisma migrate deploy && npx tsx prisma/seed.ts
   ```
5. Or use Railway CLI:
   ```bash
   railway run npx prisma migrate deploy
   railway run npx tsx prisma/seed.ts
   ```

---

## Step 4: Create First School

Use Railway CLI or shell:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Create school
railway run npx tsx scripts/create-school.ts
```

Or set environment variables in Railway and redeploy:
```
SCHOOL_NAME=My School
SCHOOL_SLUG=myschool
ADMIN_EMAIL=admin@myschool.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_NAME=School Admin
```

---

## Step 5: Connect Custom Domain

1. **In Railway:**
   - Go to your app service → Settings → Domains
   - Click "Generate Domain" (get a .up.railway.app URL first)
   - Click "Custom Domain" → Add your domain

2. **In Your Domain Registrar:**
   
   Add these DNS records:

   | Type | Name | Value |
   |------|------|-------|
   | CNAME | @ | `<your-app>.up.railway.app` |
   | CNAME | * | `<your-app>.up.railway.app` |

3. **Update NEXTAUTH_URL:**
   ```
   NEXTAUTH_URL=https://yourdomain.com
   ```

4. **Wait for SSL** (automatic, ~5 minutes)

---

## Multi-Tenancy (Multiple Schools)

Each school gets a subdomain:
- `school1.yourdomain.com`
- `school2.yourdomain.com`

The wildcard CNAME (`*`) handles all subdomains automatically.

### Add New School

```bash
railway run npx tsx scripts/create-school.ts
# Enter: school name, slug (subdomain), admin email, password
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Auto | PostgreSQL connection (Railway sets this) |
| `NEXTAUTH_SECRET` | Yes | Auth encryption key (32+ chars) |
| `NEXTAUTH_URL` | Yes | Your app URL |
| `TOGETHER_API_KEY` | Yes | Together.ai API key |
| `QWEN_MODEL` | No | AI model (default: Qwen2.5-72B) |
| `AI_TIMEOUT` | No | Request timeout in ms (default: 60000) |
| `AI_MAX_RETRIES` | No | Retry attempts (default: 3) |

---

## Qwen3 Model Options

| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| `Qwen/Qwen2.5-72B-Instruct` | Slower | Best | $0.90/1M tokens |
| `Qwen/Qwen2.5-32B-Instruct` | Medium | Great | $0.60/1M tokens |
| `Qwen/Qwen2.5-7B-Instruct` | Fast | Good | $0.20/1M tokens |

For schools with budget constraints, use the 7B model.

---

## Monitoring

### View Logs
- Railway Dashboard → Your Service → Logs

### Health Check
```bash
curl https://yourdomain.com/api/health
```

### Database Access
```bash
railway connect postgres
```

---

## Troubleshooting

### Build Fails
- Check Dockerfile syntax
- Ensure all dependencies in package.json
- View build logs in Railway

### Database Connection Error
- Verify DATABASE_URL is set (Railway auto-sets this)
- Run migrations: `railway run npx prisma migrate deploy`

### AI Not Responding
- Check TOGETHER_API_KEY is valid
- Verify model name is correct
- Check Together.ai dashboard for usage/errors

### Domain Not Working
- Verify DNS records are correct
- Wait 24-48 hours for DNS propagation
- Check SSL certificate status in Railway

---

## Scaling

Railway auto-scales based on usage. For high traffic:

1. **Upgrade Plan**: Railway Pro ($20/month) for more resources
2. **Add Replicas**: Settings → Deploy → Replicas
3. **Database**: Upgrade PostgreSQL plan if needed

---

## Backup

### Database Backup
```bash
# Export
railway run pg_dump $DATABASE_URL > backup.sql

# Import
railway run psql $DATABASE_URL < backup.sql
```

### Automated Backups
Railway Pro includes automated daily backups.

---

## Support

- Railway Docs: https://docs.railway.app/
- Together.ai Docs: https://docs.together.ai/
- Project Issues: GitHub Issues
