# Triumph Synergy Cloud Infrastructure as Code
# Terraform configuration for GCP and AWS multi-cloud setup

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
  
  backend "gcs" {
    bucket = "triumph-synergy-tfstate"
    prefix = "terraform/state"
  }
}

# Google Cloud Provider (Primary)
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# AWS Provider (Backup)
provider "aws" {
  region = var.aws_region
}

# Variables
variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev/staging/production)"
  type        = string
}

# GCP GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "triumph-synergy-${var.environment}"
  location = var.gcp_region
  
  # Node pool configuration
  initial_node_count = 3
  
  node_config {
    machine_type = "n2-standard-8"
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    labels = {
      environment = var.environment
      managed_by  = "terraform"
    }
  }
  
  # Auto-scaling
  cluster_autoscaling {
    enabled = true
    
    resource_limits {
      resource_type = "cpu"
      minimum       = 4
      maximum       = 100
    }
    
    resource_limits {
      resource_type = "memory"
      minimum       = 16
      maximum       = 400
    }
  }
  
  # Network policy
  network_policy {
    enabled = true
  }
  
  # Workload identity
  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }
  
  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }
}

# GCP Cloud SQL (PostgreSQL)
resource "google_sql_database_instance" "primary" {
  name             = "triumph-synergy-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.gcp_region
  
  settings {
    tier              = "db-n1-highmem-8"
    availability_type = "REGIONAL"
    disk_size         = 500
    disk_type         = "PD_SSD"
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.private.id
    }
    
    database_flags {
      name  = "max_connections"
      value = "1000"
    }
    
    database_flags {
      name  = "shared_buffers"
      value = "4194304" # 4GB
    }
  }
  
  deletion_protection = true
}

# GCP Memorystore Redis
resource "google_redis_instance" "cache" {
  name           = "triumph-synergy-redis-${var.environment}"
  tier           = "STANDARD_HA"
  memory_size_gb = 32
  region         = var.gcp_region
  
  redis_version     = "REDIS_7_0"
  display_name      = "Triumph Synergy Redis Cache"
  reserved_ip_range = "10.0.0.0/29"
  
  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }
}

# GCP Cloud Storage
resource "google_storage_bucket" "assets" {
  name     = "triumph-synergy-assets-${var.environment}"
  location = "US"
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# GCP BigQuery Dataset
resource "google_bigquery_dataset" "analytics" {
  dataset_id  = "triumph_synergy_analytics_${var.environment}"
  location    = "US"
  description = "Analytics data lake for Triumph Synergy"
  
  default_table_expiration_ms = 7776000000 # 90 days
  
  labels = {
    environment = var.environment
  }
}

# GCP Pub/Sub Topics
resource "google_pubsub_topic" "payments" {
  name = "triumph-payments-${var.environment}"
  
  message_retention_duration = "86400s" # 1 day
}

resource "google_pubsub_topic" "transactions" {
  name = "triumph-transactions-${var.environment}"
}

resource "google_pubsub_topic" "user_events" {
  name = "triumph-user-events-${var.environment}"
}

# AWS EKS Cluster (Backup)
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "triumph-synergy-backup-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 50
      
      instance_types = ["m5.2xlarge"]
      capacity_type  = "ON_DEMAND"
    }
  }
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }
}

# AWS RDS PostgreSQL (Backup)
resource "aws_db_instance" "backup" {
  identifier     = "triumph-synergy-db-backup-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  
  instance_class        = "db.r5.2xlarge"
  allocated_storage     = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  
  multi_az               = true
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  skip_final_snapshot = false
  final_snapshot_identifier = "triumph-synergy-final-snapshot-${var.environment}"
  
  deletion_protection = true
}

# AWS ElastiCache Redis (Backup)
resource "aws_elasticache_replication_group" "redis_backup" {
  replication_group_id       = "triumph-redis-${var.environment}"
  replication_group_description = "Triumph Synergy Redis cluster"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r5.2xlarge"
  num_cache_clusters   = 3
  
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  automatic_failover_enabled = true
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
}

# AWS S3 Buckets
resource "aws_s3_bucket" "backup" {
  bucket = "triumph-synergy-backup-${var.environment}"
  
  versioning {
    enabled = true
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  lifecycle_rule {
    enabled = true
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 2555 # 7 years
    }
  }
}

# Outputs
output "gke_cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cloudsql_connection_name" {
  value = google_sql_database_instance.primary.connection_name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "eks_cluster_endpoint" {
  value     = module.eks.cluster_endpoint
  sensitive = true
}

output "rds_endpoint" {
  value     = aws_db_instance.backup.endpoint
  sensitive = true
}
