# AI School Platform - Terraform Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "thestai-platform"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "ai-school"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-south1" # Mumbai - lowest latency for India
}

variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
  default     = "production"
}

variable "domain" {
  description = "Custom domain for the application"
  type        = string
  default     = "thestai.com"
}

# Cloud Run Configuration
variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "ai-school-platform"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 3
}

variable "cpu" {
  description = "CPU allocation for Cloud Run"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory allocation for Cloud Run"
  type        = string
  default     = "512Mi"
}

# Database Configuration
variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "ai-school-db"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ai_school"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "ai_school_user"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro" # Smallest instance ~$9/month
}

variable "db_disk_size" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 10
}

# AI Configuration
variable "vertex_ai_model" {
  description = "Vertex AI model to use"
  type        = string
  default     = "gemma-2-27b-it" # Open source, Apache 2.0
}

# Secrets (optional - can be set via Terraform or manually)
variable "nextauth_secret" {
  description = "NextAuth secret (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

