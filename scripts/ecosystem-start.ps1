# ==========================================================================
# TRIUMPH SYNERGY — Ecosystem Startup
# ==========================================================================
# Ensures the Pi Mainnet Node (triumph-pi-mainnet-node) is running and
# connected BEFORE starting the Triumph Synergy ecosystem. Mainnet-only.
#
# USAGE:
#   .\scripts\ecosystem-start.ps1             # Normal start
#   .\scripts\ecosystem-start.ps1 -Build      # Rebuild and start
# ==========================================================================

param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$piNodeContainer = "triumph-pi-mainnet-node"
$composeDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Write-Step($msg) {
    Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
}

# ── Phase 1: Ensure Pi Mainnet Node is running ──
Write-Step "Phase 1: Pi Mainnet Node ($piNodeContainer)"

$nodeStatus = docker inspect --format "{{.State.Status}}" $piNodeContainer 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "$piNodeContainer not yet started — compose will start it"
} else {
    if ($nodeStatus -ne "running") {
        Write-Warn "$piNodeContainer is '$nodeStatus' — starting..."
        docker start $piNodeContainer | Out-Null
        Start-Sleep -Seconds 5
        $nodeStatus = docker inspect --format "{{.State.Status}}" $piNodeContainer 2>$null
        if ($nodeStatus -ne "running") {
            Write-Warn "Could not start $piNodeContainer standalone — compose will manage it"
        }
    } else {
        Write-Ok "$piNodeContainer is running"

        # Check stellar-core is responding
        $coreInfo = docker exec $piNodeContainer curl -s http://localhost:11626/info 2>$null
        if ($LASTEXITCODE -eq 0 -and $coreInfo) {
            $state = ($coreInfo | ConvertFrom-Json).info.state
            Write-Ok "stellar-core state: $state"
        } else {
            Write-Warn "stellar-core not yet responding (may still be syncing)"
        }
    }
}

# ── Phase 2: Ensure pi-bridge network exists and Pi node is connected ──
Write-Step "Phase 2: Pi-Bridge Network"

$pibridge = docker network ls --filter "name=pi-bridge" --format "{{.Name}}" 2>$null
if (-not $pibridge) {
    Write-Warn "pi-bridge network doesn't exist yet — compose will create it"
} else {
    $members = docker network inspect pi-bridge --format "{{range .Containers}}{{.Name}} {{end}}" 2>$null
    if ($members -match $piNodeContainer) {
        Write-Ok "$piNodeContainer already on pi-bridge network"
    } else {
        docker network connect pi-bridge $piNodeContainer 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Connected $piNodeContainer to pi-bridge network"
        } else {
            Write-Warn "Could not connect $piNodeContainer to pi-bridge (compose will handle it)"
        }
    }
}

# ── Phase 3: Check Horizon API ──
Write-Step "Phase 3: Horizon API"

$horizonOk = docker exec $piNodeContainer curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>$null
if ($horizonOk -eq "200") {
    Write-Ok "Horizon API responding (HTTP 200)"
} else {
    Write-Warn "Horizon API not ready (code: $horizonOk) — guardian-watchdog will handle it"
}

# ── Phase 4: Start Triumph Synergy ecosystem ──
Write-Step "Phase 4: Starting Triumph Synergy (mainnet)"

Push-Location $composeDir

$env:PI_NETWORK_MODE = "mainnet"
$env:PI_NODE_CONTAINER = $piNodeContainer

$composeArgs = @("compose", "up", "-d", "--remove-orphans")
if ($Build) { $composeArgs += "--build" }

docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose up failed"
    Pop-Location
    exit 1
}
Write-Ok "All services starting"

Pop-Location

# ── Phase 5: Post-start — confirm Pi mainnet node is on pi-bridge ──
Write-Step "Phase 5: Post-start network verification"
Start-Sleep -Seconds 3

$members = docker network inspect pi-bridge --format "{{range .Containers}}{{.Name}} {{end}}" 2>$null
if ($members -match $piNodeContainer) {
    Write-Ok "$piNodeContainer confirmed on pi-bridge network"
} else {
    docker network connect pi-bridge $piNodeContainer 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Connected $piNodeContainer to pi-bridge (post-start)"
    } else {
        Write-Warn "Could not connect $piNodeContainer to pi-bridge — compose manages this automatically"
    }
}

# ── Phase 6: Quick health check ──
Write-Step "Phase 6: Health verification (waiting 15s for services to boot)"
Start-Sleep -Seconds 15

$healthy = 0
$total = 0
$containers = docker compose ps --format "{{.Name}}" 2>$null
foreach ($c in $containers) {
    $total++
    $health = docker inspect --format "{{.State.Health.Status}}" $c 2>$null
    if ($health -eq "healthy") { $healthy++ }
}

Write-Host ""
Write-Host "  Triumph Synergy: $healthy/$total services healthy" -ForegroundColor $(if ($healthy -eq $total) { "Green" } elseif ($healthy -gt ($total/2)) { "Yellow" } else { "Red" })
Write-Host "  Pi Mainnet Node: $piNodeContainer (ledger streaming via pi-bridge)" -ForegroundColor Green
Write-Host "  Bridge: http://localhost:8092/bridge/status" -ForegroundColor Gray
Write-Host "  Central Node: http://localhost:11626/info" -ForegroundColor Gray
Write-Host ""
Write-Ok "Ecosystem startup complete — Pi Network mainnet activ