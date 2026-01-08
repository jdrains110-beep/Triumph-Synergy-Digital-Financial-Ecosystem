# Pi Node Health Monitor Script
# Runs every 5 minutes to ensure Pi Node services are operational

$logPath = "$env:USERPROFILE\PiNode\logs"
$logFile = "$logPath\pi-node-monitor-$(Get-Date -Format 'yyyy-MM-dd').log"

if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
}

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Add-Content -Path $logFile
}

Write-Log "Pi Node health check started"

# Check if Pi Browser/Node is running
$piProcesses = @("Pi Browser", "Pi Node", "stellar-core", "horizon")
$running = $false

foreach ($proc in $piProcesses) {
    $process = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($process) {
        Write-Log "Process $proc is running (PID: $($process.Id))"
        $running = $true
    }
}

# Check port connectivity
$ports = @(31400, 31401, 31402, 31403, 31404, 31405, 31406, 31407, 31408, 31409)
$openPorts = 0

foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        $openPorts++
    }
}

Write-Log "Open Pi ports: $openPorts/10"

# Check network connectivity to Stellar Horizon
try {
    $response = Invoke-WebRequest -Uri "https://horizon.stellar.org" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Log "Stellar Horizon connectivity: OK"
    }
} catch {
    Write-Log "Stellar Horizon connectivity: FAILED - $($_.Exception.Message)"
}

# Check supernode account status
try {
    $accountUrl = "https://horizon.stellar.org/accounts/GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
    $account = Invoke-RestMethod -Uri $accountUrl -TimeoutSec 15
    Write-Log "Supernode account active - Sequence: $($account.sequence)"
} catch {
    Write-Log "Supernode account check: $($_.Exception.Message)"
}

Write-Log "Pi Node health check completed"
