#!/usr/bin/env pwsh
# Triumph Synergy - Simple Deployment Verification

$ErrorActionPreference = "Continue"

Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TRIUMPH SYNERGY - DEPLOYMENT VERIFICATION" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$VERCEL_URL = "https://triumph-synergy-f4s4h76l1-jeremiah-drains-projects.vercel.app"
$SUPABASE_URL = "https://triumph-synergy.supabase.co"
$STELLAR_URL = "https://horizon.stellar.org"

$results = @{
    GitHub = "Unknown"
    Vercel = "Unknown"
    Supabase = "Unknown"
    Stellar = "Unknown"
}

# GitHub Check
Write-Host "1. GitHub Repository..." -ForegroundColor Yellow
try {
    $gitStatus = git status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $branch = git branch --show-current
        $commit = git log -1 --oneline
        Write-Host "   ✅ Connected - Branch: $branch" -ForegroundColor Green
        Write-Host "   ✅ Latest: $commit" -ForegroundColor Green
        $results.GitHub = "✅ Operational"
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    $results.GitHub = "❌ Error"
}
Write-Host ""

# Vercel Check
Write-Host "2. Vercel Deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $VERCEL_URL -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   ✅ Live - HTTP $($response.StatusCode)" -ForegroundColor Green
    $results.Vercel = "✅ Live (HTTP $($response.StatusCode))"
} catch {
    if ($null -ne $_.Exception.Response) {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ HTTP $code" -ForegroundColor Red
        $results.Vercel = "❌ HTTP $code"
        if ($code -eq 500) {
            Write-Host "   ⚠️  Deployment may still be in progress" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Connection failed" -ForegroundColor Red
        $results.Vercel = "❌ Connection Failed"
    }
}

# Health endpoint
try {
    $health = Invoke-WebRequest -Uri "$VERCEL_URL/api/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    $data = $health.Content | ConvertFrom-Json
    Write-Host "   ✅ Health: $($data.status)" -ForegroundColor Green
} catch {
    if ($null -ne $_.Exception.Response) {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ Health endpoint: HTTP $code" -ForegroundColor Red
    }
}
Write-Host ""

# Supabase Check
Write-Host "3. Supabase Database..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $SUPABASE_URL -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   ✅ Accessible - HTTP $($response.StatusCode)" -ForegroundColor Green
    $results.Supabase = "✅ Accessible"
} catch {
    if ($null -ne $_.Exception.Response) {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "   ⚠️  HTTP $code (may be normal)" -ForegroundColor Yellow
        $results.Supabase = "⚠️  HTTP $code"
    } else {
        Write-Host "   ❌ Connection failed" -ForegroundColor Red
        $results.Supabase = "❌ Failed"
    }
}
Write-Host ""

# Stellar Check
Write-Host "4. Stellar Blockchain..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $STELLAR_URL -Method GET -TimeoutSec 10 -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ Operational - $($data.network_passphrase)" -ForegroundColor Green
    $results.Stellar = "✅ Operational"
} catch {
    Write-Host "   ❌ Connection failed" -ForegroundColor Red
    $results.Stellar = "❌ Failed"
}
Write-Host ""

# Summary
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "GitHub:      $($results.GitHub)" -ForegroundColor White
Write-Host "Vercel:      $($results.Vercel)" -ForegroundColor White
Write-Host "Supabase:    $($results.Supabase)" -ForegroundColor White
Write-Host "Stellar:     $($results.Stellar)" -ForegroundColor White
Write-Host ""

$operational = 0
foreach ($key in $results.Keys) {
    if ($results[$key] -like "*✅*") { $operational++ }
}

$percentage = [math]::Round(($operational / 4) * 100)
Write-Host "Integration: $operational/4 platforms ($percentage%)" -ForegroundColor White
Write-Host ""

if ($percentage -eq 100) {
    Write-Host "Status: ✅ 100% OPERATIONAL" -ForegroundColor Green
    Write-Host "All platforms working together harmoniously!" -ForegroundColor Green
    exit 0
} elseif ($results.Vercel -like "*500*") {
    Write-Host "Status: ⚠️  DEPLOYMENT IN PROGRESS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Wait 5-10 minutes for deployment" -ForegroundColor Cyan
    Write-Host "2. Check: https://github.com/jdrains110-beep/triumph-synergy/actions" -ForegroundColor Cyan
    Write-Host "3. Check: https://vercel.com/projects/triumph-synergy" -ForegroundColor Cyan
    Write-Host "4. Set environment variables in Vercel if not done" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "Status: ⚠️  ISSUES DETECTED" -ForegroundColor Yellow
    Write-Host "Review details above and take action." -ForegroundColor Yellow
    exit 1
}
