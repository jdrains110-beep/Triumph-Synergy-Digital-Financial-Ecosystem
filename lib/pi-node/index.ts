/**
 * Pi Node Module Index
 * 
 * Exports all node management, connection resilience, and stability systems.
 */

// Registry and node management
export {
  PI_NODE_ROOT_PUBLIC_KEY,
  PI_NODE_TCP_PORTS,
  SUPPORTED_DOMAINS,
  getPiNodeRegistry,
  getPiNodeSummary,
  registerPiNode,
  registerSuperNode,
  upgradeToSupernode,
  removePiNode,
  updateNodeStatus,
  getNodeById,
} from "./registry";

// Connection resilience
export {
  connectionResilience,
  ConnectionResilienceManager,
  getConnectionMetrics,
  getConnectionStatus,
  forceReconnect,
  getAllActiveConnections,
  getSupernodeConnections,
  type ConnectionState,
  type CircuitBreakerState,
  type ConnectionPriority,
  type NodeConnection,
  type ConnectionPool,
  type ResilienceConfig,
  type ConnectionMetrics,
  type ConnectionEvent,
} from "./connection-resilience";

// Supernode stability
export {
  supernodeStability,
  SupernodeStabilityManager,
  isQuorumMet,
  getConsensusState,
  getActiveSupernodeCount,
  isNetworkStable,
  type SupernodeHealth,
  type ConsensusState,
  type SupernodeStatus,
  type ConsensusQuorum,
  type SupernodeCandidate,
  type StabilityConfig,
  type StabilityMetrics,
} from "./supernode-stability";

// Service guardian
export {
  serviceGuardian,
  ServiceGuardian,
  isServiceHealthy,
  isServiceOperational,
  getServiceHealth,
  getServiceSummary,
  startServiceGuardian,
  stopServiceGuardian,
  type ServiceState,
  type AlertSeverity,
  type ServiceAlert,
  type WatchdogTimer,
  type RecoveryAction,
  type ServiceHealth,
  type GuardianConfig,
  type ServiceSummary,
} from "./service-guardian";

// Pi Node Port Manager
export {
  PI_NODE_PORTS,
  PI_NODE_PORT_RANGE,
  ALL_PI_NODE_PORTS,
  PORT_DESCRIPTIONS,
  DEFAULT_PORT_CONFIG,
  PiNodePortManager,
  getPiNodePortManager,
  initializePiNodePorts,
  type PiNodePort,
  type PortStatus,
  type PortManagerConfig,
} from "./pi-node-ports";

// Types from pi-node
export type {
  PiNode,
  PiSuperNode,
  PiNodeRegistry,
  PiNodeSummary,
  PiNodeStatus,
  PiNodeRole,
  PiNodeCapabilities,
  PiNodeRegistrationRequest,
} from "@/types/pi-node";

// Initialization
export {
  initNodeServices,
  isInitialized,
  getInitializationStatus,
} from "./init";

// Default export: Start the service guardian
export async function initializeNodeServices(): Promise<void> {
  const { startServiceGuardian } = await import("./service-guardian");
  await startServiceGuardian();
}
