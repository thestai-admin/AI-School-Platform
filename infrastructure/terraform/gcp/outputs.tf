# AI School Platform - Terraform Outputs

output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.main.uri
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for Cloud Run"
  value       = google_sql_database_instance.main.connection_name
}

output "cloud_sql_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_url" {
  description = "Database connection URL (password not included)"
  value       = "postgresql://${var.db_user}:PASSWORD@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
  sensitive   = true
}

output "service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run.email
}

output "vpc_connector_id" {
  description = "VPC Access Connector ID"
  value       = google_vpc_access_connector.main.id
}

output "domain_mapping_status" {
  description = "Domain mapping status (if configured)"
  value       = var.domain != "" ? google_cloud_run_domain_mapping.main[0].status : null
}

output "dns_records" {
  description = "DNS records to configure at your registrar"
  value       = var.domain != "" ? google_cloud_run_domain_mapping.main[0].status[0].resource_records : null
}

# Cost estimation outputs
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    cloud_run       = "~$5-10 (with min_instances=1)"
    cloud_sql       = "~$9 (db-f1-micro)"
    vertex_ai       = "~$1-5 (pay per use)"
    load_balancer   = "~$18 (for custom domain)"
    total_estimated = "~$33-42/month"
    notes           = "With GCP startup credits ($2,300), this could be free for 55+ months"
  }
}
