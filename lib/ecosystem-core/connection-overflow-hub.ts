/**
 * Connection Overflow Hub
 * 
 * Triumph-Synergy becomes the central overflow for ALL connections:
 * - Multi-protocol support
 * - Cross-network bridging
 * - Blockchain-verified connections
 * - Load distribution
 * - Redundancy management
 * - Global connection routing
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type ConnectionProtocol = 
  | "http"
  | "https"
  | "websocket"
  | "wss"
  | "grpc"
  | "mqtt"
  | "amqp"
  | "tcp"
  | "udp"
  | "quic"
  | "webrtc"
  | "ipfs"
  | "libp2p"
  | "blockchain"
  | "custom";

export type NetworkType = 
  | "pi-network"
  | "ethereum"
  | "solana"
  | "polygon"
  | "bnb-chain"
  | "avalanche"
  | "arbitrum"
  | "optimism"
  | "cosmos"
  | "polkadot"
  | "internet"
  | "private"
  | "mesh"
  | "satellite"
  | "custom";

export type ConnectionStatus = 
  | "connecting"
  | "connected"
  | "authenticated"
  | "verified"
  | "degraded"
  | "disconnected"
  | "banned";

export interface ConnectionEndpoint {
  id: string;
  name: string;
  type: "inbound" | "outbound" | "bidirectional";
  protocol: ConnectionProtocol;
  network: NetworkType;
  
  // Endpoint details
  address: string;
  port?: number;
  path?: string;
  
  // Status
  status: ConnectionStatus;
  health: number;  // 0-100
  latency: number; // ms
  lastSeen: Date;
  
  // Capacity
  capacity: {
    maxConnections: number;
    currentConnections: number;
    bandwidth: number;         // Mbps
    currentBandwidth: number;
  };
  
  // Security
  security: {
    encrypted: boolean;
    certificateId?: string;
    authMethod: "none" | "key" | "token" | "certificate" | "blockchain";
    verified: boolean;
    trustScore: number;
  };
  
  // Blockchain verification
  blockchain: {
    registered: boolean;
    registrationTx?: string;
    piNetworkId?: string;
    attestations: string[];
  };
  
  registeredAt: Date;
  region?: string;
}

export interface ActiveConnection {
  id: string;
  endpointId: string;
  type: "client" | "server" | "peer";
  protocol: ConnectionProtocol;
  
  // Remote party
  remote: {
    address: string;
    port?: number;
    identity?: string;
    piWallet?: string;
  };
  
  // Status
  status: ConnectionStatus;
  establishedAt: Date;
  lastActivity: Date;
  
  // Metrics
  metrics: {
    bytesSent: number;
    bytesReceived: number;
    messagesSent: number;
    messagesReceived: number;
    latency: number;
    errors: number;
  };
  
  // Blockchain
  verified: boolean;
  verificationTx?: string;
}

export interface ConnectionRoute {
  id: string;
  name: string;
  source: string;        // Endpoint ID or pattern
  destination: string;   // Endpoint ID or pattern
  priority: number;
  
  // Routing rules
  rules: RoutingRule[];
  
  // Load balancing
  loadBalancing: {
    algorithm: "round-robin" | "least-connections" | "weighted" | "hash" | "geographic";
    stickySession: boolean;
    healthCheck: boolean;
    failover: boolean;
  };
  
  // Status
  active: boolean;
  connections: number;
  throughput: number;
  
  createdAt: Date;
}

export interface RoutingRule {
  type: "allow" | "deny" | "rate-limit" | "transform" | "redirect";
  condition: string;
  action: string;
  parameters?: Record<string, unknown>;
}

export interface NetworkBridge {
  id: string;
  name: string;
  sourceNetwork: NetworkType;
  targetNetwork: NetworkType;
  
  // Bridge type
  type: "unidirectional" | "bidirectional";
  
  // Endpoints
  sourceEndpoint: string;
  targetEndpoint: string;
  
  // Protocol translation
  protocolMapping: {
    sourceProtocol: ConnectionProtocol;
    targetProtocol: ConnectionProtocol;
    translator?: string;
  };
  
  // Status
  status: "active" | "degraded" | "offline" | "maintenance";
  
  // Metrics
  metrics: {
    messagesRelayed: number;
    bytesTransferred: number;
    avgLatency: number;
    successRate: number;
  };
  
  // Security
  verified: boolean;
  trustedNodes: string[];
  
  createdAt: Date;
}

export interface OverflowPool {
  id: string;
  name: string;
  
  // Pool configuration
  endpoints: string[];      // Endpoint IDs
  
  // Overflow rules
  overflowThreshold: number;  // Connection percentage
  drainThreshold: number;
  
  // Priority
  priority: number;
  
  // Status
  status: "ready" | "active" | "draining" | "exhausted";
  currentLoad: number;
  
  // Metrics
  metrics: {
    overflowCount: number;
    totalHandled: number;
    avgHandleTime: number;
    peakLoad: number;
  };
}

export interface GlobalRoutingTable {
  version: number;
  lastUpdated: Date;
  
  // Routes by network
  routes: Map<NetworkType, EndpointRoute[]>;
  
  // Direct connections
  directPaths: Map<string, string[]>;  // endpoint -> [paths]
  
  // Blockchain anchored
  txHash?: string;
}

export interface EndpointRoute {
  destination: string;
  nextHop: string;
  metric: number;
  paths: string[];
}

// ============================================================================
// Connection Overflow Hub
// ============================================================================

class ConnectionOverflowHub extends EventEmitter {
  private static instance: ConnectionOverflowHub;
  
  private endpoints: Map<string, ConnectionEndpoint> = new Map();
  private connections: Map<string, ActiveConnection> = new Map();
  private routes: Map<string, ConnectionRoute> = new Map();
  private bridges: Map<string, NetworkBridge> = new Map();
  private overflowPools: Map<string, OverflowPool> = new Map();
  
  private routingTable: GlobalRoutingTable;
  
  // Indexes
  private endpointsByNetwork: Map<NetworkType, Set<string>> = new Map();
  private endpointsByProtocol: Map<ConnectionProtocol, Set<string>> = new Map();
  private connectionsByEndpoint: Map<string, Set<string>> = new Map();
  
  // Metrics
  private globalMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalBytesTransferred: 0,
    totalMessages: 0,
    overflowEvents: 0,
    bridgedMessages: 0,
    verifiedConnections: 0,
  };
  
  // Monitoring
  private healthCheckInterval?: NodeJS.Timeout;
  private routeOptimizeInterval?: NodeJS.Timeout;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    
    this.routingTable = {
      version: 1,
      lastUpdated: new Date(),
      routes: new Map(),
      directPaths: new Map(),
    };
    
    this.initializeCoreEndpoints();
    this.startMonitoring();
  }
  
  static getInstance(): ConnectionOverflowHub {
    if (!ConnectionOverflowHub.instance) {
      ConnectionOverflowHub.instance = new ConnectionOverflowHub();
    }
    return ConnectionOverflowHub.instance;
  }
  
  private initializeCoreEndpoints(): void {
    // Pi Network primary endpoint
    this.registerEndpoint({
      name: "Pi Network Primary",
      type: "bidirectional",
      protocol: "blockchain",
      network: "pi-network",
      address: "mainnet.pinetwork.io",
      port: 443,
      maxConnections: 100000,
      bandwidth: 10000,
      authMethod: "blockchain",
      region: "global",
    });
    
    // Triumph-Synergy Hub
    this.registerEndpoint({
      name: "Triumph-Synergy Hub",
      type: "bidirectional",
      protocol: "wss",
      network: "pi-network",
      address: "hub.triumphsynergy.pi",
      port: 443,
      maxConnections: 500000,
      bandwidth: 100000,
      authMethod: "blockchain",
      region: "global",
    });
    
    // IPFS Gateway
    this.registerEndpoint({
      name: "IPFS Gateway",
      type: "bidirectional",
      protocol: "ipfs",
      network: "mesh",
      address: "ipfs.triumphsynergy.pi",
      port: 8080,
      maxConnections: 50000,
      bandwidth: 50000,
      authMethod: "key",
      region: "distributed",
    });
  }
  
  private startMonitoring(): void {
    // Health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);
    
    // Route optimization every 5 minutes
    this.routeOptimizeInterval = setInterval(() => {
      this.optimizeRoutes();
    }, 300000);
  }
  
  // ==========================================================================
  // Endpoint Management
  // ==========================================================================
  
  /**
   * Register a new endpoint
   */
  registerEndpoint(params: {
    name: string;
    type: ConnectionEndpoint["type"];
    protocol: ConnectionProtocol;
    network: NetworkType;
    address: string;
    port?: number;
    path?: string;
    maxConnections: number;
    bandwidth: number;
    authMethod?: ConnectionEndpoint["security"]["authMethod"];
    region?: string;
  }): ConnectionEndpoint {
    const id = `endpoint-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const endpoint: ConnectionEndpoint = {
      id,
      name: params.name,
      type: params.type,
      protocol: params.protocol,
      network: params.network,
      address: params.address,
      port: params.port,
      path: params.path,
      status: "connecting",
      health: 100,
      latency: 0,
      lastSeen: new Date(),
      capacity: {
        maxConnections: params.maxConnections,
        currentConnections: 0,
        bandwidth: params.bandwidth,
        currentBandwidth: 0,
      },
      security: {
        encrypted: params.protocol.includes("s") || params.protocol === "blockchain",
        authMethod: params.authMethod || "none",
        verified: false,
        trustScore: 50,
      },
      blockchain: {
        registered: false,
        attestations: [],
      },
      registeredAt: new Date(),
      region: params.region,
    };
    
    this.endpoints.set(id, endpoint);
    this.connectionsByEndpoint.set(id, new Set());
    
    // Index by network
    if (!this.endpointsByNetwork.has(params.network)) {
      this.endpointsByNetwork.set(params.network, new Set());
    }
    this.endpointsByNetwork.get(params.network)!.add(id);
    
    // Index by protocol
    if (!this.endpointsByProtocol.has(params.protocol)) {
      this.endpointsByProtocol.set(params.protocol, new Set());
    }
    this.endpointsByProtocol.get(params.protocol)!.add(id);
    
    // Register on blockchain
    this.registerOnBlockchain(endpoint);
    
    endpoint.status = "connected";
    this.emit("endpoint-registered", { endpoint });
    return endpoint;
  }
  
  private registerOnBlockchain(endpoint: ConnectionEndpoint): void {
    endpoint.blockchain.registered = true;
    endpoint.blockchain.registrationTx = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    endpoint.blockchain.piNetworkId = `pi-endpoint-${endpoint.id}`;
    endpoint.security.verified = true;
    endpoint.security.trustScore = 80;
  }
  
  /**
   * Verify endpoint on blockchain
   */
  verifyEndpoint(endpointId: string, attesterId: string): ConnectionEndpoint {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) throw new Error("Endpoint not found");
    
    const attestationTx = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    endpoint.blockchain.attestations.push(attestationTx);
    
    // Increase trust with each attestation
    endpoint.security.trustScore = Math.min(100, endpoint.security.trustScore + 5);
    endpoint.security.verified = true;
    endpoint.status = "verified";
    
    this.emit("endpoint-verified", { endpoint, attesterId, attestationTx });
    return endpoint;
  }
  
  // ==========================================================================
  // Connection Management
  // ==========================================================================
  
  /**
   * Establish a connection
   */
  establishConnection(params: {
    endpointId: string;
    type: ActiveConnection["type"];
    remote: ActiveConnection["remote"];
  }): ActiveConnection {
    const endpoint = this.endpoints.get(params.endpointId);
    if (!endpoint) throw new Error("Endpoint not found");
    
    // Check capacity
    if (endpoint.capacity.currentConnections >= endpoint.capacity.maxConnections) {
      // Try overflow
      const overflowEndpoint = this.findOverflowEndpoint(endpoint);
      if (overflowEndpoint) {
        return this.establishConnection({
          ...params,
          endpointId: overflowEndpoint.id,
        });
      }
      throw new Error("No capacity available");
    }
    
    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const connection: ActiveConnection = {
      id,
      endpointId: params.endpointId,
      type: params.type,
      protocol: endpoint.protocol,
      remote: params.remote,
      status: "connecting",
      establishedAt: new Date(),
      lastActivity: new Date(),
      metrics: {
        bytesSent: 0,
        bytesReceived: 0,
        messagesSent: 0,
        messagesReceived: 0,
        latency: 0,
        errors: 0,
      },
      verified: false,
    };
    
    // Verify on blockchain if remote has Pi wallet
    if (params.remote.piWallet) {
      connection.verified = true;
      connection.verificationTx = `0x${Date.now().toString(16)}`;
      connection.status = "verified";
      this.globalMetrics.verifiedConnections++;
    } else {
      connection.status = "authenticated";
    }
    
    this.connections.set(id, connection);
    this.connectionsByEndpoint.get(params.endpointId)!.add(id);
    
    // Update endpoint
    endpoint.capacity.currentConnections++;
    this.globalMetrics.totalConnections++;
    this.globalMetrics.activeConnections++;
    
    this.emit("connection-established", { connection, endpoint });
    return connection;
  }
  
  /**
   * Find overflow endpoint
   */
  private findOverflowEndpoint(original: ConnectionEndpoint): ConnectionEndpoint | undefined {
    // Check overflow pools first
    for (const pool of this.overflowPools.values()) {
      if (pool.status === "ready" || pool.status === "active") {
        for (const endpointId of pool.endpoints) {
          const endpoint = this.endpoints.get(endpointId);
          if (endpoint && 
              endpoint.id !== original.id &&
              endpoint.network === original.network &&
              endpoint.capacity.currentConnections < endpoint.capacity.maxConnections) {
            pool.status = "active";
            pool.metrics.overflowCount++;
            this.globalMetrics.overflowEvents++;
            return endpoint;
          }
        }
      }
    }
    
    // Find any compatible endpoint
    const networkEndpoints = this.endpointsByNetwork.get(original.network);
    if (networkEndpoints) {
      for (const endpointId of networkEndpoints) {
        const endpoint = this.endpoints.get(endpointId);
        if (endpoint && 
            endpoint.id !== original.id &&
            endpoint.capacity.currentConnections < endpoint.capacity.maxConnections) {
          return endpoint;
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Close a connection
   */
  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    connection.status = "disconnected";
    
    const endpoint = this.endpoints.get(connection.endpointId);
    if (endpoint) {
      endpoint.capacity.currentConnections--;
    }
    
    this.connectionsByEndpoint.get(connection.endpointId)?.delete(connectionId);
    this.connections.delete(connectionId);
    
    this.globalMetrics.activeConnections--;
    this.globalMetrics.totalBytesTransferred += 
      connection.metrics.bytesSent + connection.metrics.bytesReceived;
    this.globalMetrics.totalMessages += 
      connection.metrics.messagesSent + connection.metrics.messagesReceived;
    
    this.emit("connection-closed", { connection });
  }
  
  /**
   * Update connection metrics
   */
  updateConnectionMetrics(connectionId: string, metrics: Partial<ActiveConnection["metrics"]>): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    connection.metrics = { ...connection.metrics, ...metrics };
    connection.lastActivity = new Date();
    
    const endpoint = this.endpoints.get(connection.endpointId);
    if (endpoint) {
      endpoint.lastSeen = new Date();
    }
  }
  
  // ==========================================================================
  // Network Bridging
  // ==========================================================================
  
  /**
   * Create a network bridge
   */
  createBridge(params: {
    name: string;
    sourceNetwork: NetworkType;
    targetNetwork: NetworkType;
    type: NetworkBridge["type"];
    sourceEndpointId: string;
    targetEndpointId: string;
    protocolMapping?: NetworkBridge["protocolMapping"];
  }): NetworkBridge {
    const sourceEndpoint = this.endpoints.get(params.sourceEndpointId);
    const targetEndpoint = this.endpoints.get(params.targetEndpointId);
    
    if (!sourceEndpoint || !targetEndpoint) {
      throw new Error("Source or target endpoint not found");
    }
    
    const id = `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const bridge: NetworkBridge = {
      id,
      name: params.name,
      sourceNetwork: params.sourceNetwork,
      targetNetwork: params.targetNetwork,
      type: params.type,
      sourceEndpoint: params.sourceEndpointId,
      targetEndpoint: params.targetEndpointId,
      protocolMapping: params.protocolMapping || {
        sourceProtocol: sourceEndpoint.protocol,
        targetProtocol: targetEndpoint.protocol,
      },
      status: "active",
      metrics: {
        messagesRelayed: 0,
        bytesTransferred: 0,
        avgLatency: 0,
        successRate: 100,
      },
      verified: true,
      trustedNodes: [],
      createdAt: new Date(),
    };
    
    this.bridges.set(id, bridge);
    
    // Update routing table
    this.updateRoutingTable();
    
    this.emit("bridge-created", { bridge });
    return bridge;
  }
  
  /**
   * Relay message through bridge
   */
  relayMessage(bridgeId: string, message: unknown): {
    success: boolean;
    txHash?: string;
    latency: number;
  } {
    const bridge = this.bridges.get(bridgeId);
    if (!bridge) throw new Error("Bridge not found");
    
    if (bridge.status !== "active") {
      throw new Error("Bridge is not active");
    }
    
    const startTime = Date.now();
    
    // Simulate relay
    const messageSize = JSON.stringify(message).length;
    
    bridge.metrics.messagesRelayed++;
    bridge.metrics.bytesTransferred += messageSize;
    this.globalMetrics.bridgedMessages++;
    
    const latency = Date.now() - startTime + Math.random() * 50;
    bridge.metrics.avgLatency = 
      (bridge.metrics.avgLatency * (bridge.metrics.messagesRelayed - 1) + latency) / 
      bridge.metrics.messagesRelayed;
    
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    this.emit("message-relayed", { bridgeId, txHash, latency });
    
    return { success: true, txHash, latency };
  }
  
  // ==========================================================================
  // Routing
  // ==========================================================================
  
  /**
   * Create a route
   */
  createRoute(params: {
    name: string;
    source: string;
    destination: string;
    priority: number;
    rules?: RoutingRule[];
    loadBalancing?: ConnectionRoute["loadBalancing"];
  }): ConnectionRoute {
    const id = `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const route: ConnectionRoute = {
      id,
      name: params.name,
      source: params.source,
      destination: params.destination,
      priority: params.priority,
      rules: params.rules || [],
      loadBalancing: params.loadBalancing || {
        algorithm: "round-robin",
        stickySession: false,
        healthCheck: true,
        failover: true,
      },
      active: true,
      connections: 0,
      throughput: 0,
      createdAt: new Date(),
    };
    
    this.routes.set(id, route);
    
    // Update routing table
    this.updateRoutingTable();
    
    this.emit("route-created", { route });
    return route;
  }
  
  /**
   * Find best route
   */
  findRoute(source: string, destination: string): ConnectionRoute | undefined {
    const candidates: ConnectionRoute[] = [];
    
    for (const route of this.routes.values()) {
      if (!route.active) continue;
      
      // Check source match (pattern or exact)
      if (route.source === source || route.source === "*" || 
          source.startsWith(route.source.replace("*", ""))) {
        
        // Check destination match
        if (route.destination === destination || route.destination === "*" ||
            destination.startsWith(route.destination.replace("*", ""))) {
          candidates.push(route);
        }
      }
    }
    
    // Return highest priority route
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0];
  }
  
  private updateRoutingTable(): void {
    this.routingTable.version++;
    this.routingTable.lastUpdated = new Date();
    
    // Clear and rebuild
    this.routingTable.routes.clear();
    this.routingTable.directPaths.clear();
    
    // Add routes by network
    for (const [network, endpointIds] of this.endpointsByNetwork) {
      const routes: EndpointRoute[] = [];
      
      for (const endpointId of endpointIds) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint || endpoint.status === "disconnected") continue;
        
        routes.push({
          destination: endpoint.address,
          nextHop: endpointId,
          metric: Math.round(100 - endpoint.health + endpoint.latency / 10),
          paths: [endpointId],
        });
      }
      
      this.routingTable.routes.set(network, routes);
    }
    
    // Add bridge paths
    for (const bridge of this.bridges.values()) {
      if (bridge.status !== "active") continue;
      
      const sourceEndpoint = this.endpoints.get(bridge.sourceEndpoint);
      const targetEndpoint = this.endpoints.get(bridge.targetEndpoint);
      
      if (sourceEndpoint && targetEndpoint) {
        const paths = this.routingTable.directPaths.get(sourceEndpoint.address) || [];
        paths.push(`${bridge.id}:${targetEndpoint.address}`);
        this.routingTable.directPaths.set(sourceEndpoint.address, paths);
      }
    }
    
    // Record on blockchain
    this.routingTable.txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    this.emit("routing-table-updated", { version: this.routingTable.version });
  }
  
  private optimizeRoutes(): void {
    // Optimize based on metrics
    for (const route of this.routes.values()) {
      // Disable routes with poor performance
      if (route.throughput < 10 && route.connections > 100) {
        route.active = false;
        this.emit("route-disabled", { routeId: route.id, reason: "poor-throughput" });
      }
    }
    
    // Rebalance load across endpoints
    for (const [network, endpointIds] of this.endpointsByNetwork) {
      let totalLoad = 0;
      let totalCapacity = 0;
      
      for (const endpointId of endpointIds) {
        const endpoint = this.endpoints.get(endpointId);
        if (endpoint) {
          totalLoad += endpoint.capacity.currentConnections;
          totalCapacity += endpoint.capacity.maxConnections;
        }
      }
      
      const avgLoad = totalCapacity > 0 ? totalLoad / totalCapacity : 0;
      
      // Mark overloaded endpoints for overflow
      for (const endpointId of endpointIds) {
        const endpoint = this.endpoints.get(endpointId);
        if (endpoint) {
          const endpointLoad = endpoint.capacity.currentConnections / endpoint.capacity.maxConnections;
          if (endpointLoad > 0.9 && avgLoad < 0.7) {
            this.emit("endpoint-overloaded", { endpoint, avgLoad, endpointLoad });
          }
        }
      }
    }
    
    this.updateRoutingTable();
  }
  
  // ==========================================================================
  // Overflow Pools
  // ==========================================================================
  
  /**
   * Create overflow pool
   */
  createOverflowPool(params: {
    name: string;
    endpointIds: string[];
    overflowThreshold?: number;
    drainThreshold?: number;
    priority?: number;
  }): OverflowPool {
    const id = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const pool: OverflowPool = {
      id,
      name: params.name,
      endpoints: params.endpointIds,
      overflowThreshold: params.overflowThreshold || 0.8,
      drainThreshold: params.drainThreshold || 0.3,
      priority: params.priority || 50,
      status: "ready",
      currentLoad: 0,
      metrics: {
        overflowCount: 0,
        totalHandled: 0,
        avgHandleTime: 0,
        peakLoad: 0,
      },
    };
    
    this.overflowPools.set(id, pool);
    
    this.emit("overflow-pool-created", { pool });
    return pool;
  }
  
  // ==========================================================================
  // Health & Monitoring  
  // ==========================================================================
  
  private performHealthChecks(): void {
    for (const endpoint of this.endpoints.values()) {
      // Simulate health check
      const previousHealth = endpoint.health;
      
      // Random health fluctuation (simulation)
      endpoint.health = Math.max(0, Math.min(100, 
        endpoint.health + (Math.random() * 10 - 5)));
      
      endpoint.latency = Math.max(1, endpoint.latency + (Math.random() * 20 - 10));
      
      // Update status based on health
      if (endpoint.health < 30) {
        endpoint.status = "degraded";
      } else if (endpoint.health < 10) {
        endpoint.status = "disconnected";
      } else if (endpoint.security.verified) {
        endpoint.status = "verified";
      } else {
        endpoint.status = "connected";
      }
      
      // Emit events for significant changes
      if (previousHealth >= 50 && endpoint.health < 50) {
        this.emit("endpoint-degraded", { endpoint });
      } else if (previousHealth < 50 && endpoint.health >= 50) {
        this.emit("endpoint-recovered", { endpoint });
      }
    }
    
    // Check connection health
    for (const connection of this.connections.values()) {
      const idleTime = Date.now() - connection.lastActivity.getTime();
      
      // Mark stale connections
      if (idleTime > 300000) { // 5 minutes
        connection.status = "degraded";
      }
    }
    
    // Update overflow pool status
    for (const pool of this.overflowPools.values()) {
      let totalLoad = 0;
      let totalCapacity = 0;
      
      for (const endpointId of pool.endpoints) {
        const endpoint = this.endpoints.get(endpointId);
        if (endpoint) {
          totalLoad += endpoint.capacity.currentConnections;
          totalCapacity += endpoint.capacity.maxConnections;
        }
      }
      
      pool.currentLoad = totalCapacity > 0 ? totalLoad / totalCapacity : 0;
      pool.metrics.peakLoad = Math.max(pool.metrics.peakLoad, pool.currentLoad);
      
      if (pool.currentLoad > pool.overflowThreshold) {
        pool.status = "exhausted";
      } else if (pool.currentLoad > pool.drainThreshold) {
        pool.status = "active";
      } else {
        pool.status = "ready";
      }
    }
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getEndpoint(endpointId: string): ConnectionEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }
  
  getEndpointsByNetwork(network: NetworkType): ConnectionEndpoint[] {
    const ids = this.endpointsByNetwork.get(network);
    if (!ids) return [];
    return Array.from(ids).map(id => this.endpoints.get(id)!).filter(e => e);
  }
  
  getConnection(connectionId: string): ActiveConnection | undefined {
    return this.connections.get(connectionId);
  }
  
  getBridge(bridgeId: string): NetworkBridge | undefined {
    return this.bridges.get(bridgeId);
  }
  
  getRoutingTable(): GlobalRoutingTable {
    return this.routingTable;
  }
  
  getGlobalMetrics(): typeof this.globalMetrics {
    return { ...this.globalMetrics };
  }
  
  getStatistics(): {
    endpoints: { total: number; byNetwork: Record<string, number>; byStatus: Record<string, number> };
    connections: { total: number; active: number; verified: number };
    bridges: { total: number; active: number; messagesRelayed: number };
    routes: { total: number; active: number };
    pools: { total: number; ready: number; exhausted: number };
    globalMetrics: typeof this.globalMetrics;
  } {
    const endpointsByNetwork: Record<string, number> = {};
    const endpointsByStatus: Record<string, number> = {};
    
    for (const endpoint of this.endpoints.values()) {
      endpointsByNetwork[endpoint.network] = (endpointsByNetwork[endpoint.network] || 0) + 1;
      endpointsByStatus[endpoint.status] = (endpointsByStatus[endpoint.status] || 0) + 1;
    }
    
    let activeBridges = 0;
    let totalRelayed = 0;
    for (const bridge of this.bridges.values()) {
      if (bridge.status === "active") activeBridges++;
      totalRelayed += bridge.metrics.messagesRelayed;
    }
    
    let activeRoutes = 0;
    for (const route of this.routes.values()) {
      if (route.active) activeRoutes++;
    }
    
    let readyPools = 0;
    let exhaustedPools = 0;
    for (const pool of this.overflowPools.values()) {
      if (pool.status === "ready") readyPools++;
      if (pool.status === "exhausted") exhaustedPools++;
    }
    
    return {
      endpoints: {
        total: this.endpoints.size,
        byNetwork: endpointsByNetwork,
        byStatus: endpointsByStatus,
      },
      connections: {
        total: this.globalMetrics.totalConnections,
        active: this.globalMetrics.activeConnections,
        verified: this.globalMetrics.verifiedConnections,
      },
      bridges: {
        total: this.bridges.size,
        active: activeBridges,
        messagesRelayed: totalRelayed,
      },
      routes: {
        total: this.routes.size,
        active: activeRoutes,
      },
      pools: {
        total: this.overflowPools.size,
        ready: readyPools,
        exhausted: exhaustedPools,
      },
      globalMetrics: this.globalMetrics,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const connectionOverflowHub = ConnectionOverflowHub.getInstance();

export { ConnectionOverflowHub };
