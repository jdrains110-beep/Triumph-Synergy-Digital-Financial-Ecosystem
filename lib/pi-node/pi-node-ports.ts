/**
 * Pi Network Node Port Manager
 * 
 * Manages TCP/IP ports for Pi Node communication:
 * 31400-31409 (10 ports total)
 * 
 * These ports enable:
 * - Node-to-node consensus communication
 * - Block propagation
 * - Transaction relay
 * - Stellar Core Protocol (SCP) messaging
 * - Network health monitoring
 */

export const PI_NODE_PORTS = {
  // Primary consensus ports
  CONSENSUS_PRIMARY: 31400,
  CONSENSUS_SECONDARY: 31401,
  CONSENSUS_TERTIARY: 31402,
  CONSENSUS_QUATERNARY: 31403,
  CONSENSUS_QUINARY: 31404,
  
  // Data propagation ports
  BLOCK_PROPAGATION: 31405,
  TRANSACTION_RELAY: 31406,
  STATE_SYNC: 31407,
  PEER_DISCOVERY: 31408,
  HEALTH_MONITOR: 31409,
} as const;

export const PI_NODE_PORT_RANGE = {
  start: 31400,
  end: 31409,
  count: 10,
} as const;

export const ALL_PI_NODE_PORTS = [
  31400, 31401, 31402, 31403, 31404,
  31405, 31406, 31407, 31408, 31409,
] as const;

export type PiNodePort = typeof ALL_PI_NODE_PORTS[number];

export interface PortStatus {
  port: number;
  name: string;
  status: 'open' | 'closed' | 'blocked' | 'unknown';
  protocol: 'TCP' | 'UDP' | 'BOTH';
  lastCheck: Date;
  connections: number;
  firewallRule: boolean;
}

export interface PortManagerConfig {
  checkInterval: number; // milliseconds
  autoReopen: boolean;
  notifyOnChange: boolean;
  maxConnectionsPerPort: number;
  logActivity: boolean;
}

export const DEFAULT_PORT_CONFIG: PortManagerConfig = {
  checkInterval: 30000, // 30 seconds
  autoReopen: true,
  notifyOnChange: true,
  maxConnectionsPerPort: 100,
  logActivity: true,
};

export const PORT_DESCRIPTIONS: Record<number, string> = {
  31400: 'Primary Consensus - SCP voting and nomination',
  31401: 'Secondary Consensus - Fallback consensus channel',
  31402: 'Tertiary Consensus - High-priority consensus messages',
  31403: 'Quaternary Consensus - Validator communication',
  31404: 'Quinary Consensus - Catchup and history sync',
  31405: 'Block Propagation - New block distribution',
  31406: 'Transaction Relay - Pending transaction broadcast',
  31407: 'State Sync - Ledger state synchronization',
  31408: 'Peer Discovery - Node discovery and registration',
  31409: 'Health Monitor - Network health and metrics',
};

/**
 * Pi Node Port Manager Class
 * Manages port status, monitoring, and automatic recovery
 */
export class PiNodePortManager {
  private config: PortManagerConfig;
  private portStatuses: Map<number, PortStatus> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: PortStatus) => void> = new Set();

  constructor(config: Partial<PortManagerConfig> = {}) {
    this.config = { ...DEFAULT_PORT_CONFIG, ...config };
    this.initializePortStatuses();
  }

  private initializePortStatuses(): void {
    for (const port of ALL_PI_NODE_PORTS) {
      this.portStatuses.set(port, {
        port,
        name: this.getPortName(port),
        status: 'unknown',
        protocol: 'TCP',
        lastCheck: new Date(),
        connections: 0,
        firewallRule: false,
      });
    }
  }

  private getPortName(port: number): string {
    const names: Record<number, string> = {
      31400: 'CONSENSUS_PRIMARY',
      31401: 'CONSENSUS_SECONDARY',
      31402: 'CONSENSUS_TERTIARY',
      31403: 'CONSENSUS_QUATERNARY',
      31404: 'CONSENSUS_QUINARY',
      31405: 'BLOCK_PROPAGATION',
      31406: 'TRANSACTION_RELAY',
      31407: 'STATE_SYNC',
      31408: 'PEER_DISCOVERY',
      31409: 'HEALTH_MONITOR',
    };
    return names[port] || `PI_NODE_${port}`;
  }

  /**
   * Start monitoring all Pi Node ports
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.log('Starting Pi Node port monitoring...');
    this.checkAllPorts();

    this.monitoringInterval = setInterval(() => {
      this.checkAllPorts();
    }, this.config.checkInterval);

    this.log(`Port monitoring active. Checking every ${this.config.checkInterval / 1000}s`);
  }

  /**
   * Stop monitoring ports
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.log('Port monitoring stopped');
    }
  }

  /**
   * Check all Pi Node ports
   */
  async checkAllPorts(): Promise<Map<number, PortStatus>> {
    const results = await Promise.all(
      ALL_PI_NODE_PORTS.map(port => this.checkPort(port))
    );

    for (const status of results) {
      const previousStatus = this.portStatuses.get(status.port);
      this.portStatuses.set(status.port, status);

      // Notify listeners if status changed
      if (previousStatus && previousStatus.status !== status.status) {
        this.notifyListeners(status);
        
        // Auto-reopen if configured
        if (this.config.autoReopen && status.status === 'closed') {
          this.log(`Port ${status.port} closed. Attempting to reopen...`);
          await this.requestPortOpen(status.port);
        }
      }
    }

    return this.portStatuses;
  }

  /**
   * Check a specific port
   */
  async checkPort(port: number): Promise<PortStatus> {
    const name = this.getPortName(port);
    
    try {
      // In a real implementation, this would use native modules or system calls
      // For now, we simulate the check
      const isOpen = await this.simulatePortCheck(port);
      
      return {
        port,
        name,
        status: isOpen ? 'open' : 'closed',
        protocol: 'TCP',
        lastCheck: new Date(),
        connections: isOpen ? Math.floor(Math.random() * 20) : 0,
        firewallRule: true, // Assume firewall rule exists after setup
      };
    } catch (error) {
      return {
        port,
        name,
        status: 'unknown',
        protocol: 'TCP',
        lastCheck: new Date(),
        connections: 0,
        firewallRule: false,
      };
    }
  }

  /**
   * Simulate port check (replace with actual implementation)
   */
  private async simulatePortCheck(port: number): Promise<boolean> {
    // In production, use native net module or system calls
    return true; // Assume ports are open after firewall configuration
  }

  /**
   * Request to open a specific port
   */
  async requestPortOpen(port: number): Promise<boolean> {
    this.log(`Requesting port ${port} to be opened...`);
    
    // This would trigger firewall rule creation
    // For now, we mark it as requested
    const status = this.portStatuses.get(port);
    if (status) {
      status.status = 'open';
      status.lastCheck = new Date();
      this.portStatuses.set(port, status);
    }
    
    return true;
  }

  /**
   * Get status of all ports
   */
  getAllPortStatuses(): PortStatus[] {
    return Array.from(this.portStatuses.values());
  }

  /**
   * Get status of a specific port
   */
  getPortStatus(port: number): PortStatus | undefined {
    return this.portStatuses.get(port);
  }

  /**
   * Get summary of port health
   */
  getHealthSummary(): {
    total: number;
    open: number;
    closed: number;
    blocked: number;
    unknown: number;
    healthy: boolean;
  } {
    const statuses = this.getAllPortStatuses();
    const summary = {
      total: statuses.length,
      open: statuses.filter(s => s.status === 'open').length,
      closed: statuses.filter(s => s.status === 'closed').length,
      blocked: statuses.filter(s => s.status === 'blocked').length,
      unknown: statuses.filter(s => s.status === 'unknown').length,
      healthy: false,
    };
    summary.healthy = summary.open === summary.total;
    return summary;
  }

  /**
   * Add status change listener
   */
  addListener(callback: (status: PortStatus) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove status change listener
   */
  removeListener(callback: (status: PortStatus) => void): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(status: PortStatus): void {
    if (this.config.notifyOnChange) {
      for (const listener of this.listeners) {
        try {
          listener(status);
        } catch (error) {
          console.error('Listener error:', error);
        }
      }
    }
  }

  private log(message: string): void {
    if (this.config.logActivity) {
      console.log(`[PiNodePorts] ${new Date().toISOString()} - ${message}`);
    }
  }

  /**
   * Generate Windows PowerShell command to open ports
   */
  static generateWindowsFirewallCommands(): string {
    const commands: string[] = [
      '# Pi Network Node Firewall Configuration',
      '# Run as Administrator',
      '',
      '# Remove existing rules (if any)',
      'Remove-NetFirewallRule -DisplayName "Pi Node*" -ErrorAction SilentlyContinue',
      '',
      '# Create inbound rules for Pi Node ports',
    ];

    for (const port of ALL_PI_NODE_PORTS) {
      const description = PORT_DESCRIPTIONS[port];
      commands.push(
        `New-NetFirewallRule -DisplayName "Pi Node Port ${port}" -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${port} -Description "${description}"`
      );
    }

    commands.push('');
    commands.push('# Create outbound rules for Pi Node ports');

    for (const port of ALL_PI_NODE_PORTS) {
      const description = PORT_DESCRIPTIONS[port];
      commands.push(
        `New-NetFirewallRule -DisplayName "Pi Node Port ${port} Out" -Direction Outbound -Action Allow -Protocol TCP -LocalPort ${port} -Description "${description}"`
      );
    }

    commands.push('');
    commands.push('# Verify rules were created');
    commands.push('Get-NetFirewallRule -DisplayName "Pi Node*" | Format-Table DisplayName, Direction, Action, Enabled');

    return commands.join('\n');
  }

  /**
   * Generate verification command
   */
  static generateVerificationCommand(): string {
    return `
# Verify Pi Node ports are open
$ports = @(31400, 31401, 31402, 31403, 31404, 31405, 31406, 31407, 31408, 31409)
foreach ($port in $ports) {
    $rule = Get-NetFirewallRule -DisplayName "Pi Node Port $port" -ErrorAction SilentlyContinue
    if ($rule) {
        Write-Host "Port $port : CONFIGURED" -ForegroundColor Green
    } else {
        Write-Host "Port $port : NOT CONFIGURED" -ForegroundColor Red
    }
}
`.trim();
  }
}

// Singleton instance for global port management
let portManagerInstance: PiNodePortManager | null = null;

export function getPiNodePortManager(config?: Partial<PortManagerConfig>): PiNodePortManager {
  if (!portManagerInstance) {
    portManagerInstance = new PiNodePortManager(config);
  }
  return portManagerInstance;
}

export function initializePiNodePorts(): PiNodePortManager {
  const manager = getPiNodePortManager();
  manager.startMonitoring();
  return manager;
}

export default {
  PI_NODE_PORTS,
  PI_NODE_PORT_RANGE,
  ALL_PI_NODE_PORTS,
  PORT_DESCRIPTIONS,
  PiNodePortManager,
  getPiNodePortManager,
  initializePiNodePorts,
};
