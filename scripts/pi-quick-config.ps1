# Pi Node Quick Configuration - Run this directly
# This configures the essential settings for Pi Node operation

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Pi Network Supernode - Quick Configuration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"& { 
        # Configure Firewall Ports
        for (`$port = 31400; `$port -le 31409; `$port++) {
            `$rule = Get-NetFirewallRule -DisplayName `"Pi Node Port `$port`" -ErrorAction SilentlyContinue
            if (-not `$rule) {
                New-NetFirewallRule -DisplayName `"Pi Node Port `$port`" -Direction Inbound -Protocol TCP -LocalPort `$port -Action Allow -Profile Any | Out-Null
                New-NetFirewallRule -DisplayName `"Pi Node Port `$port Out`" -Direction Outbound -Protocol TCP -LocalPort `$port -Action Allow -Profile Any | Out-Null
                Write-Host `"Opened port `$port`" -ForegroundColor Green
            }
        }
        
        # Additional Stellar ports
        @(11625, 11626, 8000) | ForEach-Object {
            `$port = `$_
            `$rule = Get-NetFirewallRule -DisplayName `"Stellar Port `$port`" -ErrorAction SilentlyContinue
            if (-not `$rule) {
                New-NetFirewallRule -DisplayName `"Stellar Port `$port`" -Direction Inbound -Protocol TCP -LocalPort `$port -Action Allow | Out-Null
            }
        }
        
        # Power settings - never sleep on AC
        powercfg /change standby-timeout-ac 0
        powercfg /change hibernate-timeout-ac 0
        
        Write-Host `"`nPi Node ports configured successfully!`" -ForegroundColor Green
        Write-Host `"Supernode: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V`" -ForegroundColor Cyan
        Start-Sleep -Seconds 3
    }`"" -Verb RunAs -Wait
} else {
    # Already admin, run directly
    for ($port = 31400; $port -le 31409; $port++) {
        $rule = Get-NetFirewallRule -DisplayName "Pi Node Port $port" -ErrorAction SilentlyContinue
        if (-not $rule) {
            New-NetFirewallRule -DisplayName "Pi Node Port $port" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
            New-NetFirewallRule -DisplayName "Pi Node Port $port Out" -Direction Outbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
            Write-Host "Opened port $port" -ForegroundColor Green
        } else {
            Write-Host "Port $port already configured" -ForegroundColor Yellow
        }
    }
    
    powercfg /change standby-timeout-ac 0
    powercfg /change hibernate-timeout-ac 0
    
    Write-Host "`nConfiguration complete!" -ForegroundColor Green
}

# Set environment variables (doesn't require admin)
[Environment]::SetEnvironmentVariable("PI_SUPERNODE_ADDRESS", "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V", "User")
[Environment]::SetEnvironmentVariable("STELLAR_HORIZON_URL", "https://horizon.stellar.org", "User")
[Environment]::SetEnvironmentVariable("PI_NODE_PORTS", "31400-31409", "User")

Write-Host ""
Write-Host "Environment variables set for current user" -ForegroundColor Green
Write-Host ""
Write-Host "Your Pi Supernode Address:" -ForegroundColor Cyan
Write-Host "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V" -ForegroundColor White
