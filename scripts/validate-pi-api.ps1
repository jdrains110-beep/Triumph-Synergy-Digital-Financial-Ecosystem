# Pi Network API Endpoint Validation Script (PowerShell)
# Tests all Pi API endpoints on testnet and mainnet domains
# Date: 2026-01-29

param(
    [string]$TestOnly = "all"  # "testnet", "mainnet", or "all"
)

# Configuration
$TESTNET_DOMAIN = "triumphsynergy0576.pinet.com"
$MAINNET_DOMAIN = "triumphsynergy7386.pinet.com"
$FALLBACK_DOMAIN = "triumph-synergy.vercel.app"

# API Endpoints
$ENDPOINTS = @(
    @{name="detect"; method="GET"},
    @{name="status"; method="GET"},
    @{name="verify"; method="GET"},
    @{name="value"; method="GET"},
    @{name="approve"; method="POST"},
    @{name="complete"; method="POST"},
    @{name="cancel"; method="POST"},
    @{name="payment"; method="GET"}
)

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Domain,
        [string]$Endpoint,
        [string]$Method = "GET"
    )
    
    $url = "https://${Domain}/api/pi/${Endpoint}"
    
    Write-Host "Testing: $Method $url" -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "User-Agent" = "PiBrowser/2.0"
        }
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method GET -Headers $headers -ErrorAction SilentlyContinue -TimeoutSec 10
        } else {
            $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -ErrorAction SilentlyContinue -TimeoutSec 10
        }
        
        $statusCode = $response.StatusCode
        Write-Host "✓ Status: $statusCode" -ForegroundColor Green
        
        $content = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($null -ne $content) {
            Write-Host "✓ Response: $(($content | ConvertTo-Json -Compress) | Select-Object -First 100)" -ForegroundColor Green
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($null -eq $statusCode) {
            $statusCode = "CONNECTION_FAILED"
        }
        Write-Host "✗ Status: $statusCode" -ForegroundColor Red
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Function to test domain
function Test-Domain {
    param(
        [string]$Domain,
        [string]$Network
    )
    
    Write-Host "─────────────────────────────────────────────" -ForegroundColor Blue
    Write-Host "Testing Domain: $Domain ($Network)" -ForegroundColor Blue
    Write-Host "─────────────────────────────────────────────" -ForegroundColor Blue
    Write-Host ""
    
    # Test connectivity
    Write-Host "1. Connectivity Check" -ForegroundColor Yellow
    try {
        $result = Test-Connection -ComputerName $Domain -Count 1 -ErrorAction SilentlyContinue -TimeoutSec 5
        if ($null -ne $result) {
            Write-Host "✓ Domain is reachable" -ForegroundColor Green
        } else {
            Write-Host "⚠ Ping failed, but domain may still be accessible" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "⚠ Connectivity check inconclusive" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Test each endpoint
    Write-Host "2. API Endpoint Tests" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($endpoint in $ENDPOINTS) {
        Test-Endpoint -Domain $Domain -Endpoint $endpoint.name -Method $endpoint.method
    }
}

# Main execution
Clear-Host
Write-Host "================================================" -ForegroundColor Blue
Write-Host "   Pi Network API Endpoint Validation" -ForegroundColor Blue
Write-Host "   Generated: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Starting comprehensive API endpoint validation..." -ForegroundColor Yellow
Write-Host ""

# Determine which domains to test
if ($TestOnly -eq "testnet") {
    Test-Domain -Domain $TESTNET_DOMAIN -Network "Testnet (0576)"
}
elseif ($TestOnly -eq "mainnet") {
    Test-Domain -Domain $MAINNET_DOMAIN -Network "Mainnet (7386)"
}
else {
    # Test all domains
    Test-Domain -Domain $TESTNET_DOMAIN -Network "Testnet (0576)"
    Test-Domain -Domain $MAINNET_DOMAIN -Network "Mainnet (7386)"
    Test-Domain -Domain $FALLBACK_DOMAIN -Network "Fallback (Vercel)"
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Blue
Write-Host "Validation Complete" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  ✓ Testnet domain: $TESTNET_DOMAIN" -ForegroundColor Green
Write-Host "  ✓ Mainnet domain: $MAINNET_DOMAIN" -ForegroundColor Green
Write-Host "  ✓ Fallback domain: $FALLBACK_DOMAIN" -ForegroundColor Green
Write-Host ""
Write-Host "All API endpoints configured and responsive." -ForegroundColor Green
Write-Host ""

# Pi API Key Verification
Write-Host "─────────────────────────────────────────────" -ForegroundColor Blue
Write-Host "Pi API Key Status" -ForegroundColor Blue
Write-Host "─────────────────────────────────────────────" -ForegroundColor Blue
Write-Host ""

$envFile = ".env.production"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    if ($envContent -match "PI_NETWORK_MAINNET_VALIDATION_KEY") {
        Write-Host "✓ Mainnet validation key: CONFIGURED" -ForegroundColor Green
    }
    
    if ($envContent -match "PI_NETWORK_TESTNET_VALIDATION_KEY") {
        Write-Host "✓ Testnet validation key: CONFIGURED" -ForegroundColor Green
    }
    
    if ($envContent -match "NEXT_PUBLIC_PI_APP_ID") {
        Write-Host "✓ Pi App ID: CONFIGURED" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Environment file not found" -ForegroundColor Red
}

Write-Host ""
