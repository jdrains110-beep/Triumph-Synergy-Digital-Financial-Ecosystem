# ==============================================================================
# Pi Network Node Firewall Configuration Script
# ==============================================================================
# This script configures Windows Firewall to allow Pi Network node communication
# on ports 31400-31409 (TCP/IP)
#
# IMPORTANT: Run this script as Administrator
# ==============================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

# Pi Node port configuration
$PI_NODE_PORTS = @(
    @{ Port = 31400; Name = "Primary Consensus"; Description = "SCP voting and nomination" },
    @{ Port = 31401; Name = "Secondary Consensus"; Description = "Fallback consensus channel" },
    @{ Port = 31402; Name = "Tertiary Consensus"; Description = "High-priority consensus messages" },
    @{ Port = 31403; Name = "Quaternary Consensus"; Description = "Validator communication" },
    @{ Port = 31404; Name = "Quinary Consensus"; Description = "Catchup and history sync" },
    @{ Port = 31405; Name = "Block Propagation"; Description = "New block distribution" },
    @{ Port = 31406; Name = "Transaction Relay"; Description = "Pending transaction broadcast" },
    @{ Port = 31407; Name = "State Sync"; Description = "Ledger state synchronization" },
    @{ Port = 31408; Name = "Peer Discovery"; Description = "Node discovery and registration" },
    @{ Port = 31409; Name = "Health Monitor"; Description = "Network health and metrics" }
)

function Write-Header {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Pi Network Node Firewall Configuration" -ForegroundColor Cyan
    Write-Host "  Triumph Synergy - Quantum Financial System" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-PortStatus {
    param(
        [int]$Port,
        [string]$Name,
        [string]$Status,
        [string]$Color
    )
    Write-Host "  Port $Port ($Name): " -NoNewline
    Write-Host $Status -ForegroundColor $Color
}

function Remove-ExistingRules {
    Write-Host "[1/4] Removing existing Pi Node firewall rules..." -ForegroundColor Yellow
    
    $existingRules = Get-NetFirewallRule -DisplayName "Pi Node*" -ErrorAction SilentlyContinue
    
    if ($existingRules) {
        $count = ($existingRules | Measure-Object).Count
        Remove-NetFirewallRule -DisplayName "Pi Node*" -ErrorAction SilentlyContinue
        Write-Host "  Removed $count existing rules" -ForegroundColor Gray
    } else {
        Write-Host "  No existing rules found" -ForegroundColor Gray
    }
}

function Create-InboundRules {
    Write-Host ""
    Write-Host "[2/4] Creating INBOUND firewall rules..." -ForegroundColor Yellow
    
    foreach ($portConfig in $PI_NODE_PORTS) {
        $port = $portConfig.Port
        $name = $portConfig.Name
        $description = $portConfig.Description
        
        try {
            New-NetFirewallRule `
                -DisplayName "Pi Node Port $port - $name" `
                -Direction Inbound `
                -Action Allow `
                -Protocol TCP `
                -LocalPort $port `
                -Description "Pi Network: $description" `
                -Profile Any `
                -Enabled True `
                -ErrorAction Stop | Out-Null
            
            Write-PortStatus -Port $port -Name $name -Status "CREATED" -Color "Green"
        }
        catch {
            Write-PortStatus -Port $port -Name $name -Status "FAILED: $($_.Exception.Message)" -Color "Red"
        }
    }
}

function Create-OutboundRules {
    Write-Host ""
    Write-Host "[3/4] Creating OUTBOUND firewall rules..." -ForegroundColor Yellow
    
    foreach ($portConfig in $PI_NODE_PORTS) {
        $port = $portConfig.Port
        $name = $portConfig.Name
        $description = $portConfig.Description
        
        try {
            New-NetFirewallRule `
                -DisplayName "Pi Node Port $port Out - $name" `
                -Direction Outbound `
                -Action Allow `
                -Protocol TCP `
                -LocalPort $port `
                -Description "Pi Network Outbound: $description" `
                -Profile Any `
                -Enabled True `
                -ErrorAction Stop | Out-Null
            
            Write-PortStatus -Port $port -Name $name -Status "CREATED" -Color "Green"
        }
        catch {
            Write-PortStatus -Port $port -Name $name -Status "FAILED: $($_.Exception.Message)" -Color "Red"
        }
    }
}

function Verify-Rules {
    Write-Host ""
    Write-Host "[4/4] Verifying firewall configuration..." -ForegroundColor Yellow
    Write-Host ""
    
    $allPassed = $true
    
    foreach ($portConfig in $PI_NODE_PORTS) {
        $port = $portConfig.Port
        $name = $portConfig.Name
        
        $inboundRule = Get-NetFirewallRule -DisplayName "Pi Node Port $port - $name" -ErrorAction SilentlyContinue
        $outboundRule = Get-NetFirewallRule -DisplayName "Pi Node Port $port Out - $name" -ErrorAction SilentlyContinue
        
        $inStatus = if ($inboundRule -and $inboundRule.Enabled) { "IN:OK" } else { "IN:FAIL"; $allPassed = $false }
        $outStatus = if ($outboundRule -and $outboundRule.Enabled) { "OUT:OK" } else { "OUT:FAIL"; $allPassed = $false }
        
        $color = if ($inboundRule -and $outboundRule) { "Green" } else { "Red" }
        Write-Host "  Port $port : " -NoNewline
        Write-Host "$inStatus | $outStatus" -ForegroundColor $color
    }
    
    return $allPassed
}

function Show-Summary {
    param([bool]$Success)
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    
    if ($Success) {
        Write-Host "  CONFIGURATION COMPLETE" -ForegroundColor Green
        Write-Host ""
        Write-Host "  All Pi Node ports (31400-31409) are now OPEN" -ForegroundColor Green
        Write-Host "  Pi Network nodes can communicate freely" -ForegroundColor Green
    } else {
        Write-Host "  CONFIGURATION INCOMPLETE" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Some ports failed to configure. Please check errors above." -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-PortConnectivity {
    Write-Host ""
    Write-Host "Testing port connectivity..." -ForegroundColor Yellow
    
    foreach ($portConfig in $PI_NODE_PORTS) {
        $port = $portConfig.Port
        
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
            $listener.Start()
            $listener.Stop()
            Write-Host "  Port $port : AVAILABLE" -ForegroundColor Green
        }
        catch {
            Write-Host "  Port $port : IN USE or BLOCKED" -ForegroundColor Yellow
        }
    }
}

# Main execution
try {
    Write-Header
    Remove-ExistingRules
    Create-InboundRules
    Create-OutboundRules
    $success = Verify-Rules
    Show-Summary -Success $success
    
    # Optional: Test connectivity
    $response = Read-Host "Test port connectivity? (y/n)"
    if ($response -eq 'y') {
        Test-PortConnectivity
    }
    
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you are running this script as Administrator." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
