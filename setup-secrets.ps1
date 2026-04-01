#!/usr/bin/env pwsh
# Extract secrets from .env files for GitHub and Vercel setup

$envFile = ".env"
$envTxtFile = ".env.txt"

Write-Host ""
Write-Host "TRIUMPH SYNERGY - SECRETS SETUP GUIDE" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Read .env files
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
} elseif (Test-Path $envTxtFile) {
    $envContent = Get-Content $envTxtFile -Raw
}

# Extract secrets
$pg = [regex]::Match($envContent, 'POSTGRES_URL[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$redis = [regex]::Match($envContent, 'REDIS_URL[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$authSecret = [regex]::Match($envContent, 'AUTH_SECRET[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$nextauthSecret = [regex]::Match($envContent, 'NEXTAUTH_SECRET[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$nextauthUrl = [regex]::Match($envContent, 'NEXTAUTH_URL[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$supabaseKey = [regex]::Match($envContent, 'NEXT_PUBLIC_SUPABASE_ANON_KEY[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$piKey = [regex]::Match($envContent, 'PI_API_KEY[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()
$piInternal = [regex]::Match($envContent, 'PI_INTERNAL_API_KEY[^=]*=\s*["`]?([^"`\n]+)').Groups[1].Value.Trim()

Write-Host "GITHUB SECRETS NEEDED" -ForegroundColor Yellow
Write-Host "====================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Settings > Secrets and variables > Actions"
Write-Host ""
Write-Host "1. SUPABASE_ANON_KEY"
Write-Host "   Value: $supabaseKey" -ForegroundColor Green
Write-Host ""
Write-Host "2. VERCEL_TOKEN"
Write-Host "   Get from: https://vercel.com/account/tokens" -ForegroundColor Red
Write-Host ""
Write-Host "3. VERCEL_ORG_ID"
Write-Host "   Get from: Vercel dashboard URL" -ForegroundColor Red
Write-Host ""
Write-Host "4. VERCEL_PROJECT_ID"
Write-Host "   Get from: Vercel project settings" -ForegroundColor Red
Write-Host ""

Write-Host ""
Write-Host "VERCEL ENVIRONMENT VARIABLES NEEDED" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project Settings > Environment Variables"
Write-Host ""
Write-Host "1. NEXTAUTH_SECRET = $nextauthSecret" -ForegroundColor Green
Write-Host ""
Write-Host "2. AUTH_SECRET = $authSecret" -ForegroundColor Green
Write-Host ""
Write-Host "3. PI_API_KEY = $piKey"
if ($piKey -like "*placeholder*") {
    Write-Host "   [NEEDS UPDATE - Currently a placeholder]" -ForegroundColor Red
} else {
    Write-Host "   [FOUND]" -ForegroundColor Green
}
Write-Host ""
Write-Host "4. PI_INTERNAL_API_KEY = $piInternal"
if ($piInternal -like "*placeholder*") {
    Write-Host "   [NEEDS UPDATE - Currently a placeholder]" -ForegroundColor Red
} else {
    Write-Host "   [FOUND]" -ForegroundColor Green
}
Write-Host ""
Write-Host "5. SUPABASE_ANON_KEY = $supabaseKey" -ForegroundColor Green
Write-Host ""
Write-Host "6. POSTGRES_URL = $pg" -ForegroundColor Green
Write-Host ""
Write-Host "7. REDIS_URL = $redis" -ForegroundColor Green
Write-Host ""

Write-Host ""
Write-Host "ACTION CHECKLIST" -ForegroundColor Magenta
Write-Host "===============" -ForegroundColor Magenta
Write-Host ""
Write-Host "[ ] 1. Update .env: Replace PI_API_KEY placeholder with real value"
Write-Host "[ ] 2. Update .env: Replace PI_INTERNAL_API_KEY placeholder with real value"
Write-Host "[ ] 3. Get VERCEL_TOKEN from https://vercel.com/account/tokens"
Write-Host "[ ] 4. Get VERCEL_ORG_ID and VERCEL_PROJECT_ID from Vercel"
Write-Host "[ ] 5. Add 4 GitHub secrets"
Write-Host "[ ] 6. Add 7 Vercel environment variables"
Write-Host "[ ] 7. Push to GitHub to trigger deployment"
Write-Host ""
Write-Host "Once complete, run: git push origin main" -ForegroundColor Cyan
Write-Host ""
