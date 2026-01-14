#!/usr/bin/env pwsh
# Test Pi Network domain verification with smart key switching

Write-Host "Testing Pi Network Domain Verification" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://triumph-synergy.vercel.app/validation-key.txt"
$testnetKey = "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3"
$mainnetKey = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195"

# Test default (should be mainnet)
Write-Host "Testing DEFAULT (no parameters)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing
    $key = $response.Content.Trim()
    $mode = $response.Headers["X-Pi-Verification"]
    
    Write-Host "  URL: $baseUrl" -ForegroundColor Gray
    Write-Host "  Detected Mode: $mode" -ForegroundColor Gray
    
    if ($key -eq $mainnetKey) {
        Write-Host "  DEFAULT KEY: MAINNET (CORRECT)" -ForegroundColor Green
    } elseif ($key -eq $testnetKey) {
        Write-Host "  DEFAULT KEY: TESTNET" -ForegroundColor Yellow
    } else {
        Write-Host "  DEFAULT KEY: UNKNOWN" -ForegroundColor Red
    }
} catch {
    Write-Host "  Failed to fetch default key" -ForegroundColor Red
}

Write-Host ""

# Test explicit testnet
Write-Host "Testing TESTNET (with ?mode=testnet)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?mode=testnet" -UseBasicParsing
    $key = $response.Content.Trim()
    $mode = $response.Headers["X-Pi-Verification"]
    
    Write-Host "  URL: $baseUrl?mode=testnet" -ForegroundColor Gray
    Write-Host "  Detected Mode: $mode" -ForegroundColor Gray
    
    if ($key -eq $testnetKey) {
        Write-Host "  TESTNET KEY: CORRECT" -ForegroundColor Green
    } else {
        Write-Host "  TESTNET KEY: WRONG" -ForegroundColor Red
    }
} catch {
    Write-Host "  Failed to fetch testnet key" -ForegroundColor Red
}

Write-Host ""

# Test explicit mainnet
Write-Host "Testing MAINNET (with ?mode=mainnet)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?mode=mainnet" -UseBasicParsing
    $key = $response.Content.Trim()
    $mode = $response.Headers["X-Pi-Verification"]
    
    Write-Host "  URL: $baseUrl?mode=mainnet" -ForegroundColor Gray
    Write-Host "  Detected Mode: $mode" -ForegroundColor Gray
    
    if ($key -eq $mainnetKey) {
        Write-Host "  MAINNET KEY: CORRECT" -ForegroundColor Green
    } else {
        Write-Host "  MAINNET KEY: WRONG" -ForegroundColor Red
    }
} catch {
    Write-Host "  Failed to fetch mainnet key" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Instructions for Pi Portal:" -ForegroundColor Cyan
Write-Host "Testnet: Use https://triumph-synergy.vercel.app/validation-key.txt?mode=testnet" -ForegroundColor Gray
Write-Host "Mainnet: Use https://triumph-synergy.vercel.app/validation-key.txt?mode=mainnet" -ForegroundColor Gray
Write-Host "OR let auto-detection work based on portal referer" -ForegroundColor Gray
