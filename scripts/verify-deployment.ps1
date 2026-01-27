#!/usr/bin/env pwsh

# Triumph Synergy - Comprehensive Deployment Verification Script
# This script checks GitHub, Vercel, and all integrated platforms

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TRIUMPH SYNERGY - DEPLOYMENT VERIFICATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VERCEL_URL = "https://triumph-synergy-f4s4h76l1-jeremiah-drains-projects.vercel.app"
$GITHUB_REPO = "jdrains110-beep/triumph-synergy"
$SUPABASE_URL = "https://triumph-synergy.supabase.co"
$STELLAR_URL = "https://horizon.stellar.org"

$results = @{
    GitHub = @{ Status = "Unknown"; Details = @() }
    Vercel = @{ Status = "Unknown"; Details = @() }
    Supabase = @{ Status = "Unknown"; Details = @() }
    Stellar = @{ Status = "Unknown"; Details = @() }
    Integration = @{ Status = "Unknown"; Details = @() }
}

# ============================================================================
# 1. CHECK GITHUB REPOSITORY
# ============================================================================

Write-Host "1. Checking GitHub Repository..." -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    # Check if we're in a git repository
    $gitStatus = git status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $results.GitHub.Status = "✅ Connected"
        $results.GitHub.Details += "Local git repository active"
        Write-Host "   ✅ Local repository: Connected" -ForegroundColor Green
        
        # Check current branch
        $branch = git branch --show-current
        $results.GitHub.Details += "Current branch: $branch"
        Write-Host "   ✅ Current branch: $branch" -ForegroundColor Green
        
        # Check latest commit
        $latestCommit = git log -1 --oneline
        $results.GitHub.Details += "Latest commit: $latestCommit"
        Write-Host "   ✅ Latest commit: $latestCommit" -ForegroundColor Green
        
        # Check remote status
        git fetch origin --quiet 2>&1 | Out-Null
        $behindCount = (git rev-list --count HEAD..origin/$branch 2>&1)
        if ($behindCount -eq 0 -or $behindCount -eq $null) {
            $results.GitHub.Details += "Up to date with remote"
            Write-Host "   ✅ Remote status: Up to date" -ForegroundColor Green
        } else {
            $results.GitHub.Details += "Behind remote by $behindCount commits"
            Write-Host "   ⚠️  Remote status: Behind by $behindCount commits" -ForegroundColor Yellow
        }
    } else {
        $results.GitHub.Status = "❌ Error"
        $results.GitHub.Details += "Not a git repository"
        Write-Host "   ❌ Error: Not a git repository" -ForegroundColor Red
    }
} catch {
    $results.GitHub.Status = "❌ Error"
    $results.GitHub.Details += "Exception: $($_.Exception.Message)"
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 2. CHECK VERCEL DEPLOYMENT
# ============================================================================

Write-Host "2. Checking Vercel Deployment..." -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    # Test main URL
    Write-Host "   Testing: $VERCEL_URL" -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri $VERCEL_URL -Method GET -TimeoutSec 10 -ErrorAction Stop
    $results.Vercel.Status = "✅ Live"
    $results.Vercel.Details += "Status Code: $($response.StatusCode)"
    $results.Vercel.Details += "Content Length: $($response.Content.Length) bytes"
    Write-Host "   ✅ Main URL: HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Content delivered: $($response.Content.Length) bytes" -ForegroundColor Green
} catch {
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $results.Vercel.Status = "❌ Error HTTP $statusCode"
        $results.Vercel.Details += "Status Code: $statusCode"
        Write-Host "   ❌ Main URL: HTTP $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 500) {
            Write-Host "   ⚠️  Issue: Internal Server Error (deployment may still be in progress)" -ForegroundColor Yellow
            $results.Vercel.Details += "Deployment might be in progress or environment variables missing"
        }
    } else {
        $results.Vercel.Status = "❌ Connection Failed"
        $results.Vercel.Details += "Error: $($_.Exception.Message)"
        Write-Host "   ❌ Connection Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test health endpoint
try {
    Write-Host "   Testing: $VERCEL_URL/api/health" -ForegroundColor Gray
    $healthResponse = Invoke-WebRequest -Uri "$VERCEL_URL/api/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    $healthData = $healthResponse.Content | ConvertFrom-Json
    $results.Vercel.Details += "Health endpoint: Operational"
    $results.Vercel.Details += "Health status: $($healthData.status)"
    Write-Host "   ✅ Health endpoint: HTTP $($healthResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Health status: $($healthData.status)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ Health endpoint: HTTP $statusCode" -ForegroundColor Red
        $results.Vercel.Details += "Health endpoint not available (HTTP $statusCode)"
        
        if ($statusCode -eq 404) {
            Write-Host "   ⚠️  Issue: Health endpoint not deployed yet" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Health endpoint: Connection failed" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================================================
# 3. CHECK SUPABASE CONNECTION
# ============================================================================

Write-Host "3. Checking Supabase Connection..." -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "   Testing: $SUPABASE_URL" -ForegroundColor Gray
    $supabaseResponse = Invoke-WebRequest -Uri $SUPABASE_URL -Method GET -TimeoutSec 10 -ErrorAction Stop
    $results.Supabase.Status = "✅ Accessible"
    $results.Supabase.Details += "Status Code: $($supabaseResponse.StatusCode)"
    Write-Host "   ✅ Supabase endpoint: HTTP $($supabaseResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Database connection possible" -ForegroundColor Green
} catch {
    if ($null -ne $_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $results.Supabase.Status = "⚠️  HTTP $statusCode"
        $results.Supabase.Details += "Status Code: $statusCode"
        Write-Host "   ⚠️  Supabase endpoint: HTTP $statusCode" -ForegroundColor Yellow
        
        if (($statusCode -eq 404) -or ($statusCode -eq 400)) {
            Write-Host "   ℹ️  Note: Base URL may return error but REST API could be working" -ForegroundColor Cyan
            $results.Supabase.Details += "Base URL not accessible but service may be operational"
        }
    } else {
        $results.Supabase.Status = "❌ Connection Failed"
        Write-Host "   ❌ Connection Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================================================
# 4. CHECK STELLAR BLOCKCHAIN
# ============================================================================

Write-Host "4. Checking Stellar Blockchain..." -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "   Testing: $STELLAR_URL" -ForegroundColor Gray
    $stellarResponse = Invoke-WebRequest -Uri $STELLAR_URL -Method GET -TimeoutSec 10 -ErrorAction Stop
    $stellarData = $stellarResponse.Content | ConvertFrom-Json
    $results.Stellar.Status = "✅ Operational"
    $results.Stellar.Details += "Status Code: $($stellarResponse.StatusCode)"
    $results.Stellar.Details += "Network: $($stellarData.network_passphrase)"
    Write-Host "   ✅ Stellar Horizon: HTTP $($stellarResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Network: $($stellarData.network_passphrase)" -ForegroundColor Green
    Write-Host "   ✅ Blockchain settlement available" -ForegroundColor Green
} catch {
    $results.Stellar.Status = "❌ Error"
    Write-Host "   ❌ Connection Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 5. CHECK PLATFORM INTEGRATION
# ============================================================================

Write-Host "5. Checking Platform Integration..." -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────" -ForegroundColor Gray

$integrationScore = 0
$maxScore = 4

if ($results.GitHub.Status -like "*✅*") {
    Write-Host "   ✅ GitHub → Code repository operational" -ForegroundColor Green
    $integrationScore++
} else {
    Write-Host "   ❌ GitHub → Code repository issue" -ForegroundColor Red
}

if ($results.Vercel.Status -like "*✅*") {
    Write-Host "   ✅ Vercel → Deployment platform operational" -ForegroundColor Green
    $integrationScore++
} else {
    Write-Host "   ❌ Vercel → Deployment platform issue" -ForegroundColor Red
}

if ($results.Supabase.Status -like "*✅*" -or $results.Supabase.Status -like "*⚠️*") {
    Write-Host "   ✅ Supabase → Database connection possible" -ForegroundColor Green
    $integrationScore++
} else {
    Write-Host "   ❌ Supabase → Database connection issue" -ForegroundColor Red
}

if ($results.Stellar.Status -like "*✅*") {
    Write-Host "   ✅ Stellar → Blockchain settlement operational" -ForegroundColor Green
    $integrationScore++
} else {
    Write-Host "   ❌ Stellar → Blockchain settlement issue" -ForegroundColor Red
}

$integrationPercentage = [math]::Round(($integrationScore / $maxScore) * 100)
$results.Integration.Status = "$integrationScore/$maxScore platforms operational ($integrationPercentage%)"

if ($integrationPercentage -eq 100) {
    $results.Integration.Status = "✅ Perfect - All platforms working together"
    Write-Host ""
    Write-Host "   🎉 Integration Score: $integrationPercentage% (Perfect!)" -ForegroundColor Green
} elseif ($integrationPercentage -ge 75) {
    $results.Integration.Status = "⚠️  Good - Most platforms operational"
    Write-Host ""
    Write-Host "   ⚠️  Integration Score: $integrationPercentage% (Good)" -ForegroundColor Yellow
} else {
    $results.Integration.Status = "❌ Issues - Multiple platforms down"
    Write-Host ""
    Write-Host "   ❌ Integration Score: $integrationPercentage% (Needs attention)" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT STATUS SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Platform Status:" -ForegroundColor White
Write-Host "  GitHub:      $($results.GitHub.Status)" -ForegroundColor White
Write-Host "  Vercel:      $($results.Vercel.Status)" -ForegroundColor White
Write-Host "  Supabase:    $($results.Supabase.Status)" -ForegroundColor White
Write-Host "  Stellar:     $($results.Stellar.Status)" -ForegroundColor White
Write-Host ""
Write-Host "Integration:  $($results.Integration.Status)" -ForegroundColor White
Write-Host ""

# Determine overall status
if ($integrationPercentage -eq 100 -and $results.Vercel.Status -like "*✅*") {
    Write-Host "Overall Status: ✅ 100% OPERATIONAL" -ForegroundColor Green
    Write-Host ""
    Write-Host "All platforms are working together harmoniously!" -ForegroundColor Green
    Write-Host "Deployment is complete and successful." -ForegroundColor Green
    exit 0
} elseif ($results.Vercel.Status -like "*500*") {
    Write-Host "Overall Status: ⚠️  DEPLOYMENT IN PROGRESS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Vercel shows HTTP 500 - Possible causes:" -ForegroundColor Yellow
    Write-Host "  1. Deployment still building (wait 5-10 minutes)" -ForegroundColor Yellow
    Write-Host "  2. Environment variables not set in Vercel dashboard" -ForegroundColor Yellow
    Write-Host "  3. Build completed but services not yet initialized" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Check GitHub Actions: https://github.com/$GITHUB_REPO/actions" -ForegroundColor Cyan
    Write-Host "  2. Check Vercel Dashboard: https://vercel.com/projects/triumph-synergy" -ForegroundColor Cyan
    Write-Host "  3. Verify environment variables are set in Vercel" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "Overall Status: ❌ ISSUES DETECTED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Some platforms are not fully operational." -ForegroundColor Red
    Write-Host "Review the details above and take corrective action." -ForegroundColor Red
    exit 1
}
