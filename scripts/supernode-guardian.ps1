# Pi Network Supernode Guardian Service
# Monitors and maintains Pi Node for 24/7 supernode operation
# Ensures node stays synced and accepts connections from other nodes

param(
    [switch]$RunOnce,
    [int]$CheckIntervalSeconds = 60
)

$ErrorActionPreference = "Continue"
$script:LogPath = "$env:USERPROFILE\PiNode\logs"
$script:LogFile = "$script:LogPath\supernode-guardian-$(Get-Date -Format 'yyyy-MM-dd').log"
$script:StatusFile = "$env:USERPROFILE\PiNode\status.json"
$script:ContainerName = "testnet2"

# Ensure log directory exists
if (-not (Test-Path $script:LogPath)) {
    New-Item -ItemType Directory -Path $script:LogPath -Force | Out-Null
}

function Write-Log {
    param($Message, [ValidateSet('INFO','WARN','ERROR','SUCCESS')]$Level = 'INFO')
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp [$Level] $Message"
    $logEntry | Add-Content -Path $script:LogFile
    
    $color = switch ($Level) {
        'INFO' { 'White' }
        'WARN' { 'Yellow' }
        'ERROR' { 'Red' }
        'SUCCESS' { 'Green' }
    }
    Write-Host $logEntry -ForegroundColor $color
}

function Get-NodeStatus {
    try {
        $info = docker exec $script:ContainerName stellar-core http-command "info" 2>&1 | Out-String
        
        $status = @{
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            ContainerRunning = $true
            StellarCoreRunning = $true
            State = "Unknown"
            Peers = 0
            Ledger = 0
            Synced = $false
        }
        
        if ($info -match '"state"\s*:\s*"([^"]+)"') {
            $status.State = $matches[1]
            $status.Synced = $status.State -eq "Synced!"
        }
        
        if ($info -match '"authenticated_count"\s*:\s*(\d+)') {
            $status.Peers = [int]$matches[1]
        }
        
        if ($info -match '"num"\s*:\s*(\d+)') {
            $status.Ledger = [int]$matches[1]
        }
        
        return $status
    }
    catch {
        return @{
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            ContainerRunning = $false
            StellarCoreRunning = $false
            State = "Error"
            Peers = 0
            Ledger = 0
            Synced = $false
            Error = $_.Exception.Message
        }
    }
}

function Test-ContainerHealth {
    $container = docker ps -q -f "name=$script:ContainerName" 2>&1
    return -not [string]::IsNullOrEmpty($container)
}

function Start-Container {
    Write-Log "Starting Pi Node container..." -Level WARN
    docker start $script:ContainerName 2>&1 | Out-Null
    Start-Sleep -Seconds 10
    return Test-ContainerHealth
}

function Restart-StellarCore {
    Write-Log "Restarting stellar-core process..." -Level WARN
    docker exec $script:ContainerName supervisorctl restart stellar-core 2>&1 | Out-Null
    Start-Sleep -Seconds 10
}

function Test-PortAccessibility {
    # Test if ports are accessible from outside
    $ports = @(31401, 31402, 31403)
    $results = [ordered]@{}
    
    foreach ($port in $ports) {
        $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        $results["$port"] = ($null -ne $listener)
    }
    
    return $results
}

function Test-IncomingConnections {
    # Check if other nodes can connect to us
    $connections = Get-NetTCPConnection -LocalPort 31402 -State Established -ErrorAction SilentlyContinue
    return @{
        Count = ($connections | Measure-Object).Count
        RemoteAddresses = $connections | Select-Object -ExpandProperty RemoteAddress -Unique
    }
}

function Optimize-NetworkSettings {
    # Ensure network adapter is optimized for node operation
    $adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
    foreach ($adapter in $adapters) {
        try {
            # Disable power management on network adapter
            $adapterPower = Get-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction SilentlyContinue
            if ($adapterPower) {
                Set-NetAdapterPowerManagement -Name $adapter.Name -WakeOnMagicPacket Enabled -ErrorAction SilentlyContinue
            }
        } catch {}
    }
}

function Update-StatusFile {
    param($Status)
    
    $portStatus = Test-PortAccessibility
    $incomingConn = Test-IncomingConnections
    
    $statusData = [ordered]@{
        LastCheck = $Status.Timestamp
        NodeState = $Status.State
        IsSynced = $Status.Synced
        ConnectedPeers = $Status.Peers
        CurrentLedger = $Status.Ledger
        ContainerRunning = $Status.ContainerRunning
        Port31401 = $portStatus["31401"]
        Port31402 = $portStatus["31402"]
        Port31403 = $portStatus["31403"]
        IncomingConnections = $incomingConn.Count
    }
    
    $statusData | ConvertTo-Json -Depth 3 | Set-Content -Path $script:StatusFile -Force
}

function Invoke-HealthCheck {
    Write-Log "Running health check..." -Level INFO
    
    # 1. Check if Docker is running
    $dockerProcess = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $dockerProcess) {
        Write-Log "Docker Desktop is not running! Starting..." -Level ERROR
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Start-Sleep -Seconds 30
    }
    
    # 2. Check if container is running
    if (-not (Test-ContainerHealth)) {
        Write-Log "Container not running. Starting..." -Level WARN
        if (Start-Container) {
            Write-Log "Container started successfully" -Level SUCCESS
        } else {
            Write-Log "Failed to start container!" -Level ERROR
            return
        }
    }
    
    # 3. Get node status
    $status = Get-NodeStatus
    
    # 4. Check sync state
    if ($status.State -eq "Joining SCP" -or $status.State -eq "Catching up") {
        Write-Log "Node is syncing: $($status.State)" -Level INFO
    }
    elseif ($status.State -eq "Synced!") {
        Write-Log "Node synced! Ledger: $($status.Ledger), Peers: $($status.Peers)" -Level SUCCESS
    }
    elseif ($status.State -eq "Booting") {
        Write-Log "Node is booting, waiting..." -Level INFO
    }
    else {
        Write-Log "Node in unexpected state: $($status.State). Restarting stellar-core..." -Level WARN
        Restart-StellarCore
        Start-Sleep -Seconds 15
        $status = Get-NodeStatus
    }
    
    # 5. Check peer count - supernode needs good peer connectivity
    if ($status.Synced -and $status.Peers -lt 3) {
        Write-Log "Low peer count ($($status.Peers)). May need network check." -Level WARN
    }
    elseif ($status.Peers -ge 8) {
        Write-Log "Excellent peer connectivity: $($status.Peers) peers" -Level SUCCESS
    }
    
    # 6. Check incoming connections (other nodes connecting to us)
    $incoming = Test-IncomingConnections
    if ($incoming.Count -gt 0) {
        Write-Log "Serving $($incoming.Count) incoming node connections" -Level SUCCESS
    }
    
    # 7. Update status file
    Update-StatusFile -Status $status
    
    return $status
}

function Start-SupernodeGuardian {
    Write-Log "========================================" -Level INFO
    Write-Log "Pi Network Supernode Guardian Starting" -Level INFO
    Write-Log "Container: $script:ContainerName" -Level INFO
    Write-Log "Check Interval: ${CheckIntervalSeconds}s" -Level INFO
    Write-Log "========================================" -Level INFO
    
    # Initial optimization
    Optimize-NetworkSettings
    
    # Initial health check
    $status = Invoke-HealthCheck
    
    if ($RunOnce) {
        Write-Log "Single check complete. Exiting." -Level INFO
        return $status
    }
    
    # Continuous monitoring loop
    Write-Log "Starting continuous monitoring (Ctrl+C to stop)..." -Level INFO
    
    $stuckCount = 0
    $lastLedger = 0
    
    while ($true) {
        Start-Sleep -Seconds $CheckIntervalSeconds
        
        $status = Invoke-HealthCheck
        
        # Detect if node is stuck (ledger not advancing)
        if ($status.Synced) {
            if ($status.Ledger -eq $lastLedger) {
                $stuckCount++
                if ($stuckCount -ge 5) {
                    Write-Log "Node appears stuck (ledger not advancing). Restarting..." -Level WARN
                    Restart-StellarCore
                    $stuckCount = 0
                }
            } else {
                $stuckCount = 0
            }
            $lastLedger = $status.Ledger
        }
    }
}

# Run the guardian
Start-SupernodeGuardian
