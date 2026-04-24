#!/usr/bin/env pwsh
# Triumph Synergy Production Deployment Script
# Complete deployment orchestration for all platforms

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('all', 'docker', 'vercel', 'gcp', 'aws', 'migrations')]
    [string]$Target = 'all',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false
)

Write-Host "🚀 Triumph Synergy Deployment Script" -ForegroundColor Cyan
Write-Host "Target: $Target" -ForegroundColor Yellow
Write-Host ""

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Functions
function Write-Step {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor Green
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Pre-flight checks
Write-Step "Running pre-flight checks..."

$requiredCommands = @('node', 'pnpm', 'docker', 'git')
$missingCommands = @()

foreach ($cmd in $requiredCommands) {
    if (-not (Test-Command $cmd)) {
        $missingCommands += $cmd
    }
}

if ($missingCommands.Count -gt 0) {
    Write-Error "Missing required commands: $($missingCommands -join ', ')"
    exit 1
}

Write-Success "All required commands are available"

# Check environment file
if (-not (Test-Path ".env.local")) {
    Write-Error ".env.local file not found. Please create it from .env.example"
    exit 1
}

Write-Success "Environment file exists"

# Run tests
if (-not $SkipTests) {
    Write-Step "Running tests..."
    
    try {
        pnpm test
        Write-Success "Tests passed"
    }
    catch {
        Write-Error "Tests failed"
        exit 1
    }
}

# Build application
if (-not $SkipBuild) {
    Write-Step "Building application..."
    
    try {
        pnpm build
        Write-Success "Build completed"
    }
    catch {
        Write-Error "Build failed"
        exit 1
    }
}

# Deploy based on target
switch ($Target) {
    'docker' {
        Write-Step "Deploying to Docker..."
        
        # Stop existing containers
        docker-compose down
        
        # Build and start new containers
        docker-compose up -d --build
        
        # Wait for health checks
        Write-Step "Waiting for services to be healthy..."
        Start-Sleep -Seconds 30
        
        # Check container status
        $containers = docker-compose ps -q
        if ($containers) {
            Write-Success "Docker deployment completed"
            docker-compose ps
        }
        else {
            Write-Error "Docker deployment failed"
            exit 1
        }
    }
    
    'vercel' {
        Write-Step "Deploying to Vercel..."
        
        if (-not (Test-Command 'vercel')) {
            Write-Error "Vercel CLI not installed. Run: npm install -g vercel"
            exit 1
        }
        
        # Deploy to production
        vercel --prod
        
        Write-Success "Vercel deployment initiated"
    }
    
    'gcp' {
        Write-Step "Deploying to Google Cloud Platform..."
        
        if (-not (Test-Command 'gcloud')) {
            Write-Error "gcloud CLI not installed"
            exit 1
        }
        
        if (-not (Test-Command 'kubectl')) {
            Write-Error "kubectl not installed"
            exit 1
        }
        
        # Build and push Docker image
        $projectId = $env:GCP_PROJECT_ID
        if (-not $projectId) {
            Write-Error "GCP_PROJECT_ID environment variable not set"
            exit 1
        }
        
        $imageTag = "gcr.io/$projectId/triumph-synergy:$(git rev-parse --short HEAD)"
        
        Write-Step "Building Docker image: $imageTag"
        docker build -t $imageTag .
        
        Write-Step "Pushing to Google Container Registry..."
        docker push $imageTag
        
        # Get GKE credentials
        $clusterName = $env:GKE_CLUSTER
        $region = $env:GCP_REGION
        
        if ($clusterName -and $region) {
            Write-Step "Getting GKE credentials..."
            gcloud container clusters get-credentials $clusterName --region $region
            
            # Update deployment
            Write-Step "Updating Kubernetes deployment..."
            kubectl set image deployment/triumph-app app=$imageTag -n triumph-synergy
            kubectl rollout status deployment/triumph-app -n triumph-synergy
            
            Write-Success "GCP deployment completed"
        }
        else {
            Write-Error "GKE_CLUSTER or GCP_REGION not set"
            exit 1
        }
    }
    
    'aws' {
        Write-Step "Deploying to Amazon Web Services..."
        
        if (-not (Test-Command 'aws')) {
            Write-Error "AWS CLI not installed"
            exit 1
        }
        
        if (-not (Test-Command 'kubectl')) {
            Write-Error "kubectl not installed"
            exit 1
        }
        
        # Update EKS kubeconfig
        $eksCluster = $env:EKS_CLUSTER
        $awsRegion = $env:AWS_REGION
        
        if ($eksCluster -and $awsRegion) {
            Write-Step "Updating EKS kubeconfig..."
            aws eks update-kubeconfig --name $eksCluster --region $awsRegion
            
            # Deploy to EKS
            $imageTag = "gcr.io/$env:GCP_PROJECT_ID/triumph-synergy:$(git rev-parse --short HEAD)"
            kubectl set image deployment/triumph-app app=$imageTag -n triumph-synergy
            kubectl rollout status deployment/triumph-app -n triumph-synergy
            
            Write-Success "AWS deployment completed"
        }
        else {
            Write-Error "EKS_CLUSTER or AWS_REGION not set"
            exit 1
        }
    }
    
    'migrations' {
        Write-Step "Running database migrations..."
        
        if (-not $env:SUPABASE_DB_URL) {
            Write-Error "SUPABASE_DB_URL environment variable not set"
            exit 1
        }
        
        try {
            pnpm db:migrate
            Write-Success "Migrations completed"
        }
        catch {
            Write-Error "Migrations failed"
            exit 1
        }
    }
    
    'all' {
        Write-Step "Deploying to all platforms..."
        
        # Deploy to Docker
        & $PSCommandPath -Target docker -SkipTests -SkipBuild
        
        # Deploy to Vercel
        & $PSCommandPath -Target vercel -SkipTests -SkipBuild
        
        # Run migrations
        & $PSCommandPath -Target migrations -SkipTests -SkipBuild
        
        Write-Success "All deployments completed"
    }
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Deployment Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Target: $Target" -ForegroundColor Yellow
Write-Host "Git Commit: $(git rev-parse --short HEAD)" -ForegroundColor Yellow
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

# Show deployment URLs
switch ($Target) {
    'vercel' {
        Write-Host "Vercel URLs:" -ForegroundColor Cyan
        Write-Host "  Production: https://triumph-synergy-jeremiah-drains-projects.vercel.app" -ForegroundColor White
    }
    'docker' {
        Write-Host "Docker URLs:" -ForegroundColor Cyan
        Write-Host "  Application: http://localhost:3000" -ForegroundColor White
        Write-Host "  Nginx: http://localhost:80" -ForegroundColor White
    }
    'gcp' {
        Write-Host "GCP URLs:" -ForegroundColor Cyan
        Write-Host "  Check Ingress: kubectl get ingress -n triumph-synergy" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
