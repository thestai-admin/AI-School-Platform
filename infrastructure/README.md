# AI School Platform - Production Deployment

Deploy the AI School Platform on a VPS using Docker Compose with Caddy, PostgreSQL, and Ollama.

## Prerequisites

- VPS with 4-8GB RAM (Hetzner CX32 recommended: $8/mo)
- Domain name pointed to your VPS (e.g., thestai.com)
- Cloudflare account (free tier)

## Quick Start

### 1. VPS Setup

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Update system and install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

# Create deployment directory
mkdir -p /opt/ai-school
cd /opt/ai-school
```

### 2. DNS Setup (Cloudflare)

1. Add your domain to Cloudflare
2. Update nameservers at your registrar
3. Add DNS records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_VPS_IP | Proxied |
| A | * | YOUR_VPS_IP | Proxied |

### 3. Deploy Application

```bash
# Copy infrastructure files to VPS
# (or clone your repo)
cd /opt/ai-school

# Create environment file
cp .env.production.example .env

# Edit with your values
nano .env  # or vim .env

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Pull the AI model (first time only, ~5GB)
docker compose -f docker-compose.prod.yml exec ollama ollama pull qwen3:8b

# Run database migrations
docker compose -f docker-compose.prod.yml exec nextjs npx prisma migrate deploy

# Seed subjects
docker compose -f docker-compose.prod.yml exec nextjs npx tsx prisma/seed.ts

# Create first school and admin
docker compose -f docker-compose.prod.yml exec nextjs npx tsx scripts/create-school.ts
```

### 4. Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://thestai.com/api/health
```

## File Structure

```
/opt/ai-school/
├── docker-compose.prod.yml   # Main compose file
├── Caddyfile                 # Reverse proxy config
├── .env                      # Environment variables (from .env.production.example)
└── backups/                  # Automated database backups
```

## Services

| Service | Description | Port |
|---------|-------------|------|
| caddy | Reverse proxy with auto SSL | 80, 443 |
| nextjs | Next.js application | 3000 (internal) |
| postgres | PostgreSQL database | 5432 (internal) |
| ollama | Local AI model server | 11434 (internal) |
| backup | Automated daily backups | - |

## Common Operations

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f nextjs
```

### Update Application

```bash
cd /opt/ai-school

# Pull latest image
docker compose -f docker-compose.prod.yml pull nextjs

# Restart with new image
docker compose -f docker-compose.prod.yml up -d --no-deps nextjs

# Run migrations if needed
docker compose -f docker-compose.prod.yml exec nextjs npx prisma migrate deploy
```

### Database Backup

Backups run automatically daily. To manually backup:

```bash
# Create manual backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U ai_school ai_school > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres psql -U ai_school ai_school < backup_20240101.sql
```

### Change AI Model

```bash
# Pull a different model
docker compose -f docker-compose.prod.yml exec ollama ollama pull llama3.1:8b

# Update .env
# OLLAMA_MODEL=llama3.1:8b

# Restart nextjs to use new model
docker compose -f docker-compose.prod.yml restart nextjs
```

### Add New School

```bash
# Interactive mode
docker compose -f docker-compose.prod.yml exec nextjs npx tsx scripts/create-school.ts

# Or with environment variables
docker compose -f docker-compose.prod.yml exec -e SCHOOL_NAME="New School" -e SCHOOL_SLUG="newschool" -e ADMIN_EMAIL="admin@newschool.com" nextjs npx tsx scripts/create-school.ts
```

## Troubleshooting

### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Caddy automatically handles Let's Encrypt certificates
# If issues, verify:
# 1. DNS is pointing to your server
# 2. Ports 80 and 443 are open
# 3. Domain is not proxied through Cloudflare in "Full (strict)" mode during initial setup
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres
```

### Ollama Not Responding

```bash
# Check if ollama is running
docker compose -f docker-compose.prod.yml exec ollama ollama list

# Restart ollama
docker compose -f docker-compose.prod.yml restart ollama

# Check available memory
free -h
```

### Application Errors

```bash
# Check nextjs logs
docker compose -f docker-compose.prod.yml logs nextjs

# Restart application
docker compose -f docker-compose.prod.yml restart nextjs
```

## Security Checklist

- [ ] Changed default database password in `.env`
- [ ] Generated strong NEXTAUTH_SECRET (32+ characters)
- [ ] Enabled Cloudflare proxy for DDoS protection
- [ ] SSL/TLS set to "Full" in Cloudflare
- [ ] Firewall allows only ports 80, 443, and SSH

## Cost Summary

| Item | Cost |
|------|------|
| VPS (Hetzner CX32) | $8/mo |
| Domain | ~$10/yr |
| Cloudflare | Free |
| Ollama (AI) | Free |
| **Total** | **~$9/mo** |
