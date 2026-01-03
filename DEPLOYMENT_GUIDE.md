# 🚀 Triumph Synergy - Multi-Cloud Deployment Guide

## Deployment Architecture

```
GitHub/Vercel (Frontend CDN) → API Gateway (Nginx/CloudFlare)
    ↓
GCP Primary (Active)
├── GKE Cluster (3-100 pods)
├── Cloud SQL (PostgreSQL 15)
├── Memorystore Redis
├── Cloud Storage
└── BigQuery

AWS Secondary (Failover)
├── EKS Cluster
├── RDS (PostgreSQL)
├── ElastiCache
└── S3

Cross-Platform Services
├── Stellar Consensus
├── Pi Network Integration
└── Multi-currency payments
```

## Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Google Cloud Project created (with billing enabled)
- [ ] AWS Account ready
- [ ] `gcloud` CLI installed and configured
- [ ] `aws` CLI installed and configured
- [ ] `kubectl` installed
- [ ] `terraform` >= 1.0 installed
- [ ] Docker Desktop running

### 2. Git & GitHub
- [ ] Code committed to main branch
- [ ] No uncommitted changes
- [ ] GitHub Actions workflows configured
- [ ] Webhook secrets configured

### 3. Environment Variables
- [ ] Production secrets generated
- [ ] Database credentials prepared
- [ ] API keys secured in vault
- [ ] Domain SSL certificates ready

---

## Phase 1: Local Validation (Pre-Cloud)

### Step 1: Docker Compose Test
```bash
# Start all services locally
pnpm docker:build
docker-compose up -d

# Verify all services are healthy
docker-compose ps
docker-compose logs -f

# Run health checks
curl http://localhost:3000/api/health
curl http://localhost:5432 (should fail gracefully)
curl http://localhost:6379 (should fail gracefully)

# Test API endpoints
curl http://localhost:3000/api/pi/value
curl http://localhost:3000/api/stellar/consensus
```

### Step 2: Database Migrations
```bash
# Apply migrations locally
export POSTGRES_URL="postgresql://postgres:password@localhost:5432/triumph_synergy"
pnpm db:migrate

# Verify schema
psql $POSTGRES_URL -c "\dt"
```

### Step 3: Build Verification
```bash
# Ensure production build is clean
pnpm clean
pnpm install
pnpm build

# Check for any TypeScript errors
pnpm type-check

# Run tests
pnpm test
pnpm test:e2e
```

---

## Phase 2: GCP Deployment (Primary)

### Step 1: GCP Project Setup
```bash
# Set variables
export GCP_PROJECT_ID="triumph-synergy-prod"
export GCP_REGION="us-central1"
export GCP_ZONE="us-central1-a"

# Create project
gcloud projects create $GCP_PROJECT_ID
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Create Terraform State Bucket
```bash
# Create GCS bucket for Terraform state
gsutil mb gs://triumph-synergy-tfstate-prod/

# Enable versioning
gsutil versioning set on gs://triumph-synergy-tfstate-prod/

# Lock down access
gsutil iam ch serviceAccount:$(gcloud config get-value core/project)@cloudbuild.gserviceaccount.com:roles/storage.admin gs://triumph-synergy-tfstate-prod/
```

### Step 3: Initialize Terraform
```bash
# Navigate to infrastructure directory
cd infrastructure/terraform

# Create terraform.tfvars
cat > terraform.tfvars << EOF
gcp_project_id = "$GCP_PROJECT_ID"
gcp_region     = "$GCP_REGION"
aws_region     = "us-east-1"
environment    = "production"
EOF

# Initialize Terraform
terraform init -upgrade

# Validate configuration
terraform validate

# Plan deployment
terraform plan -out=tfplan
```

### Step 4: Deploy GCP Infrastructure
```bash
# Apply Terraform configuration
terraform apply tfplan

# Get GKE cluster credentials
gcloud container clusters get-credentials triumph-synergy-production --region $GCP_REGION

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Step 5: Deploy Kubernetes Services
```bash
# Apply Kubernetes manifests
kubectl apply -f ../kubernetes/deployment.yaml

# Create secrets (replace with real values)
kubectl create secret generic triumph-secrets \
  --from-literal=POSTGRES_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=PI_API_KEY="..." \
  --from-literal=AUTH_SECRET="..." \
  -n triumph-synergy

# Verify deployments
kubectl get deployments -n triumph-synergy
kubectl get pods -n triumph-synergy
kubectl get svc -n triumph-synergy

# Wait for rollout
kubectl rollout status deployment/triumph-app -n triumph-synergy
kubectl rollout status deployment/payment-processor -n triumph-synergy
```

### Step 6: Configure Cloud SQL Proxy
```bash
# Get Cloud SQL instance connection name
export CLOUDSQL_INSTANCE=$(gcloud sql instances list --filter="name:triumph-synergy-db" --format="value(connectionName)")

# Create service account for Cloud SQL proxy
gcloud iam service-accounts create triumph-cloudsql-proxy \
  --display-name="Cloud SQL Proxy for Triumph Synergy"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member=serviceAccount:triumph-cloudsql-proxy@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/cloudsql.client

# Deploy Cloud SQL Proxy as sidecar (already in deployment.yaml)
```

### Step 7: Configure Redis Memorystore
```bash
# Get Redis endpoint
export REDIS_HOST=$(gcloud redis instances describe triumph-redis \
  --region $GCP_REGION \
  --format='value(host)')
export REDIS_PORT=$(gcloud redis instances describe triumph-redis \
  --region $GCP_REGION \
  --format='value(port)')

# Update Kubernetes secret
kubectl patch secret triumph-secrets -n triumph-synergy \
  -p "{\"data\":{\"REDIS_URL\":\"$(echo -n "redis://$REDIS_HOST:$REDIS_PORT" | base64)\"}}"
```

---

## Phase 3: AWS Deployment (Secondary/Failover)

### Step 1: AWS Setup
```bash
# Set variables
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Configure AWS credentials
aws configure

# Enable required services
aws ec2 describe-regions --region-names us-east-1 > /dev/null
aws rds describe-db-instances --region $AWS_REGION > /dev/null
aws elasticache describe-cache-clusters --region $AWS_REGION > /dev/null
```

### Step 2: Deploy to AWS via Terraform
```bash
# Terraform will deploy EKS, RDS, ElastiCache, S3
terraform apply -auto-approve

# Get EKS cluster credentials
aws eks update-kubeconfig \
  --name triumph-synergy-production \
  --region $AWS_REGION

# Verify AWS cluster access
kubectl cluster-info
kubectl get nodes
```

### Step 3: Deploy Kubernetes Services to AWS
```bash
# Apply same Kubernetes manifests to AWS EKS
kubectl apply -f ../kubernetes/deployment.yaml

# Create secrets with AWS-specific endpoints
kubectl create secret generic triumph-secrets \
  --from-literal=POSTGRES_URL="..." \
  --from-literal=REDIS_URL="..." \
  -n triumph-synergy
```

---

## Phase 4: Cross-Platform Configuration

### Step 1: Set Up Service Discovery
```bash
# Create DNS records
# Primary:  triumph-synergy-prod.gcp.com → GCP LB IP
# Secondary: triumph-synergy-prod.aws.com → AWS LB IP
# Failover: triumph-synergy-prod.com → Primary (with failover to Secondary)

# Example Route53 setup (AWS DNS)
aws route53 create-hosted-zone --name triumph-synergy-prod.com

# Example Cloud DNS setup (GCP)
gcloud dns managed-zones create triumph-synergy-prod \
  --dns-name triumph-synergy-prod.com
```

### Step 2: Configure Health Checks
```bash
# GCP Health Check
gcloud compute health-checks create http triumph-app-health \
  --port 3000 \
  --request-path /api/health \
  --check-interval 10s \
  --timeout 5s

# AWS Health Check (via AWS CLI)
aws elbv2 create-target-group \
  --name triumph-app \
  --protocol HTTP \
  --port 3000 \
  --health-check-enabled
```

### Step 3: Set Up Load Balancing
```bash
# GCP Cloud Load Balancer
gcloud compute backend-services create triumph-app-backend \
  --global \
  --protocol HTTP \
  --health-checks triumph-app-health

# AWS ALB (created by Terraform)
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerArn,DNSName]'
```

### Step 4: Enable Cross-Platform Replication
```bash
# Database Replication Setup
# PostgreSQL replication from GCP to AWS (read-replica)
# Done via Terraform in infrastructure/terraform/main.tf

# Redis Replication Setup
# Sentinel nodes configured for automatic failover
# Already configured in deployment.yaml

# BigQuery → AWS Redshift Sync (optional)
# Can use Dataflow or Glue for ETL
```

---

## Phase 5: Vercel & GitHub Integration

### Step 1: Verify Vercel Configuration
```bash
# Check vercel.json is correct
cat vercel.json

# Key settings:
# - buildCommand: "pnpm build"
# - installCommand: "pnpm install"
# - outputDirectory: ".next"
# - env vars point to CLOUD databases, not local

# Ensure no conflicts:
# - POSTGRES_URL in Vercel should point to GCP Cloud SQL (primary) or AWS RDS (backup)
# - REDIS_URL in Vercel should point to GCP Memorystore or AWS ElastiCache
```

### Step 2: Configure GitHub Actions
```bash
# Create deployment secrets in GitHub:
# Settings → Secrets and variables → Actions

# Required secrets:
# - GCP_PROJECT_ID
# - GCP_SERVICE_ACCOUNT_KEY
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - KUBECONFIG (for kubectl deployments)
# - DOCKER_REGISTRY_TOKEN
# - DATABASE_PASSWORD
# - REDIS_PASSWORD
# - PI_API_KEY
# - STELLAR_HORIZON_KEY
```

### Step 3: Set Up Continuous Deployment
```bash
# GitHub Actions workflow already configured in .github/workflows/
# Workflow triggers:
# 1. Push to main → Build & Test → Deploy to GCP primary
# 2. Push to staging → Deploy to AWS secondary
# 3. Manual trigger available for database migrations

# Verify workflows
gh workflow list
```

### Step 4: Configure Webhooks
```bash
# GitHub webhook for smart contracts (GitHub → Stellar)
# Configured at: /api/contracts/webhook

# Vercel deployment webhooks
# Configure in Vercel dashboard: Project → Integrations → Webhooks

# Pi Network webhooks
# Already integrated in app configuration
```

---

## Phase 6: Monitoring & Health Checks

### Step 1: Deploy Monitoring
```bash
# GCP Monitoring (Cloud Monitoring)
gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.yaml

# AWS CloudWatch
aws cloudwatch put-dashboard \
  --dashboard-name triumph-synergy-dashboard \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Step 2: Set Up Alerts
```bash
# GCP Alerts
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="App Error Rate High"

# AWS Alarms
aws cloudwatch put-metric-alarm \
  --alarm-name triumph-app-cpu-high \
  --alarm-actions arn:aws:sns:region:account:topic
```

### Step 3: Configure Logging
```bash
# GCP Cloud Logging
gcloud logging create triumph-app \
  --description="Triumph Synergy Application Logs"

# AWS CloudLogs
aws logs create-log-group --log-group-name /triumph-synergy/app
```

### Step 4: Health Check Endpoints
```bash
# Verify all services respond to health checks
curl https://triumph-synergy-prod.gcp.com/api/health
curl https://triumph-synergy-prod.aws.com/api/health
curl https://triumph-synergy-prod.com/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2026-01-02T...",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "stellar": "online",
#     "pi_network": "online"
#   }
# }
```

---

## Phase 7: Conflict Resolution

### Ensuring No Interference

1. **Database Isolation**
   - GCP: triumph-synergy (primary write)
   - AWS: triumph-synergy (read-replica)
   - Vercel: Reads from GCP (primary), fails over to AWS if needed
   - GitHub: No direct DB access (CI/CD only)

2. **API Isolation**
   - GCP: triumph-synergy-prod.gcp.com (primary)
   - AWS: triumph-synergy-prod.aws.com (secondary)
   - CDN/DNS: triumph-synergy-prod.com (routes to primary)
   - Vercel preview: *.vercel.app (isolated preview environment)

3. **Authentication Isolation**
   - NEXTAUTH_URL: https://triumph-synergy-prod.com (single source)
   - GitHub OAuth: Configured for primary domain
   - Session storage: Redis cluster (shared across all platforms)

4. **Secrets Management**
   - GCP Secret Manager: Database passwords, API keys
   - AWS Secrets Manager: Backup credentials
   - GitHub Secrets: CI/CD only (cannot access production secrets)
   - Vercel Environment: Points to cloud resources, not local

---

## Phase 8: Verification & Testing

### Step 1: Connectivity Tests
```bash
# Test all endpoints
for endpoint in gcp aws; do
  echo "Testing $endpoint..."
  curl -s https://triumph-synergy-prod.$endpoint.com/api/health | jq .
done

# Test database connections
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL -c "SELECT version();"

# Test Redis connections
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u $REDIS_URL ping
```

### Step 2: Failover Testing
```bash
# Simulate GCP outage
kubectl scale deployment/triumph-app --replicas=0 -n triumph-synergy

# Verify traffic routes to AWS
curl https://triumph-synergy-prod.com/api/health

# Restore GCP
kubectl scale deployment/triumph-app --replicas=3 -n triumph-synergy
```

### Step 3: Data Consistency Testing
```bash
# Write test data to GCP
curl -X POST https://triumph-synergy-prod.gcp.com/api/test-data \
  -d '{"test": "data"}'

# Verify replication to AWS
curl https://triumph-synergy-prod.aws.com/api/test-data
```

### Step 4: Performance Testing
```bash
# Load test with k6
k6 run tests/load-test.js --vus 100 --duration 30s

# Check metrics
kubectl top nodes -n triumph-synergy
kubectl top pods -n triumph-synergy
```

---

## Rollback Procedures

### If GCP Deployment Fails
```bash
# Rollback Terraform
terraform destroy -auto-approve

# Destroy Kubernetes resources
kubectl delete namespace triumph-synergy

# Keep AWS running as primary
# Update DNS to point to AWS
```

### If Database Migration Fails
```bash
# Point to previous database snapshot
# GCP: Use Cloud SQL backups
gcloud sql backups list --instance=triumph-synergy-db

# AWS: Use RDS snapshots
aws rds describe-db-snapshots --db-instance-identifier triumph-synergy-db

# Restore specific snapshot
gcloud sql backups restore SNAPSHOT_ID \
  --backup-instance=triumph-synergy-db
```

### If Kubernetes Deployment Fails
```bash
# Rollback deployment
kubectl rollout undo deployment/triumph-app -n triumph-synergy

# Check previous versions
kubectl rollout history deployment/triumph-app -n triumph-synergy
```

---

## Post-Deployment Checklist

- [ ] All services healthy (kubectl get pods)
- [ ] Database accessible and migrated
- [ ] Redis cache operational
- [ ] API endpoints responding
- [ ] Stellar network connected
- [ ] Pi Network integration working
- [ ] Vercel deployment successful
- [ ] GitHub Actions passing
- [ ] Monitoring/logging active
- [ ] Alerts configured
- [ ] Backup procedures tested
- [ ] Failover procedures tested
- [ ] Performance baseline established
- [ ] Security audit completed
- [ ] Documentation updated

---

## Support & Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

**Deployment Status**: Ready for execution
**Last Updated**: January 2, 2026
**Next Steps**: Execute Phase 1-8 in order
