#!/usr/bin/env pwsh
# setup-pi-sdk.ps1
# Configure Pi SDK environment variables for Vercel deployment

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Triumph Synergy - Pi SDK Environment Setup for Vercel        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Required environment variables for Pi SDK
$requiredVars = @(
    @{
        Name        = "PI_API_KEY"
        Description = "Your Pi Network API Key from pi-apps.github.io"
        IsSecret    = $true
        DefaultValue = "your-api-key-here"
    },
    @{
        Name        = "PI_API_SECRET"
        Description = "Your Pi Network API Secret (for server-side verification)"
        IsSecret    = $true
        DefaultValue = "your-api-secret-here"
    },
    @{
        Name        = "PI_INTERNAL_API_KEY"
        Description = "Pi Network Internal API Key (for internal payments)"
        IsSecret    = $true
        DefaultValue = "your-internal-key-here"
    },
    @{
        Name        = "NEXT_PUBLIC_PI_SANDBOX"
        Description = "Enable Pi SDK Sandbox Mode (true/false)"
        IsSecret    = $false
        DefaultValue = "false"
    },
    @{
        Name        = "PI_SANDBOX_MODE"
        Description = "Server-side Pi Sandbox Mode (true/false)"
        IsSecret    = $false
        DefaultValue = "false"
    }
)

Write-Host "Step 1: Get Your Pi API Credentials" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Visit: https://pi-apps.github.io" -ForegroundColor Green
Write-Host "1. Sign in to Pi App Platform"
Write-Host "2. Navigate to 'Development' → 'Credentials'"
Write-Host "3. Create or select your app"
Write-Host "4. Copy your API Key and API Secret"
Write-Host ""

Write-Host "Step 2: Configure Vercel Environment Variables" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Option A: Using Vercel CLI" -ForegroundColor Cyan
Write-Host "  1. Install Vercel CLI: npm install -g vercel"
Write-Host "  2. Login: vercel login"
Write-Host "  3. Run: vercel env pull"
Write-Host "  4. Add the following to .env.local:"
Write-Host ""

foreach ($var in $requiredVars) {
    if ($var.IsSecret) {
        Write-Host "  $($var.Name)=<paste-your-secret-value>" -ForegroundColor Magenta
    }
    else {
        Write-Host "  $($var.Name)=$($var.DefaultValue)" -ForegroundColor Magenta
    }
}

Write-Host ""
Write-Host "  5. Run: vercel env push"
Write-Host ""
Write-Host "Option B: Vercel Dashboard" -ForegroundColor Cyan
Write-Host "  1. Go to https://vercel.com/dashboard"
Write-Host "  2. Select your project"
Write-Host "  3. Settings → Environment Variables"
Write-Host "  4. Add each variable:"
Write-Host ""

foreach ($var in $requiredVars) {
    Write-Host "     • $($var.Name)" -ForegroundColor Green
    Write-Host "       $($var.Description)" -ForegroundColor Gray
    if ($var.IsSecret) {
        Write-Host "       [SECRET - Paste your value]" -ForegroundColor Yellow
    }
    else {
        Write-Host "       Value: $($var.DefaultValue)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Step 3: Configure for Different Environments" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "PRODUCTION:" -ForegroundColor Green
Write-Host "  NEXT_PUBLIC_PI_SANDBOX=false"
Write-Host "  PI_SANDBOX_MODE=false"
Write-Host ""
Write-Host "STAGING:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_PI_SANDBOX=true"
Write-Host "  PI_SANDBOX_MODE=true"
Write-Host ""
Write-Host "DEVELOPMENT (Local):" -ForegroundColor Blue
Write-Host "  NEXT_PUBLIC_PI_SANDBOX=true"
Write-Host "  PI_SANDBOX_MODE=true"
Write-Host ""

Write-Host "Step 4: Verify Integration" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "After deployment:"
Write-Host "  1. Navigate to your app's payment page"
Write-Host "  2. Check browser console for Pi SDK initialization"
Write-Host "  3. Look for: '[Pi SDK] Pi SDK initialized successfully'"
Write-Host "  4. Try a test payment to verify integration"
Write-Host ""

Write-Host "Step 5: Update GitHub Actions Secrets (for CI/CD)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Go to: https://github.com/jdrains110-beep/triumph-synergy/settings/secrets"
Write-Host "Add the same secrets for GitHub Actions:"
Write-Host ""

foreach ($var in $requiredVars | Where-Object { $_.IsSecret }) {
    Write-Host "  • $($var.Name)" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "Step 6: Test Pi SDK Connection" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Run locally:"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Check the browser console (F12 → Console tab) for:"
Write-Host "  ✓ '[Pi SDK] Pi SDK initialized successfully'"
Write-Host "  ✓ '[Pi SDK] User authenticated: { user: { uid: ... } }'"
Write-Host ""

Write-Host "Troubleshooting:" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Issue: Pi SDK script not loading" -ForegroundColor Yellow
Write-Host "  → Check CORS headers in vercel.json"
Write-Host "  → Verify SDK URL: https://sdk.minepi.com/pi-sdk.js"
Write-Host ""
Write-Host "Issue: Authentication fails" -ForegroundColor Yellow
Write-Host "  → Ensure NEXT_PUBLIC_PI_SANDBOX is set correctly"
Write-Host "  → Check your app ID matches Pi App Platform"
Write-Host ""
Write-Host "Issue: Payment verification fails" -ForegroundColor Yellow
Write-Host "  → Verify PI_API_KEY and PI_API_SECRET are correct"
Write-Host "  → Check payment transaction ID format"
Write-Host "  → Review /api/payments logs in Vercel dashboard"
Write-Host ""

Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
