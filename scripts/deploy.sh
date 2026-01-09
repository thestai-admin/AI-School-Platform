#!/bin/bash

#===============================================================================
# AI School Platform - Production Deployment Script
#===============================================================================
# This script automates the deployment of AI School Platform to AWS
#
# Usage:
#   ./scripts/deploy.sh [command]
#
# Commands:
#   setup       - Install prerequisites and configure AWS
#   init        - Initialize Terraform and create infrastructure
#   deploy      - Build and deploy application to ECS
#   migrate     - Run database migrations
#   update      - Update existing deployment with new code
#   status      - Check deployment status
#   logs        - View application logs
#   destroy     - Destroy all infrastructure (DANGEROUS!)
#   full        - Run full deployment (init + deploy + migrate)
#
# Example:
#   ./scripts/deploy.sh full
#===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-south-1}"
PROJECT_NAME="${PROJECT_NAME:-ai-school}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
TERRAFORM_DIR="infrastructure/terraform"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed"
        return 1
    fi
    log_success "$1 is installed"
    return 0
}

#-------------------------------------------------------------------------------
# Prerequisites Check
#-------------------------------------------------------------------------------

check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    # Check AWS CLI
    if check_command "aws"; then
        # Check if configured
        if aws sts get-caller-identity &> /dev/null; then
            log_success "AWS CLI is configured"
            aws sts get-caller-identity --query 'Account' --output text
        else
            log_error "AWS CLI is not configured. Run 'aws configure'"
            missing=1
        fi
    else
        log_error "Install AWS CLI: https://aws.amazon.com/cli/"
        missing=1
    fi

    # Check Terraform
    if check_command "terraform"; then
        terraform version | head -n 1
    else
        log_error "Install Terraform: https://www.terraform.io/downloads"
        missing=1
    fi

    # Check Docker
    if check_command "docker"; then
        if docker info &> /dev/null; then
            log_success "Docker daemon is running"
        else
            log_error "Docker daemon is not running. Start Docker Desktop"
            missing=1
        fi
    else
        log_error "Install Docker: https://www.docker.com/products/docker-desktop"
        missing=1
    fi

    # Check Node.js
    if check_command "node"; then
        node --version
    else
        log_error "Install Node.js 18+: https://nodejs.org/"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        log_error "Missing prerequisites. Please install them and try again."
        exit 1
    fi

    log_success "All prerequisites met!"
}

#-------------------------------------------------------------------------------
# Setup Function
#-------------------------------------------------------------------------------

setup() {
    print_header "Setting Up Deployment Environment"

    check_prerequisites

    # Check if terraform.tfvars exists
    if [ ! -f "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars" ]; then
        log_info "Creating terraform.tfvars from template..."

        if [ -f "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars.example" ]; then
            cp "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars.example" \
               "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars"
        else
            create_tfvars_template
        fi

        log_warning "Please edit $TERRAFORM_DIR/terraform.tfvars with your configuration"
        log_warning "Required values:"
        echo "  - domain_name"
        echo "  - db_password"
        echo "  - nextauth_secret"
        echo "  - anthropic_api_key"
        echo ""
        log_info "Generate nextauth_secret with: openssl rand -base64 32"
        exit 0
    fi

    log_success "Setup complete!"
}

create_tfvars_template() {
    cat > "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars" << 'EOF'
# AI School Platform - Terraform Configuration
# Update these values before deployment

# AWS Configuration
aws_region  = "ap-south-1"  # Mumbai region (best for India)
environment = "prod"

# Domain Configuration (REQUIRED)
# Your domain name - school subdomains will be: school1.yourdomain.com
domain_name = "yourdomain.com"

# Database Configuration (REQUIRED)
# Use a strong password with uppercase, lowercase, numbers, and special characters
db_password = "CHANGE_ME_SecurePassword123!"

# Application Secrets (REQUIRED)
# Generate with: openssl rand -base64 32
nextauth_secret = "CHANGE_ME_generate_with_openssl_rand"

# Anthropic API Key (REQUIRED)
# Get from: https://console.anthropic.com/
anthropic_api_key = "sk-ant-CHANGE_ME"

# ECS Scaling Configuration
desired_count = 2   # Number of running tasks
min_capacity  = 2   # Minimum tasks (for high availability)
max_capacity  = 10  # Maximum tasks (for auto-scaling)

# Task Resources
task_cpu    = 512   # 0.5 vCPU
task_memory = 1024  # 1 GB RAM

# SSL Certificate ARN (optional - add after creating in ACM)
# acm_certificate_arn = "arn:aws:acm:ap-south-1:123456789:certificate/abc-123"
EOF
    log_success "Created terraform.tfvars template"
}

#-------------------------------------------------------------------------------
# Terraform Functions
#-------------------------------------------------------------------------------

terraform_init() {
    print_header "Initializing Terraform"

    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    # Check if tfvars exists and has been configured
    if [ ! -f "terraform.tfvars" ]; then
        log_error "terraform.tfvars not found. Run './scripts/deploy.sh setup' first"
        exit 1
    fi

    if grep -q "CHANGE_ME" terraform.tfvars; then
        log_error "terraform.tfvars contains placeholder values. Please update them."
        exit 1
    fi

    log_info "Initializing Terraform..."
    terraform init

    log_success "Terraform initialized!"
}

terraform_plan() {
    print_header "Planning Infrastructure Changes"

    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    log_info "Running terraform plan..."
    terraform plan -out=tfplan

    log_success "Plan created. Review the changes above."
}

terraform_apply() {
    print_header "Deploying Infrastructure"

    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    if [ ! -f "tfplan" ]; then
        log_info "No plan file found, creating one..."
        terraform plan -out=tfplan
    fi

    if confirm "Apply the terraform plan?"; then
        log_info "Applying infrastructure changes (this may take 10-15 minutes)..."
        terraform apply tfplan

        # Save outputs for later use
        terraform output -json > terraform_outputs.json

        log_success "Infrastructure deployed!"

        # Display important outputs
        echo ""
        log_info "Important outputs:"
        echo "  ECR Repository: $(terraform output -raw ecr_repository_url 2>/dev/null || echo 'N/A')"
        echo "  ALB DNS Name: $(terraform output -raw alb_dns_name 2>/dev/null || echo 'N/A')"
        echo "  RDS Endpoint: $(terraform output -raw rds_endpoint 2>/dev/null || echo 'N/A')"
    else
        log_warning "Deployment cancelled"
        exit 0
    fi
}

#-------------------------------------------------------------------------------
# Docker Functions
#-------------------------------------------------------------------------------

build_and_push_docker() {
    print_header "Building and Pushing Docker Image"

    cd "$PROJECT_ROOT"

    # Get ECR repository URL from Terraform output
    cd "$TERRAFORM_DIR"
    if [ ! -f "terraform_outputs.json" ]; then
        terraform output -json > terraform_outputs.json
    fi

    ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null)

    if [ -z "$ECR_URL" ]; then
        log_error "Could not get ECR repository URL. Is infrastructure deployed?"
        exit 1
    fi

    cd "$PROJECT_ROOT"

    log_info "ECR Repository: $ECR_URL"

    # Login to ECR
    log_info "Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_URL"

    # Build Docker image
    log_info "Building Docker image..."
    docker build -t "$PROJECT_NAME:latest" .

    # Tag and push
    log_info "Tagging image..."
    docker tag "$PROJECT_NAME:latest" "$ECR_URL:latest"
    docker tag "$PROJECT_NAME:latest" "$ECR_URL:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

    log_info "Pushing image to ECR..."
    docker push "$ECR_URL:latest"
    docker push "$ECR_URL:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

    log_success "Docker image pushed to ECR!"
}

#-------------------------------------------------------------------------------
# Database Functions
#-------------------------------------------------------------------------------

run_migrations() {
    print_header "Running Database Migrations"

    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    # Get RDS endpoint
    RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null)
    DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "ai_school")
    DB_USERNAME=$(terraform output -raw db_username 2>/dev/null || echo "ai_school_admin")

    if [ -z "$RDS_ENDPOINT" ]; then
        log_error "Could not get RDS endpoint. Is infrastructure deployed?"
        exit 1
    fi

    log_warning "To run migrations, you need database access."
    log_info "Options:"
    echo "  1. Temporarily allow your IP in RDS security group"
    echo "  2. Use a bastion host"
    echo "  3. Run migrations from ECS task"
    echo ""

    if confirm "Do you have direct database access configured?"; then
        read -p "Enter database password: " -s DB_PASSWORD
        echo ""

        export DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}/${DB_NAME}"

        cd "$PROJECT_ROOT"

        log_info "Running Prisma migrations..."
        npx prisma migrate deploy

        if confirm "Seed the database with initial data?"; then
            log_info "Seeding database..."
            npx tsx prisma/seed.ts
        fi

        log_success "Database migrations complete!"
    else
        log_info "Skipping migrations. Run them manually when database access is configured."
        echo ""
        echo "Manual migration command:"
        echo "  DATABASE_URL=\"postgresql://${DB_USERNAME}:<password>@${RDS_ENDPOINT}/${DB_NAME}\" npx prisma migrate deploy"
    fi
}

#-------------------------------------------------------------------------------
# ECS Functions
#-------------------------------------------------------------------------------

update_ecs_service() {
    print_header "Updating ECS Service"

    CLUSTER_NAME="${PROJECT_NAME}-cluster"
    SERVICE_NAME="${PROJECT_NAME}-service"

    log_info "Forcing new deployment..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --force-new-deployment \
        --region "$AWS_REGION"

    log_info "Waiting for service to stabilize..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION"

    log_success "ECS service updated!"
}

#-------------------------------------------------------------------------------
# Status & Monitoring Functions
#-------------------------------------------------------------------------------

check_status() {
    print_header "Checking Deployment Status"

    CLUSTER_NAME="${PROJECT_NAME}-cluster"
    SERVICE_NAME="${PROJECT_NAME}-service"

    # Check ECS service
    log_info "ECS Service Status:"
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
        --output table 2>/dev/null || log_warning "Could not get ECS status"

    # Check tasks
    log_info "Running Tasks:"
    aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'taskArns' \
        --output table 2>/dev/null || log_warning "Could not list tasks"

    # Check ALB health
    cd "$PROJECT_ROOT/$TERRAFORM_DIR"
    ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null)

    if [ -n "$ALB_DNS" ]; then
        log_info "Health Check:"
        HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/api/health" 2>/dev/null || echo "000")
        if [ "$HEALTH_STATUS" = "200" ]; then
            log_success "Health check passed (HTTP $HEALTH_STATUS)"
        else
            log_warning "Health check returned HTTP $HEALTH_STATUS"
        fi
        echo "  URL: http://$ALB_DNS/api/health"
    fi

    # Check RDS
    log_info "RDS Status:"
    aws rds describe-db-instances \
        --db-instance-identifier "${PROJECT_NAME}-db" \
        --region "$AWS_REGION" \
        --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address}' \
        --output table 2>/dev/null || log_warning "Could not get RDS status"
}

view_logs() {
    print_header "Viewing Application Logs"

    LOG_GROUP="/ecs/${PROJECT_NAME}"

    log_info "Fetching recent logs from CloudWatch..."
    aws logs tail "$LOG_GROUP" \
        --region "$AWS_REGION" \
        --since 1h \
        --follow 2>/dev/null || \
        log_error "Could not fetch logs. Log group: $LOG_GROUP"
}

#-------------------------------------------------------------------------------
# Destroy Function
#-------------------------------------------------------------------------------

destroy_infrastructure() {
    print_header "DESTROYING INFRASTRUCTURE"

    log_error "WARNING: This will destroy ALL resources including the database!"
    log_error "All data will be permanently lost!"
    echo ""

    if confirm "Are you absolutely sure you want to destroy everything?"; then
        read -p "Type 'destroy' to confirm: " CONFIRM

        if [ "$CONFIRM" = "destroy" ]; then
            cd "$PROJECT_ROOT/$TERRAFORM_DIR"

            log_info "Destroying infrastructure..."
            terraform destroy -auto-approve

            log_success "Infrastructure destroyed"
        else
            log_warning "Destruction cancelled"
        fi
    else
        log_warning "Destruction cancelled"
    fi
}

#-------------------------------------------------------------------------------
# Full Deployment
#-------------------------------------------------------------------------------

full_deployment() {
    print_header "Full Production Deployment"

    log_info "This will:"
    echo "  1. Check prerequisites"
    echo "  2. Initialize and apply Terraform"
    echo "  3. Build and push Docker image"
    echo "  4. Run database migrations"
    echo "  5. Update ECS service"
    echo ""

    if ! confirm "Continue with full deployment?"; then
        log_warning "Deployment cancelled"
        exit 0
    fi

    check_prerequisites
    terraform_init
    terraform_apply
    build_and_push_docker
    run_migrations
    update_ecs_service
    check_status

    print_header "Deployment Complete!"

    cd "$PROJECT_ROOT/$TERRAFORM_DIR"
    ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "N/A")

    echo ""
    log_success "Your application is deployed!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure your domain DNS to point to: $ALB_DNS"
    echo "  2. Request SSL certificate in AWS ACM"
    echo "  3. Update terraform.tfvars with certificate ARN"
    echo "  4. Run: ./scripts/deploy.sh update"
    echo ""
    echo "Test your deployment:"
    echo "  curl http://$ALB_DNS/api/health"
    echo ""
}

#-------------------------------------------------------------------------------
# Update Deployment (for code changes)
#-------------------------------------------------------------------------------

update_deployment() {
    print_header "Updating Deployment"

    build_and_push_docker
    update_ecs_service
    check_status

    log_success "Deployment updated!"
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------

show_usage() {
    echo "AI School Platform - Deployment Script"
    echo ""
    echo "Usage: ./scripts/deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup       - Check prerequisites and create config template"
    echo "  init        - Initialize Terraform"
    echo "  plan        - Show infrastructure changes"
    echo "  apply       - Apply infrastructure changes"
    echo "  deploy      - Build and push Docker image"
    echo "  migrate     - Run database migrations"
    echo "  update      - Update deployment with new code"
    echo "  status      - Check deployment status"
    echo "  logs        - View application logs"
    echo "  destroy     - Destroy all infrastructure"
    echo "  full        - Run full deployment"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION    - AWS region (default: ap-south-1)"
    echo "  PROJECT_NAME  - Project name (default: ai-school)"
    echo "  ENVIRONMENT   - Environment (default: prod)"
}

# Parse command
case "${1:-}" in
    setup)
        setup
        ;;
    init)
        terraform_init
        ;;
    plan)
        terraform_plan
        ;;
    apply)
        terraform_apply
        ;;
    deploy)
        build_and_push_docker
        ;;
    migrate)
        run_migrations
        ;;
    update)
        update_deployment
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs
        ;;
    destroy)
        destroy_infrastructure
        ;;
    full)
        full_deployment
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
