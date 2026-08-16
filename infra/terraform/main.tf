data "aws_availability_zones" "available" { state = "available" }

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"; version = "5.21.0"
  name = "${var.cluster_name}-${var.environment}"; cidr = "10.42.0.0/16"; azs = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = ["10.42.0.0/20", "10.42.16.0/20", "10.42.32.0/20"]
  public_subnets  = ["10.42.128.0/24", "10.42.129.0/24", "10.42.130.0/24"]
  enable_nat_gateway = true; single_nat_gateway = var.environment != "prod"; enable_dns_hostnames = true
  public_subnet_tags = { "kubernetes.io/role/elb" = 1 }; private_subnet_tags = { "kubernetes.io/role/internal-elb" = 1 }
}

module "eks" {
  source = "terraform-aws-modules/eks/aws"; version = "20.37.2"
  cluster_name = "${var.cluster_name}-${var.environment}"; cluster_version = "1.32"; cluster_endpoint_public_access = true
  vpc_id = module.vpc.vpc_id; subnet_ids = module.vpc.private_subnets; enable_cluster_creator_admin_permissions = true
  eks_managed_node_groups = { application = { instance_types = ["t3.medium"]; min_size = 2; max_size = 6; desired_size = 2; capacity_type = "ON_DEMAND" } }
  cluster_addons = { coredns = {}; kube-proxy = {}; vpc-cni = {}; aws-ebs-csi-driver = {} }
}

resource "random_password" "database" { length = 32; special = false }
resource "aws_db_subnet_group" "main" { name = "${var.cluster_name}-${var.environment}"; subnet_ids = module.vpc.private_subnets }
resource "aws_security_group" "data" { name = "${var.cluster_name}-data"; vpc_id = module.vpc.vpc_id; ingress { from_port = 0; to_port = 65535; protocol = "tcp"; cidr_blocks = [module.vpc.vpc_cidr_block] }; egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] } }
resource "aws_db_instance" "postgres" {
  identifier = "${var.cluster_name}-${var.environment}"; engine = "postgres"; engine_version = "16.4"; instance_class = var.db_instance_class
  allocated_storage = 20; max_allocated_storage = 100; db_name = "meridian"; username = "meridian"; password = random_password.database.result
  db_subnet_group_name = aws_db_subnet_group.main.name; vpc_security_group_ids = [aws_security_group.data.id]; storage_encrypted = true
  backup_retention_period = var.environment == "prod" ? 14 : 1; multi_az = var.environment == "prod"; skip_final_snapshot = var.environment != "prod"; deletion_protection = var.environment == "prod"
}

resource "aws_elasticache_subnet_group" "main" { name = "${var.cluster_name}-${var.environment}"; subnet_ids = module.vpc.private_subnets }
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.cluster_name}-${var.environment}"; description = "Meridian cart and pricing cache"; node_type = "cache.t4g.micro"; port = 6379
  subnet_group_name = aws_elasticache_subnet_group.main.name; security_group_ids = [aws_security_group.data.id]; at_rest_encryption_enabled = true; transit_encryption_enabled = true
  automatic_failover_enabled = var.environment == "prod"; num_cache_clusters = var.environment == "prod" ? 2 : 1
}

resource "aws_msk_serverless_cluster" "events" {
  cluster_name = "${var.cluster_name}-${var.environment}"
  vpc_config { subnet_ids = module.vpc.private_subnets; security_group_ids = [aws_security_group.data.id] }
  client_authentication { sasl { iam { enabled = true } } }
}

resource "aws_secretsmanager_secret" "platform" { name = "${var.cluster_name}/${var.environment}/platform" }
resource "aws_secretsmanager_secret_version" "platform" { secret_id = aws_secretsmanager_secret.platform.id; secret_string = jsonencode({ database_url = "postgresql://meridian:${random_password.database.result}@${aws_db_instance.postgres.endpoint}/meridian", redis_endpoint = aws_elasticache_replication_group.redis.primary_endpoint_address, kafka_bootstrap = aws_msk_serverless_cluster.events.bootstrap_brokers_sasl_iam }) }
