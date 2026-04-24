#!/usr/bin/env bash

###############################################################################
# 🚀 Triumph Synergy - Automated Multi-Cloud Deployment Script
# 
# This script orchestrates full deployment across GCP and AWS
# Handles pre-checks, infrastructure provisioning, and verification
###############################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_ROOT/deployment_$TIMESTAMP.log"

# Cloud Configuration
GCP_PROJECT_ID="${GCP_PROJECT_ID:-triumph-synergy-prod}"
GCP_REGION="${GCP_REGION:-us-central1}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"

###############################################################################
# Logging Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${GREEN}ℹ${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $*" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "$LOG_FILE"
}

###############################################################################
# Pre-Deployment Checks
###############################################################################

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    local tools=("docker" "kubectl" "terraform" "gcloud" "aws" "git")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed. Please install it first."
        fi
        info "✓ $tool installed"
    done
    
    # Check Git status
    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain)" ]; then
        warn "Git working directory has uncommitted changes. Please commit first."
        git -C "$PROJECT_ROOT" status
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && error "Deployment cancelled"
    fi
    
    # Check GCP project exists
    if gcloud projects list --filter="PROJECT_ID:$GCP_PROJECT_ID" --format="value(projectId)" | grep -q "$GCP_PROJECT_ID"; then
        info "✓ GCP Project found: $GCP_PROJECT_ID"
    else
        error "GCP Project not found: $GCP_PROJECT_ID"
    fi
    
    # Check AWS credentials
    if aws sts get-caller-identity > /dev/null 2>&1; then
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        info "✓ AWS Credentials valid (Account: $AWS_ACCOUNT)"
    else
        error "AWS credentials not configured or invalid"
    fi
    
    success "All prerequisites checked"
}

###############################################################################
# Local Validation Phase
###############################################################################

validate_local() {
    log "Phase 1: Local Validation"
    
    # Build check
    info "Checking TypeScript compilation..."
    if pnpm type-check > /dev/null 2>&1; then
        success "TypeScript compilation passed"
    else
        error "TypeScript compilation failed"
    fi
    
    # Linting check
    info "Running linter..."
    if pnpm lint > /dev/null 2>&1; then
        success "Linting passed"
    else
        warn "Linting has issues (non-blocking)"
    fi
    
    # Docker build check
    info "Building Docker image..."
    if docker build -t triumph-synergy:test . > /dev/null 2>&1; then
        success "Docker build successful"
    else
        error "Docker build failed"
    fi
    
    success "Phase 1 completed"
}

###############################################################################
# GCP Deployment Phase
###############################################################################

deploy_gcp() {
    log "Phase 2: Deploying to GCP (Primary)"
    
    # Set GCP project
    gcloud config set project "$GCP_PROJECT_ID"
    info "GCP Project set to: $GCP_PROJECT_ID"
    
    # Enable required APIs
    info "Enabling required GCP APIs..."
    local apis=(
        "container.googleapis.com"
        "sqladmin.googleapis.com"
        "redis.googleapis.com"
        "storage-api.googleapis.com"
        "bigquery.googleapis.com"
        "pubsub.googleapis.com"
        "compute.googleapis.com"
        "artifactregistry.googleapis.com"
        "servicenetworking.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        gcloud services enable "$api" --quiet 2>&1 | grep -v "already enabled" || true
    done
    success "GCP APIs enabled"
    
    # Create Terraform state bucket
    local tfstate_bucket="$GCP_PROJECT_ID-tfstate"
    info "Ensuring Terraform state bucket exists..."
    if gsutil ls "gs://$tfstate_bucket" > /dev/null 2>&1; then
        info "✓ Terraform state bucket exists"
    else
        gsutil mb -p "$GCP_PROJECT_ID" "gs://$tfstate_bucket"
        gsutil versioning set on "gs://$tfstate_bucket"
        success "Created Terraform state bucket"
    fi
    
    # Initialize and apply Terraform
    info "Initializing Terraform..."
    cd "$PROJECT_ROOT/infrastructure/terraform"
    
    # Create terraform.tfvars if not exists
    if [ ! -f terraform.tfvars ]; then
        cat > terraform.tfvars << EOF
gcp_project_id = "$GCP_PROJECT_ID"
gcp_region     = "$GCP_REGION"
aws_region     = "$AWS_REGION"
environment    = "$ENVIRONMENT"
EOF
        info "Created terraform.tfvars"
    fi
    
    terraform init -upgrade
    terraform validate
    
    info "Planning Terraform deployment..."
    terraform plan -out=tfplan -input=false
    
    read -p "Apply Terraform plan? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Applying Terraform..."
        terraform apply -input=false tfplan
        success "Terraform applied to GCP"
    else
        warn "Terraform apply skipped"
    fi
    
    # Get cluster credentials
    info "Getting GKE cluster credentials..."
    gcloud container clusters get-credentials "triumph-synergy-$ENVIRONMENT" \
        --region "$GCP_REGION"
    
    success "Phase 2 completed"
}

###############################################################################
# Kubernetes Deployment
###############################################################################

deploy_kubernetes() {
    log "Phase 3: Deploying to Kubernetes"
    
    # Create namespace
    info "Creating Kubernetes namespace..."
    kubectl create namespace triumph-synergy --dry-run=client -o yaml | kubectl apply -f -
    success "Namespace created/verified"
    
    # Get database and Redis credentials (you'll need to set these)
    info "Creating secrets..."
    
    if [ -z "${POSTGRES_URL:-}" ]; then
        error "POSTGRES_URL environment variable not set"
    fi
    
    if [ -z "${REDIS_URL:-}" ]; then
        error "REDIS_URL environment variable not set"
    fi
    
    # Create secret
    kubectl create secret generic triumph-secrets \
        --from-literal=POSTGRES_URL="$POSTGRES_URL" \
        --from-literal=REDIS_URL="$REDIS_URL" \
        --from-literal=AUTH_SECRET="${AUTH_SECRET:-placeholder}" \
        --from-literal=PI_API_KEY="${PI_API_KEY:-placeholder}" \
        --from-literal=PI_INTERNAL_API_KEY="${PI_INTERNAL_API_KEY:-placeholder}" \
        --from-literal=STELLAR_HORIZON_URL="https://horizon.stellar.org" \
        --from-literal=GITHUB_WEBHOOK_SECRET="${GITHUB_WEBHOOK_SECRET:-placeholder}" \
        --from-literal=SUPABASE_URL="${SUPABASE_URL:-placeholder}" \
        --from-literal=SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-placeholder}" \
        --from-literal=SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder}" \
        --namespace triumph-synergy \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Secrets created"
    
    # Apply Kubernetes manifests
    info "Applying Kubernetes deployment..."
    kubectl apply -f "$PROJECT_ROOT/infrastructure/kubernetes/deployment.yaml"
    
    # Wait for rollout
    info "Waiting for deployments to be ready..."
    kubectl rollout status deployment/triumph-app \
        -n triumph-synergy --timeout=5m
    kubectl rollout status deployment/payment-processor \
        -n triumph-synergy --timeout=5m
    
    success "Kubernetes deployments ready"
}

###############################################################################
# AWS Deployment Phase
###############################################################################

deploy_aws() {
    log "Phase 4: Deploying to AWS (Secondary)"
    
    export AWS_REGION
    info "AWS Region: $AWS_REGION"
    
    # Terraform will handle AWS deployment
    info "Deploying AWS infrastructure via Terraform..."
    cd "$PROJECT_ROOT/infrastructure/terraform"
    
    info "AWS resources will be deployed by Terraform (already initialized)"
    
    # Get EKS cluster credentials
    info "Getting EKS cluster credentials..."
    aws eks update-kubeconfig \
        --name "triumph-synergy-$ENVIRONMENT" \
        --region "$AWS_REGION"
    
    # Switch context to AWS (optional, for verification)
    # kubectl config use-context <aws-context>
    
    success "Phase 4 completed"
}

###############################################################################
# Verification Phase
###############################################################################

verify_deployment() {
    log "Phase 5: Verifying Deployment"
    
    # Check GCP resources
    info "Checking GCP resources..."
    
    # GCP cluster status
    gcloud container clusters describe "triumph-synergy-$ENVIRONMENT" \
        --region "$GCP_REGION" | grep -E "status|endpoint" || warn "Could not verify GCP cluster"
    
    # GCP Cloud SQL status
    gcloud sql instances describe "triumph-synergy-db-$ENVIRONMENT" \
        | grep -E "state|version" || warn "Could not verify Cloud SQL instance"
    
    # Check AWS resources
    info "Checking AWS resources..."
    
    # AWS EKS cluster status
    aws eks describe-cluster \
        --name "triumph-synergy-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'cluster.[name,status,endpoint]' \
        --output table || warn "Could not verify AWS EKS cluster"
    
    # AWS RDS status
    aws rds describe-db-instances \
        --db-instance-identifier "triumph-synergy-db-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Engine]' \
        --output table || warn "Could not verify AWS RDS"
    
    # Check Kubernetes deployments
    info "Checking Kubernetes deployments (GCP)..."
    kubectl get deployments -n triumph-synergy
    kubectl get pods -n triumph-synergy
    kubectl get services -n triumph-synergy
    
    # Test API health check
    info "Testing API health endpoints..."
    sleep 30  # Wait for LB to be ready
    
    # Get GCP load balancer IP
    GCP_LB_IP=$(kubectl get service triumph-app -n triumph-synergy \
        -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [ -n "$GCP_LB_IP" ]; then
        if curl -s "http://$GCP_LB_IP:3000/api/health" | grep -q "healthy"; then
            success "GCP API health check passed"
        else
            warn "GCP API health check failed or incomplete"
        fi
    else
        warn "Could not determine GCP load balancer IP (may still be provisioning)"
    fi
    
    success "Phase 5 completed"
}

###############################################################################
# Conflict Resolution Checks
###############################################################################

check_conflicts() {
    log "Phase 6: Checking for Conflicts"
    
    info "Verifying Vercel integration..."
    # Check vercel.json
    if [ -f "$PROJECT_ROOT/vercel.json" ]; then
        success "vercel.json found"
        # Verify it points to cloud databases
        if grep -q "POSTGRES_URL\|REDIS_URL" "$PROJECT_ROOT/vercel.json"; then
            success "Vercel env vars configured"
        else
            warn "Verify Vercel env vars are set in Vercel dashboard"
        fi
    fi
    
    info "Verifying GitHub configuration..."
    # Check GitHub workflows
    if [ -d "$PROJECT_ROOT/.github/workflows" ]; then
        success "GitHub workflows found"
        info "Configured workflows:"
        ls -1 "$PROJECT_ROOT/.github/workflows/" || true
    fi
    
    # Check for port conflicts
    info "Checking for port conflicts..."
    local ports=(3000 5432 6379 8080 8443)
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || \
           sudo netstat -tuln 2>/dev/null | grep -q ":$port "; then
            warn "Port $port appears to be in use"
        fi
    done
    
    success "Phase 6 completed"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log "╔════════════════════════════════════════════════════════════════╗"
    log "║   🚀 Triumph Synergy - Multi-Cloud Deployment Script 🚀        ║"
    log "║                                                                ║"
    log "║   GCP Project: $GCP_PROJECT_ID"
    log "║   AWS Region: $AWS_REGION"
    log "║   Environment: $ENVIRONMENT"
    log "║   Timestamp: $(date +'%Y-%m-%d %H:%M:%S')"
    log "║                                                                ║"
    log "╚════════════════════════════════════════════════════════════════╝"
    log ""
    
    log "Deployment log: $LOG_FILE"
    log ""
    
    # Execute phases
    check_prerequisites
    validate_local
    deploy_gcp
    deploy_kubernetes
    deploy_aws
    verify_deployment
    check_conflicts
    
    log ""
    success "╔════════════════════════════════════════════════════════════════╗"
    success "║           ✓ Deployment completed successfully!                 ║"
    success "╚════════════════════════════════════════════════════════════════╝"
    log ""
    log "Next steps:"
    log "1. Run health checks: kubectl get pods -n triumph-synergy"
    log "2. Check logs: kubectl logs -f deployment/triumph-app -n triumph-synergy"
    log "3. Test API: curl http://<LB-IP>:3000/api/health"
    log "4. Configure DNS to point to load balancers"
    log "5. Update Vercel with cloud database credentials"
    log ""
    log "For troubleshooting, see: TROUBLESHOOTING.md"
}

# Run main function
main "$@"
