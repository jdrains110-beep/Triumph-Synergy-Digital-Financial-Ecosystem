/**
 * Central Node Pi Port Integration
 * 
 * Integrates the Central Node Supreme with Pi Network node ports (31400-31409)
 * for maintaining reliable connections, stability, and consensus communication.
 * 
 * Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
 * 
 * Port Assignments:
 * - 31400: Primary Consensus (SCP voting)
 * - 31401: Secondary Consensus (Fallback)
 * - 31402: Tertiary Consensus (High-priority)
 * - 31403: Quaternary Consensus (Validator)
 * - 31404: Quinary Consensus (Catchup/History)
 * - 31405: Block Propagation
 * - 31406: Transaction Relay
 * - 31407: State Sync
 * - 31408: Peer Discovery
 * - 31409: Health Monitor
 */

import { EventEmitter } from "events";
import {
  ALL_PI_NODE_PORTS,
  PI_NODE_PORTS,
  PORT_DESCRIPTIONS,
  PiNodePortManager,
  getPiNodePortManager,
  type PortStatus,
} from "@/lib/pi-node/pi-node-ports";

// ============================================================================
// Constants
// ============================================================================

export const CENTRAL_NODE_PUBLIC_KEY = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

export const CONNECTION_CONFIG = {
  heartbeatInterval: 5000,          // 5 seconds
  consensusTimeout: 30000,          // 30 seconds
  reconnectDelay: 2000,             // 2 seconds
  maxReconnectAttempts: 10,
  connectionTimeout: 10000,         // 10 seconds
  stabilityThreshold: 0.95,         // 95% uptime required
  consensusQuorum: 0.67,            // 67% agreement required
} as const;

// ============================================================================
// Types
// ============================================================================

export interface PiNodeConnection {
  id: string;
  nodeId: string;
  publicKey: string;
  port: number;
  portName: string;
  status: 'connecting' | 'connected' | 'syncing' | 'stable' | 'degraded' | 'disconnected';
  
  // Connection metrics
  latency: number;              // milliseconds
  uptime: number;               // percentage (0-100)
  messagesReceived: number;
  messagesSent: number;
  lastHeartbeat: Date;
  
  // Consensus state
  consensusParticipant: boolean;
  votesReceived: number;
  votesCast: number;
  lastVote: Date | null;
}

export interface ConsensusState {
  round: number;
  phase: 'nominate' | 'prepare' | 'commit' | 'externalize';
  proposedValue: string | null;
  agreedValue: string | null;
  participants: number;
  votes: Map<string, string>;     // nodeId -> vote
  quorumReached: boolean;
  timestamp: Date;
}

export interface StabilityMetrics {
  overallStability: number;       // 0-100
  portHealth: Map<number, number>; // port -> health percentage
  activeConnections: number;
  totalConnections: number;
  consensusSuccess: number;       // percentage
  averageLatency: number;
  lastStabilityCheck: Date;
}

export interface CentralNodeMessage {
  id: string;
  type: 'heartbeat' | 'consensus' | 'sync' | 'command' | 'discovery' | 'health';
  fromNode: string;
  toNode: string;
  port: number;
  payload: unknown;
  timestamp: Date;
  signature: string;
}

// ============================================================================
// Central Node Pi Port Manager
// ============================================================================

export class CentralNodePiPortManager extends EventEmitter {
  private static instance: CentralNodePiPortManager;
  
  // Core state
  private publicKey: string = CENTRAL_NODE_PUBLIC_KEY;
  private isActive: boolean = false;
  private startedAt: Date | null = null;
  
  // Port management
  private portManager: PiNodePortManager;
  private portStatuses: Map<number, PortStatus> = new Map();
  
  // Connections
  private connections: Map<string, PiNodeConnection> = new Map();
  private connectionsByPort: Map<number, Set<string>> = new Map();
  
  // Consensus
  private currentConsensus: ConsensusState | null = null;
  private consensusHistory: ConsensusState[] = [];
  private consensusRound: number = 0;
  
  // Stability
  private stabilityMetrics: StabilityMetrics;
  
  // Intervals
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private consensusInterval: NodeJS.Timeout | null = null;
  private stabilityInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.setMaxListeners(1000);
    
    // Initialize port manager
    this.portManager = getPiNodePortManager({
      checkInterval: 10000,
      autoReopen: true,
      notifyOnChange: true,
      logActivity: true,
    });
    
    // Initialize port connection tracking
    for (const port of ALL_PI_NODE_PORTS) {
      this.connectionsByPort.set(port, new Set());
    }
    
    // Initialize stability metrics
    this.stabilityMetrics = this.initializeStabilityMetrics();
    
    // Listen for port status changes
    this.portManager.addListener((status) => {
      this.handlePortStatusChange(status);
    });
  }
  
  static getInstance(): CentralNodePiPortManager {
    if (!CentralNodePiPortManager.instance) {
      CentralNodePiPortManager.instance = new CentralNodePiPortManager();
    }
    return CentralNodePiPortManager.instance;
  }
  
  // ==========================================================================
  // Initialization
  // ==========================================================================
  
  private initializeStabilityMetrics(): StabilityMetrics {
    const portHealth = new Map<number, number>();
    for (const port of ALL_PI_NODE_PORTS) {
      portHealth.set(port, 100);
    }
    
    return {
      overallStability: 100,
      portHealth,
      activeConnections: 0,
      totalConnections: 0,
      consensusSuccess: 100,
      averageLatency: 0,
      lastStabilityCheck: new Date(),
    };
  }
  
  /**
   * Start the Central Node Pi Port Manager
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }
    
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║     CENTRAL NODE PI PORT INTEGRATION - INITIALIZING           ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log(`║  Central Node: ${this.publicKey.slice(0, 20)}...      ║`);
    console.log("║  Ports: 31400-31409 (10 TCP ports)                            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    
    this.isActive = true;
    this.startedAt = new Date();
    
    // Start port monitoring
    this.portManager.startMonitoring();
    
    // Verify all ports are open
    await this.verifyAllPorts();
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    // Start consensus participation
    this.startConsensusParticipation();
    
    // Start stability monitoring
    this.startStabilityMonitoring();
    
    console.log("✓ Central Node Pi Port Integration: ACTIVE");
    console.log(`  ├─ Ports monitored: ${ALL_PI_NODE_PORTS.length}`);
    console.log(`  ├─ Heartbeat interval: ${CONNECTION_CONFIG.heartbeatInterval}ms`);
    console.log(`  └─ Consensus quorum: ${CONNECTION_CONFIG.consensusQuorum * 100}%`);
    
    this.emit("started", {
      publicKey: this.publicKey,
      ports: ALL_PI_NODE_PORTS,
      timestamp: this.startedAt,
    });
  }
  
  /**
   * Stop the Central Node Pi Port Manager
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }
    
    this.isActive = false;
    
    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.consensusInterval) {
      clearInterval(this.consensusInterval);
      this.consensusInterval = null;
    }
    
    if (this.stabilityInterval) {
      clearInterval(this.stabilityInterval);
      this.stabilityInterval = null;
    }
    
    this.portManager.stopMonitoring();
    
    console.log("Central Node Pi Port Integration: STOPPED");
    this.emit("stopped", { timestamp: new Date() });
  }
  
  // ==========================================================================
  // Port Management
  // ==========================================================================
  
  /**
   * Verify all Pi Node ports are open and functional
   */
  async verifyAllPorts(): Promise<{
    allOpen: boolean;
    portStatuses: Map<number, PortStatus>;
  }> {
    const statuses = await this.portManager.checkAllPorts();
    this.portStatuses = statuses;
    
    const allOpen = Array.from(statuses.values()).every(s => s.status === 'open');
    
    this.emit("ports-verified", {
      allOpen,
      openCount: Array.from(statuses.values()).filter(s => s.status === 'open').length,
      totalCount: statuses.size,
    });
    
    if (!allOpen) {
      console.warn("⚠ Some Pi Node ports are not open. Connection stability may be affected.");
    }
    
    return { allOpen, portStatuses: statuses };
  }
  
  /**
   * Handle port status changes
   */
  private handlePortStatusChange(status: PortStatus): void {
    const previousStatus = this.portStatuses.get(status.port);
    this.portStatuses.set(status.port, status);
    
    // Update stability metrics
    this.stabilityMetrics.portHealth.set(
      status.port,
      status.status === 'open' ? 100 : 0
    );
    
    // Emit event
    this.emit("port-status-changed", {
      port: status.port,
      previousStatus: previousStatus?.status,
      newStatus: status.status,
      timestamp: new Date(),
    });
    
    // If port closed, attempt reconnection for affected connections
    if (status.status === 'closed' && previousStatus?.status === 'open') {
      this.handlePortClosure(status.port);
    }
  }
  
  /**
   * Handle port closure and reconnect affected connections
   */
  private handlePortClosure(port: number): void {
    const affectedConnections = this.connectionsByPort.get(port) || new Set();
    
    for (const connId of affectedConnections) {
      const connection = this.connections.get(connId);
      if (connection) {
        connection.status = 'disconnected';
        this.emit("connection-lost", {
          connectionId: connId,
          port,
          nodeId: connection.nodeId,
        });
        
        // Schedule reconnection
        this.scheduleReconnection(connection);
      }
    }
  }
  
  // ==========================================================================
  // Connection Management
  // ==========================================================================
  
  /**
   * Establish a connection to a Pi Node
   */
  async connectToNode(params: {
    nodeId: string;
    publicKey: string;
    port: number;
  }): Promise<PiNodeConnection> {
    const { nodeId, publicKey, port } = params;
    
    if (!ALL_PI_NODE_PORTS.includes(port as typeof ALL_PI_NODE_PORTS[number])) {
      throw new Error(`Invalid port ${port}. Must be one of: ${ALL_PI_NODE_PORTS.join(', ')}`);
    }
    
    const connectionId = `conn-${nodeId}-${port}-${Date.now()}`;
    
    const connection: PiNodeConnection = {
      id: connectionId,
      nodeId,
      publicKey,
      port,
      portName: this.getPortName(port),
      status: 'connecting',
      latency: 0,
      uptime: 100,
      messagesReceived: 0,
      messagesSent: 0,
      lastHeartbeat: new Date(),
      consensusParticipant: port >= PI_NODE_PORTS.CONSENSUS_PRIMARY && 
                            port <= PI_NODE_PORTS.CONSENSUS_QUINARY,
      votesReceived: 0,
      votesCast: 0,
      lastVote: null,
    };
    
    // Simulate connection establishment
    await this.establishConnection(connection);
    
    // Store connection
    this.connections.set(connectionId, connection);
    this.connectionsByPort.get(port)?.add(connectionId);
    
    // Update metrics
    this.stabilityMetrics.totalConnections++;
    this.stabilityMetrics.activeConnections++;
    
    this.emit("connection-established", {
      connectionId,
      nodeId,
      port,
      status: connection.status,
    });
    
    return connection;
  }
  
  /**
   * Establish connection (simulate network handshake)
   */
  private async establishConnection(connection: PiNodeConnection): Promise<void> {
    // Verify port is open
    const portStatus = this.portStatuses.get(connection.port);
    if (portStatus && portStatus.status !== 'open') {
      throw new Error(`Port ${connection.port} is not open`);
    }
    
    // Simulate handshake latency
    connection.latency = Math.random() * 50 + 10; // 10-60ms
    
    // Set status
    connection.status = 'connected';
    
    // Send initial sync message
    await this.sendMessage({
      type: 'sync',
      toNode: connection.nodeId,
      port: connection.port,
      payload: {
        centralNode: this.publicKey,
        syncType: 'initial',
        timestamp: new Date(),
      },
    });
    
    connection.status = 'stable';
  }
  
  /**
   * Schedule reconnection for a dropped connection
   */
  private scheduleReconnection(connection: PiNodeConnection): void {
    let attempts = 0;
    
    const attemptReconnect = async () => {
      if (connection.status === 'stable' || attempts >= CONNECTION_CONFIG.maxReconnectAttempts) {
        return;
      }
      
      attempts++;
      console.log(`[CentralNode] Reconnecting to ${connection.nodeId} on port ${connection.port} (attempt ${attempts})`);
      
      try {
        connection.status = 'connecting';
        await this.establishConnection(connection);
        console.log(`[CentralNode] Reconnected to ${connection.nodeId}`);
        
        this.emit("connection-restored", {
          connectionId: connection.id,
          nodeId: connection.nodeId,
          port: connection.port,
          attempts,
        });
      } catch (error) {
        connection.status = 'disconnected';
        setTimeout(attemptReconnect, CONNECTION_CONFIG.reconnectDelay * attempts);
      }
    };
    
    setTimeout(attemptReconnect, CONNECTION_CONFIG.reconnectDelay);
  }
  
  /**
   * Disconnect from a node
   */
  disconnectFromNode(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }
    
    connection.status = 'disconnected';
    this.connections.delete(connectionId);
    this.connectionsByPort.get(connection.port)?.delete(connectionId);
    
    this.stabilityMetrics.activeConnections--;
    
    this.emit("connection-closed", {
      connectionId,
      nodeId: connection.nodeId,
      port: connection.port,
    });
  }
  
  // ==========================================================================
  // Messaging
  // ==========================================================================
  
  /**
   * Send a message to a Pi Node
   */
  async sendMessage(params: {
    type: CentralNodeMessage['type'];
    toNode: string;
    port: number;
    payload: unknown;
  }): Promise<CentralNodeMessage> {
    const message: CentralNodeMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: params.type,
      fromNode: this.publicKey,
      toNode: params.toNode,
      port: params.port,
      payload: params.payload,
      timestamp: new Date(),
      signature: this.signMessage(params.payload),
    };
    
    // Find connection and increment counter
    const connections = this.connectionsByPort.get(params.port);
    if (connections) {
      for (const connId of connections) {
        const conn = this.connections.get(connId);
        if (conn && conn.nodeId === params.toNode) {
          conn.messagesSent++;
        }
      }
    }
    
    this.emit("message-sent", message);
    return message;
  }
  
  /**
   * Handle incoming message
   */
  handleIncomingMessage(message: CentralNodeMessage): void {
    // Find connection and update
    const connections = this.connectionsByPort.get(message.port);
    if (connections) {
      for (const connId of connections) {
        const conn = this.connections.get(connId);
        if (conn && conn.nodeId === message.fromNode) {
          conn.messagesReceived++;
          conn.lastHeartbeat = new Date();
        }
      }
    }
    
    // Handle by type
    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'consensus':
        this.handleConsensusMessage(message);
        break;
      case 'sync':
        this.handleSyncMessage(message);
        break;
      case 'discovery':
        this.handleDiscoveryMessage(message);
        break;
      case 'health':
        this.handleHealthMessage(message);
        break;
    }
    
    this.emit("message-received", message);
  }
  
  /**
   * Sign a message payload
   */
  private signMessage(payload: unknown): string {
    const data = JSON.stringify(payload);
    const hash = Buffer.from(data).toString('base64').slice(0, 64);
    return `CNS-${this.publicKey.slice(0, 8)}-${hash}`;
  }
  
  // ==========================================================================
  // Heartbeat Monitoring
  // ==========================================================================
  
  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      return;
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, CONNECTION_CONFIG.heartbeatInterval);
  }
  
  /**
   * Perform heartbeat check on all connections
   */
  private async performHeartbeat(): Promise<void> {
    const now = new Date();
    
    for (const connection of this.connections.values()) {
      // Check if connection is stale
      const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > CONNECTION_CONFIG.heartbeatInterval * 3) {
        // Connection is possibly dead
        connection.status = 'degraded';
        connection.uptime = Math.max(0, connection.uptime - 5);
        
        this.emit("connection-degraded", {
          connectionId: connection.id,
          nodeId: connection.nodeId,
          timeSinceLastHeartbeat,
        });
      }
      
      // Send heartbeat
      await this.sendMessage({
        type: 'heartbeat',
        toNode: connection.nodeId,
        port: connection.port,
        payload: {
          centralNode: this.publicKey,
          timestamp: now,
          portStatus: this.portStatuses.get(connection.port),
        },
      });
    }
    
    this.emit("heartbeat-complete", {
      timestamp: now,
      connectionsChecked: this.connections.size,
    });
  }
  
  /**
   * Handle incoming heartbeat
   */
  private handleHeartbeat(message: CentralNodeMessage): void {
    // Update connection status
    const connections = this.connectionsByPort.get(message.port);
    if (connections) {
      for (const connId of connections) {
        const conn = this.connections.get(connId);
        if (conn && conn.nodeId === message.fromNode) {
          conn.lastHeartbeat = new Date();
          conn.status = 'stable';
          conn.uptime = Math.min(100, conn.uptime + 1);
        }
      }
    }
  }
  
  // ==========================================================================
  // Consensus Management
  // ==========================================================================
  
  /**
   * Start consensus participation
   */
  private startConsensusParticipation(): void {
    if (this.consensusInterval) {
      return;
    }
    
    // Participate in consensus every 10 seconds
    this.consensusInterval = setInterval(() => {
      this.initiateConsensusRound();
    }, 10000);
  }
  
  /**
   * Initiate a new consensus round
   */
  async initiateConsensusRound(): Promise<ConsensusState> {
    this.consensusRound++;
    
    const consensus: ConsensusState = {
      round: this.consensusRound,
      phase: 'nominate',
      proposedValue: null,
      agreedValue: null,
      participants: 0,
      votes: new Map(),
      quorumReached: false,
      timestamp: new Date(),
    };
    
    this.currentConsensus = consensus;
    
    // Get consensus participants (nodes on ports 31400-31404)
    const consensusPorts = [
      PI_NODE_PORTS.CONSENSUS_PRIMARY,
      PI_NODE_PORTS.CONSENSUS_SECONDARY,
      PI_NODE_PORTS.CONSENSUS_TERTIARY,
      PI_NODE_PORTS.CONSENSUS_QUATERNARY,
      PI_NODE_PORTS.CONSENSUS_QUINARY,
    ];
    
    // Broadcast nomination request
    for (const port of consensusPorts) {
      const connections = this.connectionsByPort.get(port);
      if (connections) {
        for (const connId of connections) {
          const conn = this.connections.get(connId);
          if (conn && conn.consensusParticipant && conn.status === 'stable') {
            consensus.participants++;
            
            await this.sendMessage({
              type: 'consensus',
              toNode: conn.nodeId,
              port,
              payload: {
                action: 'nominate',
                round: consensus.round,
                centralNode: this.publicKey,
              },
            });
          }
        }
      }
    }
    
    this.emit("consensus-initiated", {
      round: consensus.round,
      participants: consensus.participants,
    });
    
    // Progress through consensus phases
    await this.progressConsensus();
    
    return consensus;
  }
  
  /**
   * Progress through consensus phases
   */
  private async progressConsensus(): Promise<void> {
    if (!this.currentConsensus) {
      return;
    }
    
    const phases: ConsensusState['phase'][] = ['nominate', 'prepare', 'commit', 'externalize'];
    
    for (const phase of phases) {
      this.currentConsensus.phase = phase;
      
      // Check quorum
      if (this.currentConsensus.votes.size >= 
          this.currentConsensus.participants * CONNECTION_CONFIG.consensusQuorum) {
        this.currentConsensus.quorumReached = true;
      }
      
      this.emit("consensus-phase", {
        round: this.currentConsensus.round,
        phase,
        quorumReached: this.currentConsensus.quorumReached,
      });
      
      // Brief delay between phases
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Consensus complete
    if (this.currentConsensus.quorumReached) {
      // Determine agreed value
      const voteCounts = new Map<string, number>();
      for (const vote of this.currentConsensus.votes.values()) {
        voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
      }
      
      let maxVotes = 0;
      for (const [value, count] of voteCounts) {
        if (count > maxVotes) {
          maxVotes = count;
          this.currentConsensus.agreedValue = value;
        }
      }
      
      this.stabilityMetrics.consensusSuccess = 
        (this.stabilityMetrics.consensusSuccess * this.consensusRound + 100) / 
        (this.consensusRound + 1);
    } else {
      this.stabilityMetrics.consensusSuccess = 
        (this.stabilityMetrics.consensusSuccess * this.consensusRound) / 
        (this.consensusRound + 1);
    }
    
    // Store in history
    this.consensusHistory.push({ ...this.currentConsensus });
    if (this.consensusHistory.length > 100) {
      this.consensusHistory.shift();
    }
    
    this.emit("consensus-complete", {
      round: this.currentConsensus.round,
      quorumReached: this.currentConsensus.quorumReached,
      agreedValue: this.currentConsensus.agreedValue,
    });
  }
  
  /**
   * Handle incoming consensus message
   */
  private handleConsensusMessage(message: CentralNodeMessage): void {
    const payload = message.payload as { action: string; vote?: string; round: number };
    
    if (!this.currentConsensus || payload.round !== this.currentConsensus.round) {
      return;
    }
    
    if (payload.action === 'vote' && payload.vote) {
      this.currentConsensus.votes.set(message.fromNode, payload.vote);
      
      // Update connection
      const connections = this.connectionsByPort.get(message.port);
      if (connections) {
        for (const connId of connections) {
          const conn = this.connections.get(connId);
          if (conn && conn.nodeId === message.fromNode) {
            conn.votesReceived++;
            conn.lastVote = new Date();
          }
        }
      }
    }
  }
  
  // ==========================================================================
  // Stability Monitoring
  // ==========================================================================
  
  /**
   * Start stability monitoring
   */
  private startStabilityMonitoring(): void {
    if (this.stabilityInterval) {
      return;
    }
    
    this.stabilityInterval = setInterval(() => {
      this.calculateStability();
    }, 5000);
  }
  
  /**
   * Calculate overall system stability
   */
  private calculateStability(): void {
    const now = new Date();
    
    // Calculate port health average
    let portHealthSum = 0;
    for (const health of this.stabilityMetrics.portHealth.values()) {
      portHealthSum += health;
    }
    const avgPortHealth = portHealthSum / this.stabilityMetrics.portHealth.size;
    
    // Calculate connection uptime average
    let uptimeSum = 0;
    let latencySum = 0;
    for (const conn of this.connections.values()) {
      uptimeSum += conn.uptime;
      latencySum += conn.latency;
    }
    const avgUptime = this.connections.size > 0 ? uptimeSum / this.connections.size : 100;
    const avgLatency = this.connections.size > 0 ? latencySum / this.connections.size : 0;
    
    // Calculate overall stability
    this.stabilityMetrics.overallStability = (
      avgPortHealth * 0.3 +              // 30% port health
      avgUptime * 0.3 +                  // 30% connection uptime
      this.stabilityMetrics.consensusSuccess * 0.4  // 40% consensus success
    );
    
    this.stabilityMetrics.averageLatency = avgLatency;
    this.stabilityMetrics.lastStabilityCheck = now;
    
    // Check if stability is below threshold
    if (this.stabilityMetrics.overallStability < CONNECTION_CONFIG.stabilityThreshold * 100) {
      this.emit("stability-warning", {
        stability: this.stabilityMetrics.overallStability,
        threshold: CONNECTION_CONFIG.stabilityThreshold * 100,
        timestamp: now,
      });
    }
    
    this.emit("stability-calculated", {
      ...this.stabilityMetrics,
      timestamp: now,
    });
  }
  
  // ==========================================================================
  // Message Handlers
  // ==========================================================================
  
  private handleSyncMessage(message: CentralNodeMessage): void {
    this.emit("sync-received", {
      fromNode: message.fromNode,
      port: message.port,
      payload: message.payload,
    });
  }
  
  private handleDiscoveryMessage(message: CentralNodeMessage): void {
    const payload = message.payload as { nodeInfo?: { publicKey: string } };
    
    // Respond with central node info
    if (payload.nodeInfo) {
      this.sendMessage({
        type: 'discovery',
        toNode: message.fromNode,
        port: message.port,
        payload: {
          centralNode: {
            publicKey: this.publicKey,
            ports: ALL_PI_NODE_PORTS,
            status: 'active',
          },
        },
      });
    }
  }
  
  private handleHealthMessage(message: CentralNodeMessage): void {
    const payload = message.payload as { requestStatus: boolean };
    
    if (payload.requestStatus) {
      this.sendMessage({
        type: 'health',
        toNode: message.fromNode,
        port: message.port,
        payload: {
          centralNode: this.publicKey,
          status: 'healthy',
          stability: this.stabilityMetrics.overallStability,
          activeConnections: this.stabilityMetrics.activeConnections,
          consensusSuccess: this.stabilityMetrics.consensusSuccess,
          ports: Object.fromEntries(this.portStatuses),
        },
      });
    }
  }
  
  // ==========================================================================
  // Utility
  // ==========================================================================
  
  private getPortName(port: number): string {
    return PORT_DESCRIPTIONS[port] || `Port ${port}`;
  }
  
  // ==========================================================================
  // Public Getters
  // ==========================================================================
  
  getStatus(): {
    publicKey: string;
    isActive: boolean;
    startedAt: Date | null;
    ports: {
      total: number;
      open: number;
      closed: number;
    };
    connections: {
      total: number;
      active: number;
      stable: number;
      degraded: number;
    };
    consensus: {
      currentRound: number;
      successRate: number;
    };
    stability: number;
  } {
    const portStatuses = Array.from(this.portStatuses.values());
    const connections = Array.from(this.connections.values());
    
    return {
      publicKey: this.publicKey,
      isActive: this.isActive,
      startedAt: this.startedAt,
      ports: {
        total: ALL_PI_NODE_PORTS.length,
        open: portStatuses.filter(p => p.status === 'open').length,
        closed: portStatuses.filter(p => p.status === 'closed').length,
      },
      connections: {
        total: this.stabilityMetrics.totalConnections,
        active: this.stabilityMetrics.activeConnections,
        stable: connections.filter(c => c.status === 'stable').length,
        degraded: connections.filter(c => c.status === 'degraded').length,
      },
      consensus: {
        currentRound: this.consensusRound,
        successRate: this.stabilityMetrics.consensusSuccess,
      },
      stability: this.stabilityMetrics.overallStability,
    };
  }
  
  getAllConnections(): PiNodeConnection[] {
    return Array.from(this.connections.values());
  }
  
  getConnectionsByPort(port: number): PiNodeConnection[] {
    const connIds = this.connectionsByPort.get(port) || new Set();
    return Array.from(connIds)
      .map(id => this.connections.get(id))
      .filter((c): c is PiNodeConnection => c !== undefined);
  }
  
  getPortStatuses(): Map<number, PortStatus> {
    return new Map(this.portStatuses);
  }
  
  getStabilityMetrics(): StabilityMetrics {
    return { ...this.stabilityMetrics };
  }
  
  getConsensusHistory(): ConsensusState[] {
    return [...this.consensusHistory];
  }
  
  getCurrentConsensus(): ConsensusState | null {
    return this.currentConsensus ? { ...this.currentConsensus } : null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let centralNodePiPortManagerInstance: CentralNodePiPortManager | null = null;

export function getCentralNodePiPortManager(): CentralNodePiPortManager {
  if (!centralNodePiPortManagerInstance) {
    centralNodePiPortManagerInstance = CentralNodePiPortManager.getInstance();
  }
  return centralNodePiPortManagerInstance;
}

export async function initializeCentralNodePiPorts(): Promise<CentralNodePiPortManager> {
  const manager = getCentralNodePiPortManager();
  await manager.start();
  return manager;
}

export default {
  CentralNodePiPortManager,
  getCentralNodePiPortManager,
  initializeCentralNodePiPorts,
  CENTRAL_NODE_PUBLIC_KEY,
  CONNECTION_CONFIG,
};
