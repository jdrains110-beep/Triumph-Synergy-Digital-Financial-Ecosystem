# Script to open Pi Node communication ports (31400-31409) in Windows Firewall
# Run this script as Administrator

# Check if running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Please run this script as Administrator!" -ForegroundColor Red
    exit 1
}

# Open ports 31400-31409 for TCP inbound
for ($port = 31400; $port -le 31409; $port++) {
    $ruleName = "Pi Node Port $port"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if ($existingRule) {
        Write-Host "Firewall rule for port $port already exists." -ForegroundColor Yellow
    } else {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow
        Write-Host "Opened port $port for Pi Node communication." -ForegroundColor Green
    }
}

Write-Host "Pi Node ports configuration complete! 🚀" -ForegroundColor Green