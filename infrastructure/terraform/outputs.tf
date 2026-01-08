# AI School Platform - Terraform Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID for Route 53"
  value       = aws_lb.main.zone_id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgres.db_name
}

output "secrets_manager_arn" {
  description = "Secrets Manager ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.ecs.name
}

# Instructions for next steps
output "next_steps" {
  description = "Next steps after deployment"
  value       = <<-EOT

    ============================================
    AI School Platform - Deployment Complete!
    ============================================

    Next Steps:

    1. Build and push Docker image:
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}
       docker build -t ${aws_ecr_repository.app.repository_url}:latest .
       docker push ${aws_ecr_repository.app.repository_url}:latest

    2. Run database migrations:
       Connect to the database using a bastion host or VPN
       Run: npx prisma migrate deploy

    3. Configure DNS:
       Create A/ALIAS record pointing to ALB: ${aws_lb.main.dns_name}
       Create wildcard record: *.yourdomain.com -> ${aws_lb.main.dns_name}

    4. Set up SSL certificate in ACM:
       Request certificate for: yourdomain.com, *.yourdomain.com
       Validate via DNS
       Update acm_certificate_arn variable and uncomment HTTPS listener

    5. Access your application:
       ALB URL: http://${aws_lb.main.dns_name}
       (Use HTTPS after setting up certificate)

    ============================================
  EOT
}
