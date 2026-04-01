# Pi Node Startup Service Script
# This runs at system startup to ensure Pi Node is always ready
# Optimized for Supernode status

$logPath = "$env:USERPROFILE\PiNode\logs"
$logFile = "$logPath\pi-node-startup-$(Get-Date -Format 'yyyy-MM-dd').log"
$containerName = "testnet2"

if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
}

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Add-Content -Path $logFile
    Write-Host "$timestamp - $Message"
}

Write-Log "==================== Pi Node Startup ===================="
Write-Log "Supernode: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
Write-Log "Container: $containerName"

# Step 1: Ensure Docker Desktop is running
Write-Log "Checking Docker Desktop..."
$docker = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Log "Starting Docker Desktop..."
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Log "Waiting for Docker to initialize (60 seconds)..."
        Start-Sleep -Seconds 60
    }
    else {
        Write-Log "ERROR: Docker Desktop not found at $dockerPath"
    }
}
else {
    Write-Log "Docker Desktop is running"
}

# Step 2: Wait for Docker daemon to be ready
Write-Log "Waiting for Docker daemon..."
$attempts = 0
$maxAttempts = 30
while ($attempts -lt $maxAttempts) {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Docker daemon is ready"
            break
        }
    }
    catch {}
    $attempts++
    Start-Sleep -Seconds 2
}

# Step 3: Start Pi Node container if not running
Write-Log "Checking Pi Node container..."
$containerRunning = docker ps -q -f "name=$containerName" 2>&1
if ([string]::IsNullOrEmpty($containerRunning)) {
    Write-Log "Starting Pi Node container..."
    docker start $containerName 2>&1 | Out-Null
    Start-Sleep -Seconds 10
}

# Step 4: Verify stellar-core is running and synced
Write-Log "Checking stellar-core status..."
$attempts = 0
$maxAttempts = 12  # Wait up to 2 minutes
while ($attempts -lt $maxAttempts) {
    try {
        $info = docker exec $containerName stellar-core http-command "info" 2>&1 | Out-String
        if ($info -match '"state"\s*:\s*"([^"]+)"') {
            $state = $matches[1]
            Write-Log "stellar-core state: $state"
            
            if ($state -eq "Synced!") {
                Write-Log "Node is synced and ready!"
                break
            }
            elseif ($state -eq "Joining SCP" -and $attempts -gt 6) {
                Write-Log "Node stuck at Joining SCP, restarting stellar-core..."
                docker exec $containerName supervisorctl restart stellar-core 2>&1 | Out-Null
            }
        }
    }
    catch {
        Write-Log "Waiting for stellar-core to start..."
    }
    $attempts++
    Start-Sleep -Seconds 10
}

# Step 5: Verify firewall ports
Write-Log "Checking firewall configuration..."
$portCount = (Get-NetFirewallRule -DisplayName "Pi Node*" -ErrorAction SilentlyContinue | Measure-Object).Count
if ($portCount -ge 20) {
    Write-Log "Firewall: $portCount rules active (OK)"
}
else {
    Write-Log "Firewall: Only $portCount rules found - may need reconfiguration"
}

# Step 6: Check incoming connections (supernode capability)
Write-Log "Checking incoming node connections..."
$incomingConnections = Get-NetTCPConnection -LocalPort 31402 -State Established -ErrorAction SilentlyContinue
$incomingCount = ($incomingConnections | Measure-Object).Count
Write-Log "Incoming peer connections: $incomingCount"

# Step 7: Verify network adapter settings
Write-Log "Checking network configuration..."
$activeAdapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($adapter in $activeAdapters) {
    Write-Log "Active adapter: $($adapter.Name) - $($adapter.LinkSpeed)"
}

# Step 8: Get final node status
$finalInfo = docker exec $containerName stellar-core http-command "info" 2>&1 | Out-String
$peerCount = 0
$ledgerNum = 0
$nodeState = "Unknown"
if ($finalInfo -match '"authenticated_count"\s*:\s*(\d+)') { $peerCount = $matches[1] }
if ($finalInfo -match '"num"\s*:\s*(\d+)') { $ledgerNum = $matches[1] }
if ($finalInfo -match '"state"\s*:\s*"([^"]+)"') { $nodeState = $matches[1] }

# Log system info
Write-Log "System: $env:COMPUTERNAME"
Write-Log "User: $env:USERNAME"
Write-Log "==================== Startup Complete ===================="

# Keep a summary of recent activity
$summaryFile = "$logPath\latest-status.txt"
@"
Pi Network Supernode Status
===========================
Last Check: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Container: $containerName
Node State: $nodeState
Connected Peers: $peerCount
Current Ledger: $ledgerNum
Incoming Connections: $incomingCount
Firewall Rules: $portCount active

SUPERNODE REQUIREMENTS:
- Node State: $(if($nodeState -eq 'Synced!'){'[OK]'}else{'[PENDING]'}) Synced
- Peer Count: $(if([int]$peerCount -ge 5){'[OK]'}else{'[LOW]'}) $peerCount peers
- Port Open: $(if($portCount -ge 20){'[OK]'}else{'[CHECK]'}) Firewall configured
- 24/7 Uptime: Keep this computer running!

ROUTER PORT FORWARDING REQUIRED:
Forward these ports to this computer's local IP:
- Port 31402 TCP (Pi Node P2P)
- Port 31401 TCP (Horizon API)
- Port 31403 TCP (Admin)
"@ | Set-Content -Path $summaryFile

Write-Log "Status saved to: $summaryFile"
