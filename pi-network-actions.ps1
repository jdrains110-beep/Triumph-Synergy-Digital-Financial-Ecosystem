# ==============================================================================
# Pi Network Container Actions - PowerShell
# ==============================================================================
# 
# Unified container management for Triumph Synergy + Central Node
# Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
#
# Usage:
#   .\pi-network-actions.ps1 [action] [service]
# ==============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'build', 'pull', 'clean', 'health', 'scale')]
    [string]$Action = 'status',
    
    [Parameter(Position=1)]
    [string]$Service,
    
    [Parameter(Position=2)]
    [int]$Replicas
)

# Configuration
$COMPOSE_FILE = "docker-compose.pi-network.yml"
$PROJECT_NAME = "pi-network-triumph-synergy"
$CENTRAL_NODE = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

# Service groups
$PI_INFRASTRUCTURE = @("pi-postgres", "pi-redis-cluster")
$PI_CORE_SERVICES = @("pi-central-node", "pi-triumph-app")
$PI_TRANSACTION_SERVICES = @("pi-transaction-engine", "pi-trillion-vault", "pi-smart-contracts", "pi-scp-upgrader")
$PI_SUPPORT_SERVICES = @("pi-payment-processor", "pi-nginx")
$PI_MONITORING = @("pi-prometheus", "pi-grafana")

function Write-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         PI NETWORK CONTAINER ACTIONS                           ║" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║  Central Node: " -ForegroundColor Cyan -NoNewline
    Write-Host "$CENTRAL_NODE" -ForegroundColor Yellow
    Write-Host "║  Project:      " -ForegroundColor Cyan -NoNewline
    Write-Host "$PROJECT_NAME" -ForegroundColor Blue
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Invoke-DockerCompose {
    param([string[]]$Args)
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME @Args
}

function Start-Services {
    param([string]$ServiceName)
    
    Write-Banner
    Write-Host "Starting Pi Network services..." -ForegroundColor Green
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Write-Host "`nPhase 1: Infrastructure" -ForegroundColor Blue
        Invoke-DockerCompose @('up', '-d') + $PI_INFRASTRUCTURE
        Start-Sleep -Seconds 5
        
        Write-Host "`nPhase 2: Core Services" -ForegroundColor Blue
        Invoke-DockerCompose @('up', '-d') + $PI_CORE_SERVICES
        Start-Sleep -Seconds 10
        
        Write-Host "`nPhase 3: Transaction Services" -ForegroundColor Blue
        Invoke-DockerCompose @('up', '-d') + $PI_TRANSACTION_SERVICES
        Start-Sleep -Seconds 5
        
        Write-Host "`nPhase 4: Support Services" -ForegroundColor Blue
        Invoke-DockerCompose @('up', '-d') + $PI_SUPPORT_SERVICES
        
        Write-Host "`nPhase 5: Monitoring" -ForegroundColor Blue
        Invoke-DockerCompose @('up', '-d') + $PI_MONITORING
    } else {
        Write-Host "Starting service: $ServiceName" -ForegroundColor Yellow
        Invoke-DockerCompose @('up', '-d', $ServiceName)
    }
    
    Write-Host "`n✓ Pi Network services started" -ForegroundColor Green
}

function Stop-Services {
    param([string]$ServiceName)
    
    Write-Banner
    Write-Host "Stopping Pi Network services..." -ForegroundColor Red
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Invoke-DockerCompose @('down')
    } else {
        Invoke-DockerCompose @('stop', $ServiceName)
    }
    
    Write-Host "`n✓ Services stopped" -ForegroundColor Green
}

function Restart-Services {
    param([string]$ServiceName)
    
    Write-Banner
    Write-Host "Restarting Pi Network services..." -ForegroundColor Yellow
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Stop-Services
        Start-Services
    } else {
        Invoke-DockerCompose @('restart', $ServiceName)
    }
    
    Write-Host "`n✓ Services restarted" -ForegroundColor Green
}

function Show-Status {
    param([string]$ServiceName)
    
    Write-Banner
    Write-Host "Pi Network Container Status" -ForegroundColor Cyan
    Write-Host ""
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Invoke-DockerCompose @('ps', '--format', 'table {{.Name}}\t{{.Status}}\t{{.Ports}}')
    } else {
        Invoke-DockerCompose @('ps', $ServiceName, '--format', 'table {{.Name}}\t{{.Status}}\t{{.Ports}}')
    }
    
    Write-Host ""
    Write-Host "Service Groups:" -ForegroundColor Cyan
    Write-Host "  Infrastructure: $($PI_INFRASTRUCTURE -join ', ')" -ForegroundColor Blue
    Write-Host "  Core:           $($PI_CORE_SERVICES -join ', ')" -ForegroundColor Blue
    Write-Host "  Transaction:    $($PI_TRANSACTION_SERVICES -join ', ')" -ForegroundColor Blue
    Write-Host "  Support:        $($PI_SUPPORT_SERVICES -join ', ')" -ForegroundColor Blue
    Write-Host "  Monitoring:     $($PI_MONITORING -join ', ')" -ForegroundColor Blue
}

function Show-Logs {
    param([string]$ServiceName)
    
    Write-Banner
    Write-Host "Showing logs..." -ForegroundColor Cyan
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Invoke-DockerCompose @('logs', '-f', '--tail=100')
    } else {
        Invoke-DockerCompose @('logs', '-f', '--tail=100', $ServiceName)
    }
}

function Build-Services {
    param([string]$ServiceName)
    
    Write-Banner
    Write-Host "Building Pi Network services..." -ForegroundColor Blue
    
    if ([string]::IsNullOrEmpty($ServiceName)) {
        Invoke-DockerCompose @('build', '--parallel')
    } else {
        Invoke-DockerCompose @('build', $ServiceName)
    }
    
    Write-Host "`n✓ Build complete" -ForegroundColor Green
}

function Pull-Images {
    Write-Banner
    Write-Host "Pulling latest images..." -ForegroundColor Blue
    Invoke-DockerCompose @('pull')
    Write-Host "`n✓ Images updated" -ForegroundColor Green
}

function Invoke-Cleanup {
    Write-Banner
    Write-Host "Cleaning up Pi Network resources..." -ForegroundColor Red
    
    Write-Host "`nStopping all containers..." -ForegroundColor Yellow
    Invoke-DockerCompose @('down', '-v', '--remove-orphans')
    
    Write-Host "`nRemoving dangling images..." -ForegroundColor Yellow
    docker image prune -f
    
    Write-Host "`nRemoving unused networks..." -ForegroundColor Yellow
    docker network prune -f
    
    Write-Host "`n✓ Cleanup complete" -ForegroundColor Green
}

function Test-Health {
    Write-Banner
    Write-Host "Pi Network Health Check" -ForegroundColor Cyan
    Write-Host ""
    
    $services = @{
        "pi-postgres" = 5432
        "pi-redis" = 6379
        "pi-central-node" = 11626
        "pi-triumph-app" = 3000
        "pi-transaction-engine" = 8080
        "pi-trillion-vault" = 8081
        "pi-smart-contracts" = 8082
        "pi-scp-upgrader" = 8083
        "pi-nginx" = 80
    }
    
    foreach ($svc in $services.GetEnumerator()) {
        $name = $svc.Key
        $port = $svc.Value
        
        $status = docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps $name 2>$null
        if ($status -match "Up") {
            Write-Host "  ✓ $name (port $port) - " -NoNewline
            Write-Host "HEALTHY" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $name (port $port) - " -NoNewline
            Write-Host "DOWN" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Central Node Status:" -ForegroundColor Cyan
    Write-Host "  Public Key: $CENTRAL_NODE" -ForegroundColor Yellow
}

function Set-ServiceScale {
    param([string]$ServiceName, [int]$ReplicaCount)
    
    Write-Banner
    
    if ([string]::IsNullOrEmpty($ServiceName) -or $ReplicaCount -le 0) {
        Write-Host "Usage: .\pi-network-actions.ps1 scale <service> <replicas>" -ForegroundColor Red
        return
    }
    
    Write-Host "Scaling $ServiceName to $ReplicaCount replicas..." -ForegroundColor Blue
    Invoke-DockerCompose @('up', '-d', '--scale', "$ServiceName=$ReplicaCount")
    Write-Host "`n✓ Scaled $ServiceName to $ReplicaCount replicas" -ForegroundColor Green
}

# Main
switch ($Action) {
    'start'   { Start-Services -ServiceName $Service }
    'stop'    { Stop-Services -ServiceName $Service }
    'restart' { Restart-Services -ServiceName $Service }
    'status'  { Show-Status -ServiceName $Service }
    'logs'    { Show-Logs -ServiceName $Service }
    'build'   { Build-Services -ServiceName $Service }
    'pull'    { Pull-Images }
    'clean'   { Invoke-Cleanup }
    'health'  { Test-Health }
    'scale'   { Set-ServiceScale -ServiceName $Service -ReplicaCount $Replicas }
    default   {
        Write-Banner
        Write-Host "Usage: .\pi-network-actions.ps1 <action> [service] [extra]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Actions:" -ForegroundColor Cyan
        Write-Host "  start   [service]     - Start all or specific service"
        Write-Host "  stop    [service]     - Stop all or specific service"
        Write-Host "  restart [service]     - Restart all or specific service"
        Write-Host "  status  [service]     - Show status"
        Write-Host "  logs    [service]     - Show logs (follows)"
        Write-Host "  build   [service]     - Build services"
        Write-Host "  pull                  - Pull latest images"
        Write-Host "  clean                 - Clean up everything"
        Write-Host "  health                - Health check all services"
        Write-Host "  scale   <svc> <num>   - Scale a service"
    }
}
