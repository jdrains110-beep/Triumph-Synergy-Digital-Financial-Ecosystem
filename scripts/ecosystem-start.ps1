# ==========================================================================
# TRIUMPH SYNERGY — Ecosystem Startup
# ==========================================================================
# Ensures Pi Node (testnet2) is running and connected BEFORE starting
# the Triumph Synergy ecosystem. This guarantees real-world blockchain
# data flows from day one.
#
# USAGE:
#   .\scripts\ecosystem-start.ps1             # Normal start
#   .\scripts\ecosystem-start.ps1 -Build      # Rebuild and start
#   .\scripts\ecosystem-start.ps1 -Testnet    # Explicit testnet mode
# ==========================================================================

param(
    [switch]$Build,
    [switch]$Testnet
)

$ErrorActionPreference = "Stop"
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

# ── Phase 1: Ensure Pi Node (testnet2) is running ──
Write-Step "Phase 1: Pi Node (testnet2)"

$testnet2Status = docker inspect --format "{{.State.Status}}" testnet2 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "testnet2 container not found — Pi Desktop must create it first"
    Write-Host "  Open Pi Desktop and ensure the Pi Node is configured" -ForegroundColor Gray
    exit 1
}

if ($testnet2Status -ne "running") {
    Write-Warn "testnet2 is '$testnet2Status' — starting..."
    docker start testnet2 | Out-Null
    Start-Sleep -Seconds 5
    $testnet2Status = docker inspect --format "{{.State.Status}}" testnet2 2>$null
    if ($testnet2Status -ne "running") {
        Write-Fail "Could not start testnet2 — check Docker Desktop"
        exit 1
    }
}
Write-Ok "testnet2 is running"

# Check stellar-core is responding
$coreInfo = docker exec testnet2 curl -s http://localhost:11626/info 2>$null
if ($LASTEXITCODE -eq 0) {
    $state = ($coreInfo | ConvertFrom-Json).info.state
    Write-Ok "stellar-core state: $state"
} else {
    Write-Warn "stellar-core not yet responding (may still be starting)"
}

# ── Phase 2: Ensure pi-bridge network exists and testnet2 is connected ──
Write-Step "Phase 2: Pi-Bridge Network"

# Check if pi-bridge network exists (compose will create it, but check first)
$pibridge = docker network ls --filter "name=pi-bridge" --format "{{.Name}}" 2>$null
if (-not $pibridge) {
    Write-Warn "pi-bridge network doesn't exist yet — compose will create it"
} else {
    # Connect testnet2 if not already connected
    $members = docker network inspect pi-bridge --format "{{range .Containers}}{{.Name}} {{end}}" 2>$null
    if ($members -match "testnet2") {
        Write-Ok "testnet2 already on pi-bridge network"
    } else {
        docker network connect pi-bridge testnet2 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Connected testnet2 to pi-bridge network"
        } else {
            Write-Warn "Could not connect testnet2 to pi-bridge (compose will handle it)"
        }
    }
}

# ── Phase 3: Check Horizon API ──
Write-Step "Phase 3: Horizon API"

$horizonOk = docker exec testnet2 curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>$null
if ($horizonOk -eq "200") {
    Write-Ok "Horizon API responding (HTTP 200)"
} else {
    Write-Warn "Horizon API not ready (code: $horizonOk) — guardian will handle it"
}

# ── Phase 4: Start Triumph Synergy ecosystem ──
Write-Step "Phase 4: Starting Triumph Synergy"

Push-Location $composeDir

$composeArgs = @("compose", "up", "-d")
if ($Build) { $composeArgs += "--build" }

if ($Testnet) {
    Write-Host "  Mode: TESTNET" -ForegroundColor Yellow
    $env:PI_NETWORK_MODE = "testnet"
    $env:PI_NODE_CONTAINER = "testnet2"
}

docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose up failed"
    Pop-Location
    exit 1
}
Write-Ok "All services starting"

Pop-Location

# ── Phase 5: Post-start — ensure testnet2 is on pi-bridge ──
Write-Step "Phase 5: Post-start network verification"
Start-Sleep -Seconds 3

$members = docker network inspect pi-bridge --format "{{range .Containers}}{{.Name}} {{end}}" 2>$null
if ($members -match "testnet2") {
    Write-Ok "testnet2 confirmed on pi-bridge network"
} else {
    docker network connect pi-bridge testnet2 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Connected testnet2 to pi-bridge (post-start)"
    } else {
        Write-Fail "Could not connect testnet2 to pi-bridge — run manually: docker network connect pi-bridge testnet2"
    }
}

# ── Phase 6: Quick health check ──
Write-Step "Phase 6: Health verification (waiting 15s for services to boot)"
Start-Sleep -Seconds 15

$healthy = 0
$total = 0
$containers = docker ps --filter "label=org.pinetwork.project=triumph-synergy" --format "{{.Names}}" 2>$null
foreach ($c in $containers) {
    $total++
    $health = docker inspect --format "{{.State.Health.Status}}" $c 2>$null
    if ($health -eq "healthy") { $healthy++ }
}

Write-Host ""
Write-Host "  Triumph Synergy: $healthy/$total services healthy" -ForegroundColor $(if ($healthy -eq $total) { "Green" } elseif ($healthy -gt ($total/2)) { "Yellow" } else { "Red" })
Write-Host "  Pi Node: testnet2 (ledger streaming via pi-bridge)" -ForegroundColor Green
Write-Host "  Bridge: http://localhost:8092/bridge/status" -ForegroundColor Gray
Write-Host "  Central Node: http://localhost:11626/info" -ForegroundColor Gray
Write-Host ""
Write-Ok "Ecosystem startup complete"
