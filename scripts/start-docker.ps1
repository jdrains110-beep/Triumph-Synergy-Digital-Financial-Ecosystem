# Triumph Synergy - Quick Start Script
# Run with: .\scripts\start-docker.ps1

Write-Host "🚀 Starting Triumph Synergy Docker Infrastructure..." -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`n📋 Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Check for .env.local
Write-Host "`n📋 Checking environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found. Creating from example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.local"
    Write-Host "⚠️  Please update .env.local with your actual credentials" -ForegroundColor Yellow
}

# Stop any existing containers
Write-Host "`n🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null

# Pull latest images
Write-Host "`n📥 Pulling latest images..." -ForegroundColor Yellow
docker-compose pull

# Build services
Write-Host "`n🔨 Building services..." -ForegroundColor Yellow
docker-compose build --parallel

# Start services
Write-Host "`n🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to be healthy
Write-Host "`n⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service status
Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
docker-compose ps

# Display connection info
Write-Host "`n✅ Services are running!" -ForegroundColor Green
Write-Host "`n🌐 Access Points:" -ForegroundColor Cyan
Write-Host "  - Application:  http://localhost:3000" -ForegroundColor White
Write-Host "  - PostgreSQL:   localhost:5432" -ForegroundColor White
Write-Host "  - Redis:        localhost:6379" -ForegroundColor White
Write-Host "  - Nginx:        http://localhost:80" -ForegroundColor White

Write-Host "`n📝 Useful Commands:" -ForegroundColor Cyan
Write-Host "  - View logs:           docker-compose logs -f" -ForegroundColor White
Write-Host "  - Stop services:       docker-compose down" -ForegroundColor White
Write-Host "  - Restart service:     docker-compose restart [service-name]" -ForegroundColor White
Write-Host "  - Scale processors:    docker-compose up -d --scale payment-processor=10" -ForegroundColor White

Write-Host "`n🔗 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Configure GitHub webhook: https://github.com/[your-repo]/settings/hooks" -ForegroundColor White
Write-Host "  2. Add webhook URL: https://your-domain.com/api/contracts/webhook" -ForegroundColor White
Write-Host "  3. Set Pi Network API key in .env.local" -ForegroundColor White
Write-Host "  4. Deploy to production: vercel --prod" -ForegroundColor White

Write-Host "`n📖 Documentation: See DOCKER_INTEGRATION.md for full details" -ForegroundColor Yellow
Write-Host "`n✨ Triumph Synergy is ready!" -ForegroundColor Green
