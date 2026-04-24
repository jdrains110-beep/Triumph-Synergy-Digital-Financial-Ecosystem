# ==========================================================================
# TRIUMPH SYNERGY — Docker Resource Cleanup
# ==========================================================================
# Automated cleanup to prevent disk/memory bloat from crashing Docker Desktop.
# Run manually or via Windows Task Scheduler (recommended: every 6 hours).
#
# USAGE:
#   .\scripts\docker-cleanup.ps1            # Normal cleanup
#   .\scripts\docker-cleanup.ps1 -Deep      # Aggressive cleanup (removes build cache)
# ==========================================================================

param(
    [switch]$Deep
)

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "[$timestamp] Triumph Synergy Docker Cleanup starting..." -ForegroundColor Cyan

# ── 1. Remove stopped containers (not running ones) ──
Write-Host "  Pruning stopped containers..." -ForegroundColor Yellow
docker container prune -f 2>$null

# ── 2. Remove dangling images (untagged) ──
Write-Host "  Pruning dangling images..." -ForegroundColor Yellow
docker image prune -f 2>$null

# ── 3. Remove unused networks (not attached to running containers) ──
Write-Host "  Pruning unused networks..." -ForegroundColor Yellow
docker network prune -f 2>$null

# ── 4. Remove dangling volumes (not attached to any container) ──
# SAFE: named triumph_* volumes are always attached while compose is up
Write-Host "  Pruning dangling volumes..." -ForegroundColor Yellow
docker volume prune -f 2>$null

# ── 5. Deep mode: also purge build cache ──
if ($Deep) {
    Write-Host "  [DEEP] Pruning build cache older than 48h..." -ForegroundColor Magenta
    docker builder prune -f --filter "until=48h" 2>$null
}

# ── 6. Report disk usage ──
Write-Host ""
Write-Host "[$timestamp] Docker disk usage after cleanup:" -ForegroundColor Cyan
docker system df

# ── 7. Log WSL2 memory usage ──
$vmmem = Get-Process -Name "vmmemWSL" -ErrorAction SilentlyContinue
if ($vmmem) {
    $mb = [math]::Round($vmmem.WorkingSet64 / 1MB, 0)
    Write-Host "  WSL2 VM memory: ${mb} MB" -ForegroundColor $(if ($mb -gt 3500) { "Red" } else { "Green" })
}

Write-Host ""
Write-Host "[$timestamp] Cleanup complete." -ForegroundColor Green
