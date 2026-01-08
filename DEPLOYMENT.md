# AWS Deployment Guide

This guide covers deploying AI School Platform to AWS for production use.

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                            │
                                    │                                                              │
    Users                           │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
      │                             │  │   Route 53   │    │  CloudFront  │    │     WAF      │  │
      │  school1.domain.com         │  │    (DNS)     │───▶│    (CDN)     │───▶│  (Firewall)  │  │
      │                             │  └──────────────┘    └──────────────┘    └──────────────┘  │
      ▼                             │                              │                              │
┌──────────────┐                    │                              ▼                              │
│   Browser    │────────────────────│         ┌────────────────────┴────────────────────┐         │
└──────────────┘                    │         │        Application Load Balancer        │         │
                                    │         └────────────────────┬────────────────────┘         │
                                    │                              │                              │
                                    │    ┌─────────────────────────┼─────────────────────────┐    │
                                    │    │              ECS Fargate Cluster               │    │
                                    │    │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │    │
                                    │    │  │ Task 1  │  │ Task 2  │  │ Task 3  │  Auto   │    │
                                    │    │  │Next.js  │  │Next.js  │  │Next.js  │ Scaling │    │
                                    │    │  └─────────┘  └─────────┘  └─────────┘         │    │
                                    │    └─────────────────────────┬─────────────────────────┘    │
                                    │                              │                              │
                                    │         ┌────────────────────┼────────────────────┐         │
                                    │         │                    │                    │         │
                                    │         ▼                    ▼                    ▼         │
                                    │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
                                    │  │   RDS        │    │   Secrets    │    │  S3 Bucket   │  │
                                    │  │ PostgreSQL   │    │   Manager    │    │   (Assets)   │  │
                                    │  │  (Multi-AZ)  │    │              │    │              │  │
                                    │  └──────────────┘    └──────────────┘    └──────────────┘  │
                                    │                                                              │
                                    └─────────────────────────────────────────────────────────────┘
                                                               │
                                                               │ API Calls
                                                               ▼
                                                    ┌──────────────────┐
                                                    │   Anthropic API  │
                                                    │     (Claude)     │
                                                    └──────────────────┘
```

## AWS Services Used

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| **Route 53** | DNS management, subdomain routing | ~$2 |
| **CloudFront** | CDN, SSL termination, caching | ~$20-50 |
| **WAF** | Web Application Firewall, DDoS protection | ~$10 |
| **ALB** | Load balancing, health checks | ~$25 |
| **ECS Fargate** | Serverless container hosting | ~$60-120 |
| **ECR** | Container registry | ~$5 |
| **RDS PostgreSQL** | Database (Multi-AZ) | ~$150 |
| **Secrets Manager** | Secure credential storage | ~$3 |
| **S3** | Static asset storage | ~$5-20 |
| **CloudWatch** | Logging and monitoring | ~$10 |
| **CodePipeline** | CI/CD automation | ~$5 |

**Total AWS Cost**: ~$300-400/month
**Claude API Cost**: ~$100-500/month (usage-based)
**Grand Total**: ~$400-900/month for 100 schools

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Terraform** installed (v1.0+)
4. **Docker** installed
5. **Domain name** with DNS access
6. **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com)

---

## Step 1: Configure AWS CLI

```bash
# Install AWS CLI (if not installed)
# macOS
brew install awscli

# Windows
winget install Amazon.AWSCLI

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Configure credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region (ap-south-1), and output format (json)
```

---

## Step 2: Install Terraform

```bash
# macOS
brew install terraform

# Windows
winget install Hashicorp.Terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify installation
terraform version
```

---

## Step 3: Configure Terraform Variables

```bash
cd infrastructure/terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Update `terraform.tfvars`:

```hcl
# AWS Configuration
aws_region  = "ap-south-1"  # Mumbai region for India
environment = "prod"

# Your domain (replace with your actual domain)
domain_name = "yourdomain.com"

# Database credentials (use a strong password!)
db_password = "YourSuperSecurePassword123!"

# Application secrets
nextauth_secret   = "generate-a-random-32-character-string-here"
anthropic_api_key = "sk-ant-your-anthropic-api-key"

# ECS scaling configuration
desired_count = 2   # Start with 2 tasks
min_capacity  = 2   # Minimum 2 for high availability
max_capacity  = 10  # Maximum 10 for scaling

# Task resources
task_cpu    = 512   # 0.5 vCPU
task_memory = 1024  # 1 GB RAM
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## Step 4: Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply changes (this will take 10-15 minutes)
terraform apply
```

**Important outputs to note:**
- `ecr_repository_url` - ECR URL for Docker images
- `alb_dns_name` - ALB URL for testing
- `rds_endpoint` - Database endpoint

---

## Step 5: Build and Push Docker Image

```bash
# Go to project root
cd ../..

# Get ECR login
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ECR_REPOSITORY_URL>

# Build Docker image
docker build -t ai-school-platform .

# Tag image
docker tag ai-school-platform:latest <ECR_REPOSITORY_URL>:latest

# Push to ECR
docker push <ECR_REPOSITORY_URL>:latest
```

Replace `<ECR_REPOSITORY_URL>` with the value from Terraform output.

---

## Step 6: Run Database Migrations

You need to connect to the database to run migrations. Options:

### Option A: Using a Bastion Host (Recommended for production)

1. Create an EC2 bastion host in the public subnet
2. SSH into the bastion
3. Run migrations from there

### Option B: Temporarily allow public access (Quick setup)

1. Temporarily modify RDS security group to allow your IP
2. Run migrations locally:

```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://ai_school_admin:<password>@<rds_endpoint>/ai_school"

# Run migrations
npx prisma migrate deploy

# Seed initial data
npx tsx prisma/seed.ts
```

3. Remove public access from RDS security group

---

## Step 7: Configure Domain and SSL

### Request ACM Certificate

1. Go to AWS Certificate Manager (ACM) in the console
2. Click "Request certificate"
3. Choose "Request a public certificate"
4. Add domain names:
   - `yourdomain.com`
   - `*.yourdomain.com` (wildcard for subdomains)
5. Choose DNS validation
6. Add the CNAME records to your DNS provider
7. Wait for validation (usually 5-30 minutes)

### Configure Route 53 (if using Route 53)

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)
```

Add DNS records:
- **A record**: `yourdomain.com` → ALB (alias)
- **A record**: `*.yourdomain.com` → ALB (alias)

### Update Terraform with Certificate ARN

Edit `terraform.tfvars`:
```hcl
acm_certificate_arn = "arn:aws:acm:ap-south-1:123456789:certificate/abc-123-def"
```

Uncomment the HTTPS listener in `main.tf` and reapply:
```bash
terraform apply
```

---

## Step 8: Update ECS Service

After pushing the Docker image, update the ECS service:

```bash
# Force new deployment
aws ecs update-service \
  --cluster ai-school-cluster \
  --service ai-school-service \
  --force-new-deployment \
  --region ap-south-1
```

---

## Step 9: Set Up CI/CD (Optional)

The repository includes `buildspec.yml` for AWS CodeBuild. To set up automated deployments:

1. **Create CodePipeline**:
   - Source: GitHub (connect your repository)
   - Build: CodeBuild (use the included buildspec.yml)
   - Deploy: ECS (rolling update)

2. **Configure GitHub webhook** for automatic deployments on push

3. **Environment variables** for CodeBuild:
   - `AWS_ACCOUNT_ID`
   - `AWS_DEFAULT_REGION`
   - `ECR_REPO_NAME`

---

## Step 10: Verify Deployment

1. **Check ECS tasks are running**:
   ```bash
   aws ecs list-tasks --cluster ai-school-cluster --region ap-south-1
   ```

2. **Check task health**:
   ```bash
   aws ecs describe-tasks \
     --cluster ai-school-cluster \
     --tasks <task-arn> \
     --region ap-south-1
   ```

3. **Test health endpoint**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

4. **Check CloudWatch logs**:
   - Go to CloudWatch → Log groups → `/ecs/ai-school`

---

## Multi-Tenancy: Adding Schools

Each school gets a subdomain (e.g., `greenvalley.yourdomain.com`).

### Create a new school:

```sql
INSERT INTO "School" (id, name, slug, "isActive", "createdAt", "updatedAt")
VALUES (
  'cuid_here',
  'Green Valley School',
  'greenvalley',
  true,
  NOW(),
  NOW()
);
```

### School Registration Flow:

1. Super admin creates school with unique slug
2. School admin account is created
3. School admin can add teachers, students, parents
4. Users access via `slug.yourdomain.com`

---

## Monitoring and Alerts

### CloudWatch Alarms (configured in Terraform):

- **CPU Utilization** > 80% for 5 minutes
- **Memory Utilization** > 80% for 5 minutes
- **Error Rate** > 5% for 5 minutes
- **Response Time** > 3 seconds for 5 minutes

### View metrics:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=ai-school-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

---

## Scaling

### Manual scaling:

```bash
aws ecs update-service \
  --cluster ai-school-cluster \
  --service ai-school-service \
  --desired-count 5 \
  --region ap-south-1
```

### Auto-scaling (configured in Terraform):

- **Scale out**: CPU > 70% for 2 minutes
- **Scale in**: CPU < 30% for 5 minutes
- **Min tasks**: 2
- **Max tasks**: 10

---

## Backup and Recovery

### Database backups (automated):

- **Retention**: 7 days
- **Backup window**: 03:00-04:00 UTC

### Manual snapshot:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier ai-school-db \
  --db-snapshot-identifier ai-school-manual-$(date +%Y%m%d) \
  --region ap-south-1
```

### Restore from snapshot:

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ai-school-db-restored \
  --db-snapshot-identifier <snapshot-identifier> \
  --region ap-south-1
```

---

## Security Best Practices

- [x] Database in private subnet (no public access)
- [x] Secrets in AWS Secrets Manager
- [x] HTTPS everywhere (ACM certificates)
- [x] WAF rules for common attacks
- [x] Security groups with least privilege
- [x] IAM roles with minimal permissions
- [x] Encryption at rest (RDS, S3)
- [x] CloudTrail logging enabled

---

## Troubleshooting

### ECS tasks not starting:

```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster ai-school-cluster \
  --tasks <task-arn> \
  --region ap-south-1 | jq '.tasks[0].stoppedReason'

# Check CloudWatch logs
aws logs tail /ecs/ai-school --follow
```

### Database connection issues:

1. Check security groups allow traffic from ECS
2. Verify DATABASE_URL in Secrets Manager
3. Check RDS is running: `aws rds describe-db-instances`

### SSL certificate issues:

1. Verify certificate is validated in ACM
2. Check certificate covers both domain and wildcard
3. Verify ALB listener uses correct certificate ARN

---

## Cost Optimization

1. **Use Fargate Spot** for non-critical workloads (70% savings)
2. **Reserved Instances** for RDS (up to 60% savings for 1-year commitment)
3. **Right-size instances** based on actual usage
4. **Enable S3 lifecycle policies** to move old data to cheaper storage
5. **Use CloudFront caching** to reduce origin requests

---

## Cleanup

To destroy all resources:

```bash
cd infrastructure/terraform

# Destroy all resources (WARNING: This deletes everything!)
terraform destroy
```

**Note**: This will delete the database and all data. Make sure to backup first!

---

## Support

For issues with:
- **Application code**: Check CloudWatch logs
- **Infrastructure**: Review Terraform state and AWS console
- **Database**: Check RDS logs and performance insights
- **Claude API**: Check Anthropic dashboard for usage and errors
