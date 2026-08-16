output "cluster_name" { value = module.eks.cluster_name }
output "configure_kubectl" { value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}" }
output "database_endpoint" { value = aws_db_instance.postgres.endpoint; sensitive = true }
output "redis_endpoint" { value = aws_elasticache_replication_group.redis.primary_endpoint_address; sensitive = true }
output "platform_secret_arn" { value = aws_secretsmanager_secret.platform.arn }
