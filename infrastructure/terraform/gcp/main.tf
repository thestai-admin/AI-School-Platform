# AI School Platform - GCP Infrastructure
# Terraform configuration for deploying to Google Cloud Platform

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Uncomment to use GCS backend for state
  # backend "gcs" {
  #   bucket = "thestai-terraform-state"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "aiplatform.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "containerregistry.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# Generate random password for database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "main" {
  name             = var.db_instance_name
  database_version = "POSTGRES_15"
  region           = var.region

  deletion_protection = var.environment == "production"

  settings {
    tier              = var.db_tier
    disk_size         = var.db_disk_size
    disk_type         = "PD_SSD"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.environment == "production"
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_vpc_connection,
  ]
}

# Database
resource "google_sql_database" "main" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

# Database User
resource "google_sql_user" "main" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

# VPC Network for private Cloud SQL
resource "google_compute_network" "main" {
  name                    = "${var.project_name}-network"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

# Subnet
resource "google_compute_subnetwork" "main" {
  name          = "${var.project_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# Private IP range for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

# Private VPC connection for Cloud SQL
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Serverless VPC Access Connector (for Cloud Run to access Cloud SQL)
resource "google_vpc_access_connector" "main" {
  name          = "${var.project_name}-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.main.name

  depends_on = [google_project_service.apis]
}

# Secret Manager - NEXTAUTH_SECRET
resource "google_secret_manager_secret" "nextauth_secret" {
  secret_id = "NEXTAUTH_SECRET"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "nextauth_secret" {
  secret      = google_secret_manager_secret.nextauth_secret.id
  secret_data = var.nextauth_secret != "" ? var.nextauth_secret : random_password.nextauth_secret.result
}

resource "random_password" "nextauth_secret" {
  length  = 32
  special = false
}

# Secret Manager - DATABASE_PASSWORD
resource "google_secret_manager_secret" "db_password" {
  secret_id = "DATABASE_PASSWORD"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "main" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "ALL_TRAFFIC"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    containers {
      image = "gcr.io/${var.project_id}/${var.service_name}:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GCP_LOCATION"
        value = var.region
      }

      env {
        name  = "VERTEX_AI_MODEL"
        value = var.vertex_ai_model
      }

      env {
        name  = "NEXTAUTH_URL"
        value = "https://${var.domain}"
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:$${DATABASE_PASSWORD}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name  = "DIRECT_URL"
        value = "postgresql://${var.db_user}:$${DATABASE_PASSWORD}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.nextauth_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "DATABASE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
    }

    service_account = google_service_account.cloud_run.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.nextauth_secret,
    google_secret_manager_secret_version.db_password,
  ]
}

# Service Account for Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "${var.project_name}-cloudrun"
  display_name = "AI School Platform Cloud Run Service Account"
}

# IAM - Allow Cloud Run to access secrets
resource "google_secret_manager_secret_iam_member" "nextauth_secret_access" {
  secret_id = google_secret_manager_secret.nextauth_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_secret_manager_secret_iam_member" "db_password_access" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}

# IAM - Allow Cloud Run to use Cloud SQL
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# IAM - Allow Cloud Run to use Vertex AI
resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Allow unauthenticated access to Cloud Run
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.main.location
  name     = google_cloud_run_v2_service.main.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Domain mapping (optional)
resource "google_cloud_run_domain_mapping" "main" {
  count    = var.domain != "" ? 1 : 0
  location = var.region
  name     = var.domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.main.name
  }

  depends_on = [google_cloud_run_v2_service.main]
}
