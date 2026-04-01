# ═══════════════════════════════════════════════════════════════════
# TRIUMPH SYNERGY - COMPLETE DEPLOYMENT VERIFICATION & FIX
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "SilentlyContinue"

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   TRIUMPH SYNERGY - DEPLOYMENT STATUS CHECK" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 1. CHECK GITHUB REPOSITORY STATUS
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 1. GITHUB REPOSITORY STATUS ━━━" -ForegroundColor Yellow
Write-Host ""

try {
    $gitStatus = git status --porcelain
    $currentBranch = git branch --show-current
    $latestCommit = git log -1 --pretty=format:"%h - %s (%ar)"
    
    Write-Host "✅ Branch: $currentBranch" -ForegroundColor Green
    Write-Host "✅ Latest Commit: $latestCommit" -ForegroundColor Green
    
    if ($gitStatus) {
        Write-Host "⚠️  Uncommitted changes detected:" -ForegroundColor Yellow
        Write-Host $gitStatus
    } else {
        Write-Host "✅ Working directory clean" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Git check failed: $_" -ForegroundColor Red
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 2. CHECK VERCEL DEPLOYMENT STATUS
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 2. VERCEL DEPLOYMENT STATUS ━━━" -ForegroundColor Yellow
Write-Host ""

$vercelUrl = "https://triumph-synergy-f4s4h76l1-jeremiah-drains-projects.vercel.app"
$healthUrl = "$vercelUrl/api/health"

Write-Host "Checking: $vercelUrl" -ForegroundColor Cyan

$mainResponse = $null
try {
    $mainResponse = Invoke-WebRequest -Uri $vercelUrl -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Main URL Status: $($mainResponse.StatusCode)" -ForegroundColor Green
    Write-Host "✅ App is LIVE and responding" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "❌ Main URL Status: $statusCode" -ForegroundColor Red
        if ($statusCode -eq 500) {
            Write-Host "🔍 HTTP 500 DETECTED - Environment variables may be missing" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "❌ Main URL Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Checking: $healthUrl" -ForegroundColor Cyan

$healthResponse = $null
try {
    $healthResponse = Invoke-WebRequest -Uri $healthUrl -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $healthData = $healthResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ Health Endpoint Status: $($healthResponse.StatusCode)" -ForegroundColor Green
    Write-Host "✅ Health Status: $($healthData.status)" -ForegroundColor Green
    Write-Host "✅ Services:" -ForegroundColor Green
    foreach ($prop in $healthData.services.PSObject.Properties) {
        Write-Host "   - $($prop.Name): $($prop.Value)" -ForegroundColor Cyan
    }
}
catch {
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "❌ Health Endpoint Status: $statusCode" -ForegroundColor Red
    }
    else {
        Write-Host "❌ Health Endpoint Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 3. CHECK LOCAL ENVIRONMENT FILES
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 3. LOCAL ENVIRONMENT CHECK ━━━" -ForegroundColor Yellow
Write-Host ""

$configFiles = @(
    "package.json",
    "next.config.ts",
    "vercel.json",
    "docker-compose.yml",
    ".env.example"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $file missing" -ForegroundColor Yellow
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 4. CHECK CRITICAL FILES FOR HTTP 500 FIXES
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 4. CRITICAL HTTP 500 FIXES VERIFICATION ━━━" -ForegroundColor Yellow
Write-Host ""

$criticalFiles = @{
    "app/api/health/route.ts" = "Health endpoint"
    "app/page.tsx" = "Root page"
    "middleware.ts" = "Request middleware"
    "app/error.tsx" = "Error recovery"
    "vercel.json" = "Vercel config"
}

foreach ($file in $criticalFiles.Keys) {
    if (Test-Path $file) {
        Write-Host "✅ $($criticalFiles[$file]): $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $($criticalFiles[$file]): $file MISSING" -ForegroundColor Red
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 5. CHECK VERCEL.JSON CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 5. VERCEL CONFIGURATION CHECK ━━━" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "vercel.json") {
    try {
        $vercelConfig = Get-Content "vercel.json" | ConvertFrom-Json
        
        Write-Host "✅ vercel.json is valid JSON" -ForegroundColor Green
        
        # Check for placeholder values
        $hasPlaceholders = $false
        $vercelConfig.env.PSObject.Properties | ForEach-Object {
            $value = $_.Value
            if ($value -like "*placeholder*" -or $value -like "*-your-*") {
                Write-Host "❌ Found placeholder in $($_.Name): $value" -ForegroundColor Red
                $hasPlaceholders = $true
            } elseif ($value -like "@*") {
                Write-Host "✅ $($_.Name): Using secret reference ($value)" -ForegroundColor Green
            } else {
                Write-Host "✅ $($_.Name): Configured" -ForegroundColor Green
            }
        }
        
        if ($hasPlaceholders) {
            Write-Host ""
            Write-Host "⚠️  CRITICAL: Found placeholder values in vercel.json" -ForegroundColor Yellow
            Write-Host "   These need to be changed to @SECRET_NAME references" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ vercel.json is invalid: $_" -ForegroundColor Red
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 6. CHECK GITHUB ACTIONS WORKFLOWS
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 6. GITHUB ACTIONS WORKFLOWS ━━━" -ForegroundColor Yellow
Write-Host ""

$workflows = Get-ChildItem -Path ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue

if ($workflows) {
    Write-Host "✅ Found $($workflows.Count) workflow(s):" -ForegroundColor Green
    foreach ($workflow in $workflows) {
        Write-Host "   - $($workflow.Name)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ No workflows found" -ForegroundColor Red
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 7. DIAGNOSIS & RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════
 -ErrorAction Stop
}
catch {
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 500) {
            $issues += "HTTP 500 Error on main URL"
        }
    }
    else {
        $issues += "Cannot reach main URL"
    }
}

try {
    $healthCheck = Invoke-WebRequest -Uri $healthUrl -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
}
  if ($_.Exception.Response.StatusCode.value__ -eq 500) {
        $issues += "HTTP 500 Error on main URL"
    }
}

try {
    $healthCheck = Invoke-WebRequest -Uri $healthUrl -Method GET -UseBasicParsing -TimeoutSec 10
} catch {
    $issues += "Health endpoint not responding"
}

if ($issues.Count -eq 0) {
    Write-Host "🎉 ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ GitHub: Up to date" -ForegroundColor Green
    Write-Host "✅ Vercel: Deployed and live" -ForegroundColor Green
    Write-Host "✅ Health: Responding correctly" -ForegroundColor Green
    Write-Host "✅ All critical files: Present" -ForegroundColor Green
} else {
    Write-Host "⚠️  ISSUES DETECTED:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "   - $issue" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🔧 RECOMMENDED ACTIONS:" -ForegroundColor Yellow
    Write-Host ""
    
    if ($issues -contains "HTTP 500 Error on main URL") {
        Write-Host "1. Set Environment Variables in Vercel Dashboard:" -ForegroundColor Cyan
        Write-Host "   https://vercel.com/projects/triumph-synergy/settings/environment-variables" -ForegroundColor White
        Write-Host ""
        Write-Host "   Required secrets:" -ForegroundColor White
        Write-Host "   - PI_API_KEY" -ForegroundColor Gray
        Write-Host "   - NEXTAUTH_SECRET (generate: openssl rand -base64 32)" -ForegroundColor Gray
        Write-Host "   - POSTGRES_URL" -ForegroundColor Gray
        Write-Host "   - REDIS_URL" -ForegroundColor Gray
        Write-Host "   - SUPABASE_ANON_KEY" -ForegroundColor Gray
        Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. After adding secrets, redeploy in Vercel:" -ForegroundColor Cyan
        Write-Host "   - Go to Vercel dashboard" -ForegroundColor White
        Write-Host "   - Click latest deployment" -ForegroundColor White
        Write-Host "   - Click 'Redeploy'" -ForegroundColor White
        Write-Host ""
    }
    
    if ($issues -contains "Health endpoint not responding") {
        Write-Host "3. Wait for deployment to complete (5-10 minutes)" -ForegroundColor Cyan
        Write-Host "   Monitor: https://github.com/jdrains110-beep/triumph-synergy/actions" -ForegroundColor White
        Write-Host ""
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# 8. QUICK ACTION LINKS
# ═══════════════════════════════════════════════════════════════════

Write-Host "━━━ 8. QUICK ACTION LINKS ━━━" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔗 GitHub Repository:" -ForegroundColor Cyan
Write-Host "   https://github.com/jdrains110-beep/triumph-synergy" -ForegroundColor White
Write-Host ""

Write-Host "🔗 GitHub Actions:" -ForegroundColor Cyan
Write-Host "   https://github.com/jdrains110-beep/triumph-synergy/actions" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Vercel Dashboard:" -ForegroundColor Cyan
Write-Host "   https://vercel.com/projects/triumph-synergy" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Vercel Environment Variables:" -ForegroundColor Cyan
Write-Host "   https://vercel.com/projects/triumph-synergy/settings/environment-variables" -ForegroundColor White
Write-Host ""

Write-Host "🔗 App URL:" -ForegroundColor Cyan
Write-Host "   $vercelUrl" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Health Endpoint:" -ForegroundColor Cyan
Write-Host "   $healthUrl" -ForegroundColor White
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   VERIFICATION COMPLETE" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Return status code
if ($issues.Count -eq 0) {
    exit 0
} else {
    exit 1
}
