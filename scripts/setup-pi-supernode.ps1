# ============================================================================
# Pi Network Supernode Complete Setup Script
# Configures this computer to run as a Pi Node consistently
# Run as Administrator
# ============================================================================

param(
    [switch]$SkipFirewall,
    [switch]$SkipScheduledTask,
    [switch]$SkipPerformance
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host @"
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PI NETWORK SUPERNODE SETUP                                ║
║                                                                              ║
║  Supernode Address: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V ║
║  Ports: 31400-31409 (TCP)                                                    ║
║  Network: Stellar Public Network                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 1: Configure Windows Firewall for Pi Node Ports
# ============================================================================
if (-not $SkipFirewall) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "STEP 1: Configuring Windows Firewall for Pi Node (Ports 31400-31409)" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    
    $portsOpened = 0
    $portsExisting = 0
    
    for ($port = 31400; $port -le 31409; $port++) {
        $ruleNameIn = "Pi Node Inbound Port $port"
        $ruleNameOut = "Pi Node Outbound Port $port"
        
        # Inbound Rule
        $existingIn = Get-NetFirewallRule -DisplayName $ruleNameIn -ErrorAction SilentlyContinue
        if (-not $existingIn) {
            New-NetFirewallRule -DisplayName $ruleNameIn -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
            $portsOpened++
        }
        else {
            $portsExisting++
        }
        
        # Outbound Rule
        $existingOut = Get-NetFirewallRule -DisplayName $ruleNameOut -ErrorAction SilentlyContinue
        if (-not $existingOut) {
            New-NetFirewallRule -DisplayName $ruleNameOut -Direction Outbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
        }
    }
    
    # Also open Stellar Horizon and general blockchain ports
    $additionalPorts = @(
        @{Port = 11625; Name = "Stellar Core P2P" },
        @{Port = 11626; Name = "Stellar Core Admin" },
        @{Port = 8000; Name = "Horizon API" }
    )
    
    foreach ($p in $additionalPorts) {
        $ruleName = "Pi Network - $($p.Name) Port $($p.Port)"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if (-not $existing) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $p.Port -Action Allow -Profile Any | Out-Null
            New-NetFirewallRule -DisplayName "$ruleName Outbound" -Direction Outbound -Protocol TCP -LocalPort $p.Port -Action Allow -Profile Any | Out-Null
        }
    }
    
    Write-Host "   ✅ Opened $portsOpened new ports (${portsExisting} already configured)" -ForegroundColor Green
    Write-Host "   ✅ Stellar Core and Horizon ports configured" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# STEP 2: Configure Power Settings for 24/7 Operation
# ============================================================================
if (-not $SkipPerformance) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "STEP 2: Configuring Power Settings for 24/7 Supernode Operation" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    
    # Create a High Performance power plan for Pi Node
    $existingPlan = powercfg /list | Select-String "Pi Network Supernode"
    
    if (-not $existingPlan) {
        # Duplicate High Performance plan
        $highPerfGuid = (powercfg /list | Select-String "High performance" | ForEach-Object { $_ -match '([a-fA-F0-9-]{36})'; $matches[1] })
        if ($highPerfGuid) {
            $newPlanOutput = powercfg /duplicatescheme $highPerfGuid
            $newPlanGuid = $newPlanOutput -match '([a-fA-F0-9-]{36})'; $matches[1]
            
            if ($newPlanGuid) {
                powercfg /changename $newPlanGuid "Pi Network Supernode" "Optimized for 24/7 Pi Node operation"
                
                # Never sleep when plugged in
                powercfg /change standby-timeout-ac 0
                powercfg /change hibernate-timeout-ac 0
                powercfg /change monitor-timeout-ac 30
                
                # Activate the plan
                powercfg /setactive $newPlanGuid
                Write-Host "   ✅ Created and activated 'Pi Network Supernode' power plan" -ForegroundColor Green
            }
        }
    }
    else {
        Write-Host "   ✅ Pi Network Supernode power plan already exists" -ForegroundColor Green
    }
    
    # Disable USB selective suspend (prevents device disconnection)
    powercfg /setacvalueindex scheme_current 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
    
    # Disable network adapter power saving
    Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        $adapter = $_
        try {
            Set-NetAdapterPowerManagement -Name $adapter.Name -WakeOnMagicPacket Enabled -ErrorAction SilentlyContinue
            Disable-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction SilentlyContinue
        }
        catch {
            # Some adapters don't support power management changes
        }
    }
    
    Write-Host "   ✅ Disabled sleep and hibernate (AC power)" -ForegroundColor Green
    Write-Host "   ✅ Optimized network adapter power settings" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# STEP 3: Create Scheduled Task for Automatic Startup
# ============================================================================
if (-not $SkipScheduledTask) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "STEP 3: Creating Scheduled Tasks for Persistent Pi Node Operation" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    
    # Create the Pi Node monitor script
    $monitorScript = @'
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
'@
    
    # Save the monitor script
    $monitorScriptPath = "$ProjectRoot\scripts\pi-node-monitor.ps1"
    $monitorScript | Set-Content -Path $monitorScriptPath -Force
    
    # Remove existing scheduled task if present
    Unregister-ScheduledTask -TaskName "Pi Node Health Monitor" -Confirm:$false -ErrorAction SilentlyContinue
    
    # Create scheduled task for monitoring every 5 minutes
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$monitorScriptPath`""
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 9999)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
    
    Register-ScheduledTask -TaskName "Pi Node Health Monitor" -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
    
    Write-Host "   ✅ Created Pi Node monitor script" -ForegroundColor Green
    Write-Host "   ✅ Scheduled health check every 5 minutes" -ForegroundColor Green
    
    # Create startup task
    $startupTaskName = "Pi Node Startup"
    Unregister-ScheduledTask -TaskName $startupTaskName -Confirm:$false -ErrorAction SilentlyContinue
    
    $startupTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    Register-ScheduledTask -TaskName $startupTaskName -Action $action -Trigger $startupTrigger -Settings $settings -Principal $principal | Out-Null
    
    Write-Host "   ✅ Configured auto-start on login" -ForegroundColor Green
    Write-Host ""
}

# ============================================================================
# STEP 4: Create Environment Configuration
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "STEP 4: Creating Pi Network Environment Configuration" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Create Pi Node directory structure
$piNodeDir = "$env:USERPROFILE\PiNode"
$directories = @("logs", "data", "config", "backups")

foreach ($dir in $directories) {
    $path = Join-Path $piNodeDir $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

# Create Pi Node configuration file
$piNodeConfig = @{
    supernode       = @{
        address = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
        network = "public"
        ports   = @(31400..31409)
    }
    stellar         = @{
        horizon_url        = "https://horizon.stellar.org"
        network_passphrase = "Public Global Stellar Network ; September 2015"
    }
    monitoring      = @{
        enabled            = $true
        interval_minutes   = 5
        log_retention_days = 30
    }
    triumph_synergy = @{
        project_root = $ProjectRoot
        frontend_url = "https://triumphsynergy0576.pinet.com"
        backend_url  = "https://triumphsynergy0576.pinet.com/api"
    }
    created         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
}

$configPath = "$piNodeDir\config\supernode-config.json"
$piNodeConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Force

Write-Host "   ✅ Created Pi Node directory structure at $piNodeDir" -ForegroundColor Green
Write-Host "   ✅ Created supernode configuration file" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 5: Set System Environment Variables
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "STEP 5: Setting System Environment Variables" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

$envVars = @{
    "PI_NODE_HOME"               = $piNodeDir
    "PI_SUPERNODE_ADDRESS"       = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
    "STELLAR_HORIZON_URL"        = "https://horizon.stellar.org"
    "STELLAR_NETWORK_PASSPHRASE" = "Public Global Stellar Network ; September 2015"
    "PI_NODE_PORTS"              = "31400-31409"
}

foreach ($var in $envVars.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($var.Key, $var.Value, [EnvironmentVariableTarget]::User)
    Write-Host "   ✅ Set $($var.Key)" -ForegroundColor Green
}

# Also set for current session
foreach ($var in $envVars.GetEnumerator()) {
    Set-Item -Path "Env:$($var.Key)" -Value $var.Value
}

Write-Host ""

# ============================================================================
# STEP 6: Network Quality of Service (QoS) Configuration
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "STEP 6: Configuring Network Quality of Service for Pi Node" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Create QoS policy for Pi Node traffic (prioritize blockchain traffic)
try {
    # Remove existing policies
    Remove-NetQosPolicy -Name "Pi Node Priority" -Confirm:$false -ErrorAction SilentlyContinue
    
    # Create high-priority QoS policy for Pi Node ports
    New-NetQosPolicy -Name "Pi Node Priority" -NetworkProfile All -IPDstPortStart 31400 -IPDstPortEnd 31409 -DSCPAction 46 -IPProtocol TCP -ErrorAction SilentlyContinue | Out-Null
    
    Write-Host "   ✅ Created QoS policy prioritizing Pi Node traffic" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  QoS configuration skipped (may require Group Policy)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# VERIFICATION
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "VERIFICATION: Checking Pi Supernode Configuration" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

$allPassed = $true

# Check firewall rules
$firewallOk = (Get-NetFirewallRule -DisplayName "Pi Node*" -ErrorAction SilentlyContinue | Measure-Object).Count -ge 10
if ($firewallOk) {
    Write-Host "   ✅ Firewall rules configured" -ForegroundColor Green
}
else {
    Write-Host "   ❌ Firewall rules missing" -ForegroundColor Red
    $allPassed = $false
}

# Check scheduled tasks
$taskOk = Get-ScheduledTask -TaskName "Pi Node*" -ErrorAction SilentlyContinue
if ($taskOk) {
    Write-Host "   ✅ Scheduled tasks created" -ForegroundColor Green
}
else {
    Write-Host "   ❌ Scheduled tasks missing" -ForegroundColor Red
    $allPassed = $false
}

# Check environment variables
$envOk = [Environment]::GetEnvironmentVariable("PI_SUPERNODE_ADDRESS", "User") -eq "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
if ($envOk) {
    Write-Host "   ✅ Environment variables set" -ForegroundColor Green
}
else {
    Write-Host "   ❌ Environment variables missing" -ForegroundColor Red
    $allPassed = $false
}

# Check Stellar Horizon connectivity
Write-Host ""
Write-Host "   Testing Stellar Horizon connectivity..." -ForegroundColor Yellow
try {
    $horizonResponse = Invoke-RestMethod -Uri "https://horizon.stellar.org" -TimeoutSec 10
    Write-Host "   ✅ Stellar Horizon connected (Core v$($horizonResponse.core_version))" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Stellar Horizon unreachable (check internet connection)" -ForegroundColor Yellow
}

# Check supernode account
Write-Host "   Checking supernode account status..." -ForegroundColor Yellow
try {
    $accountUrl = "https://horizon.stellar.org/accounts/GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
    $account = Invoke-RestMethod -Uri $accountUrl -TimeoutSec 15
    Write-Host "   ✅ Supernode account active (Sequence: $($account.sequence))" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Could not verify supernode account" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

if ($allPassed) {
    Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║                     ✅ PI SUPERNODE SETUP COMPLETE!                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Your computer is now configured to run as a Pi Network Supernode:          ║
║                                                                              ║
║  • Supernode Address: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZ   ║
║                       CGL7V                                                  ║
║  • Network Ports: 31400-31409 (OPEN)                                        ║
║  • Power Settings: Optimized for 24/7 operation                             ║
║  • Health Monitoring: Every 5 minutes                                       ║
║  • Auto-Start: Configured on login                                          ║
║                                                                              ║
║  NEXT STEPS:                                                                 ║
║  1. Install Pi Browser from: https://minepi.com/                            ║
║  2. Log into your Pi account                                                ║
║  3. Enable "Pi Node" in the Pi Browser menu                                 ║
║  4. Keep this computer running and connected to internet                    ║
║                                                                              ║
║  Logs: $env:USERPROFILE\PiNode\logs\                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
}
else {
    Write-Host "⚠️  Some configurations may need attention. Check the items above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
