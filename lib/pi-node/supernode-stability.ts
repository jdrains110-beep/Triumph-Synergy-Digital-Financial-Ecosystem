/**
 * Supernode Stability System
 * 
 * Ensures supernodes remain stable and available at all times:
 * - Redundant supernode connections
 * - Automatic supernode promotion/demotion
 * - Consensus quorum maintenance
 * - Staking protection
 * - Geographic distribution
 */

import { EventEmitter } from "events";
import type { PiSuperNode, PiNode } from "@/types/pi-node";
import { 
  getPiNodeRegistry, 
  registerSuperNode, 
  upgradeToSupernode, 
  updateNodeStatus,
  getNodeById 
} from "./registry";
import { 
  connectionResilience, 
  type NodeConnection,
  type ConnectionMetrics 
} from "./connection-resilience";

// ============================================================================
// Types
// ============================================================================

export type SupernodeHealth = "excellent" | "good" | "degraded" | "critical" | "offline";

export type ConsensusState = "stable" | "unstable" | "recovering" | "failed";

export interface SupernodeStatus {
  nodeId: string;
  health: SupernodeHealth;
  uptime: number;
  stakingAmount: number;
  delegators: number;
  rewardRate: number;
  latencyMs: number | null;
  lastSeen: Date | null;
  isConnected: boolean;
  isValidating: boolean;
  missedBlocks: number;
  producedBlocks: number;
  slashingRisk: number;
  region: string;
  version: string;
}

export interface ConsensusQuorum {
  requiredNodes: number;
  activeNodes: number;
  isQuorumMet: boolean;
  participatingNodes: string[];
  missingNodes: string[];
  consensusState: ConsensusState;
  lastQuorumCheck: Date;
  consecutiveFailures: number;
}

export interface SupernodeCandidate {
  nodeId: string;
  currentStake: number;
  requiredStake: number;
  uptime: number;
  eligibilityScore: number;
  isEligible: boolean;
  reason: string;
}

export interface StabilityConfig {
  minSupernodes: number;
  minQuorumPercentage: number;
  maxSlashingRisk: number;
  minUptimePercentage: number;
  minStakingAmount: number;
  promotionThresholdScore: number;
  demotionThresholdMissedBlocks: number;
  healthCheckIntervalMs: number;
  quorumCheckIntervalMs: number;
  candidateEvaluationIntervalMs: number;
  geographicRedundancy: boolean;
  minRegions: number;
}

export interface StabilityMetrics {
  totalSupernodes: number;
  activeSupernodes: number;
  healthySupernodes: number;
  degradedSupernodes: number;
  offlineSupernodes: number;
  consensusState: ConsensusState;
  quorumMet: boolean;
  quorumPercentage: number;
  averageUptime: number;
  totalStaked: number;
  totalDelegators: number;
  regionCount: number;
  lastUpdate: Date;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STABILITY_CONFIG: StabilityConfig = {
  minSupernodes: 5,
  minQuorumPercentage: 67,        // 2/3 + 1 for Byzantine fault tolerance
  maxSlashingRisk: 0.1,           // 10% max risk
  minUptimePercentage: 99.5,      // 99.5% minimum uptime
  minStakingAmount: 1000,         // 1000 Pi minimum
  promotionThresholdScore: 80,    // Score out of 100
  demotionThresholdMissedBlocks: 100,
  healthCheckIntervalMs: 10000,   // 10 seconds
  quorumCheckIntervalMs: 5000,    // 5 seconds
  candidateEvaluationIntervalMs: 60000, // 1 minute
  geographicRedundancy: true,
  minRegions: 3,
};

// ============================================================================
// Supernode Stability Manager
// ============================================================================

class SupernodeStabilityManager extends EventEmitter {
  private static instance: SupernodeStabilityManager;
  
  private config: StabilityConfig;
  private supernodeStatuses: Map<string, SupernodeStatus> = new Map();
  private quorumState: ConsensusQuorum;
  private candidates: Map<string, SupernodeCandidate> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private quorumCheckInterval: NodeJS.Timeout | null = null;
  private candidateCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private startTime: Date | null = null;
  
  private constructor(config: Partial<StabilityConfig> = {}) {
    super();
    this.config = { ...DEFAULT_STABILITY_CONFIG, ...config };
    this.quorumState = this.initializeQuorumState();
    this.setMaxListeners(50);
  }
  
  static getInstance(config?: Partial<StabilityConfig>): SupernodeStabilityManager {
    if (!SupernodeStabilityManager.instance) {
      SupernodeStabilityManager.instance = new SupernodeStabilityManager(config);
    }
    return SupernodeStabilityManager.instance;
  }
  
  /**
   * Initialize quorum state
   */
  private initializeQuorumState(): ConsensusQuorum {
    return {
      requiredNodes: Math.ceil(this.config.minSupernodes * (this.config.minQuorumPercentage / 100)),
      activeNodes: 0,
      isQuorumMet: false,
      participatingNodes: [],
      missingNodes: [],
      consensusState: "recovering",
      lastQuorumCheck: new Date(),
      consecutiveFailures: 0,
    };
  }
  
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  
  /**
   * Start the stability manager
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = new Date();
    
    console.log("[SupernodeStability] Starting Supernode Stability Manager...");
    
    // Initialize supernode statuses
    await this.initializeSupernodeStatuses();
    
    // Start monitoring loops
    this.startHealthMonitoring();
    this.startQuorumMonitoring();
    this.startCandidateEvaluation();
    
    // Subscribe to connection events
    connectionResilience.on("connection-event", (event) => {
      if (this.isSupernodeConnection(event.nodeId)) {
        this.handleConnectionEvent(event);
      }
    });
    
    this.emit("started", { timestamp: new Date() });
    console.log("[SupernodeStability] Supernode Stability Manager started");
  }
  
  /**
   * Stop the stability manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.quorumCheckInterval) {
      clearInterval(this.quorumCheckInterval);
      this.quorumCheckInterval = null;
    }
    
    if (this.candidateCheckInterval) {
      clearInterval(this.candidateCheckInterval);
      this.candidateCheckInterval = null;
    }
    
    this.emit("stopped", { timestamp: new Date() });
    console.log("[SupernodeStability] Supernode Stability Manager stopped");
  }
  
  // ==========================================================================
  // Initialization
  // ==========================================================================
  
  /**
   * Initialize status tracking for all supernodes
   */
  private async initializeSupernodeStatuses(): Promise<void> {
    const registry = getPiNodeRegistry();
    
    for (const supernode of registry.supernodes) {
      const status = this.createSupernodeStatus(supernode);
      this.supernodeStatuses.set(supernode.id, status);
    }
    
    console.log(`[SupernodeStability] Tracking ${this.supernodeStatuses.size} supernodes`);
  }
  
  /**
   * Create initial status for a supernode
   */
  private createSupernodeStatus(supernode: PiSuperNode): SupernodeStatus {
    const connection = connectionResilience.getConnection(supernode.id);
    
    return {
      nodeId: supernode.id,
      health: this.calculateHealth(supernode, connection),
      uptime: 100, // Start at 100%
      stakingAmount: supernode.stakingAmount,
      delegators: supernode.delegators,
      rewardRate: supernode.rewardRate,
      latencyMs: connection?.latencyMs ?? null,
      lastSeen: connection?.lastHeartbeat ?? null,
      isConnected: connection?.state === "connected",
      isValidating: supernode.capabilities?.validation ?? false,
      missedBlocks: 0,
      producedBlocks: 0,
      slashingRisk: 0,
      region: supernode.region || "unknown",
      version: supernode.version || "unknown",
    };
  }
  
  // ==========================================================================
  // Health Monitoring
  // ==========================================================================
  
  /**
   * Start health monitoring loop
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }
  
  /**
   * Perform health check on all supernodes
   */
  private performHealthCheck(): void {
    const registry = getPiNodeRegistry();
    
    for (const supernode of registry.supernodes) {
      const status = this.supernodeStatuses.get(supernode.id);
      if (!status) continue;
      
      const connection = connectionResilience.getConnection(supernode.id);
      const previousHealth = status.health;
      
      // Update status
      status.isConnected = connection?.state === "connected";
      status.latencyMs = connection?.latencyMs ?? null;
      status.lastSeen = connection?.lastHeartbeat ?? null;
      status.health = this.calculateHealth(supernode, connection);
      
      // Update uptime based on health
      if (status.isConnected && status.health !== "offline") {
        status.uptime = Math.min(100, status.uptime + 0.001); // Slowly increase
      } else {
        status.uptime = Math.max(0, status.uptime - 0.1); // Decrease faster
      }
      
      // Calculate slashing risk
      status.slashingRisk = this.calculateSlashingRisk(status);
      
      // Emit health change event
      if (previousHealth !== status.health) {
        this.emit("health-changed", {
          nodeId: supernode.id,
          previousHealth,
          currentHealth: status.health,
          timestamp: new Date(),
        });
        
        // Handle critical health
        if (status.health === "critical" || status.health === "offline") {
          this.handleCriticalSupernode(supernode.id, status);
        }
      }
    }
  }
  
  /**
   * Calculate supernode health
   */
  private calculateHealth(supernode: PiSuperNode, connection?: NodeConnection): SupernodeHealth {
    if (!connection || connection.state !== "connected") {
      return "offline";
    }
    
    const factors = {
      connected: connection.state === "connected" ? 1 : 0,
      latency: connection.latencyMs ? (connection.latencyMs < 100 ? 1 : connection.latencyMs < 500 ? 0.5 : 0.2) : 0.5,
      staking: supernode.stakingAmount >= this.config.minStakingAmount ? 1 : 0.5,
      circuitBreaker: connection.circuitBreaker === "closed" ? 1 : 0.3,
    };
    
    const score = (factors.connected * 0.4 + factors.latency * 0.2 + factors.staking * 0.2 + factors.circuitBreaker * 0.2) * 100;
    
    if (score >= 90) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "degraded";
    if (score >= 20) return "critical";
    return "offline";
  }
  
  /**
   * Calculate slashing risk
   */
  private calculateSlashingRisk(status: SupernodeStatus): number {
    let risk = 0;
    
    // Missed blocks increase risk
    risk += (status.missedBlocks / 1000) * 0.3;
    
    // Low uptime increases risk
    if (status.uptime < this.config.minUptimePercentage) {
      risk += (1 - status.uptime / 100) * 0.4;
    }
    
    // Poor health increases risk
    const healthRisk = {
      excellent: 0,
      good: 0.05,
      degraded: 0.15,
      critical: 0.3,
      offline: 0.5,
    };
    risk += healthRisk[status.health];
    
    return Math.min(1, risk);
  }
  
  /**
   * Handle critical supernode
   */
  private handleCriticalSupernode(nodeId: string, status: SupernodeStatus): void {
    console.warn(`[SupernodeStability] CRITICAL: Supernode ${nodeId} is ${status.health}`);
    
    // Emit alert
    this.emit("supernode-critical", {
      nodeId,
      health: status.health,
      slashingRisk: status.slashingRisk,
      timestamp: new Date(),
    });
    
    // Check if we need emergency promotion
    this.checkEmergencyPromotion();
  }
  
  // ==========================================================================
  // Quorum Monitoring
  // ==========================================================================
  
  /**
   * Start quorum monitoring loop
   */
  private startQuorumMonitoring(): void {
    this.quorumCheckInterval = setInterval(() => {
      this.checkQuorum();
    }, this.config.quorumCheckIntervalMs);
  }
  
  /**
   * Check consensus quorum
   */
  private checkQuorum(): void {
    const activeSupernodes = Array.from(this.supernodeStatuses.values())
      .filter(s => s.isConnected && s.health !== "offline" && s.health !== "critical");
    
    const previousState = this.quorumState.consensusState;
    
    this.quorumState.activeNodes = activeSupernodes.length;
    this.quorumState.participatingNodes = activeSupernodes.map(s => s.nodeId);
    this.quorumState.missingNodes = Array.from(this.supernodeStatuses.values())
      .filter(s => !s.isConnected || s.health === "offline")
      .map(s => s.nodeId);
    this.quorumState.isQuorumMet = activeSupernodes.length >= this.quorumState.requiredNodes;
    this.quorumState.lastQuorumCheck = new Date();
    
    // Update consensus state
    if (this.quorumState.isQuorumMet) {
      this.quorumState.consensusState = "stable";
      this.quorumState.consecutiveFailures = 0;
    } else {
      this.quorumState.consecutiveFailures++;
      
      if (this.quorumState.consecutiveFailures >= 3) {
        this.quorumState.consensusState = "failed";
      } else if (this.quorumState.consecutiveFailures >= 1) {
        this.quorumState.consensusState = "unstable";
      }
    }
    
    // Emit state change
    if (previousState !== this.quorumState.consensusState) {
      this.emit("consensus-state-changed", {
        previousState,
        currentState: this.quorumState.consensusState,
        activeNodes: this.quorumState.activeNodes,
        requiredNodes: this.quorumState.requiredNodes,
        timestamp: new Date(),
      });
      
      // Handle quorum loss
      if (!this.quorumState.isQuorumMet) {
        this.handleQuorumLoss();
      }
    }
  }
  
  /**
   * Handle quorum loss emergency
   */
  private async handleQuorumLoss(): Promise<void> {
    console.error(`[SupernodeStability] EMERGENCY: Quorum lost! ${this.quorumState.activeNodes}/${this.quorumState.requiredNodes}`);
    
    this.emit("quorum-lost", {
      activeNodes: this.quorumState.activeNodes,
      requiredNodes: this.quorumState.requiredNodes,
      missingNodes: this.quorumState.missingNodes,
      timestamp: new Date(),
    });
    
    // Attempt recovery
    await this.attemptQuorumRecovery();
  }
  
  /**
   * Attempt to recover quorum
   */
  private async attemptQuorumRecovery(): Promise<void> {
    console.log("[SupernodeStability] Attempting quorum recovery...");
    
    // 1. Try to reconnect offline supernodes
    for (const nodeId of this.quorumState.missingNodes) {
      const status = this.supernodeStatuses.get(nodeId);
      if (status) {
        console.log(`[SupernodeStability] Attempting to reconnect ${nodeId}...`);
        // Force reconnection attempt
        const connection = connectionResilience.getConnection(nodeId);
        if (connection && connection.circuitBreaker === "open") {
          // Reset circuit breaker for emergency
          connection.circuitBreaker = "half-open";
          connection.circuitBreakerFailures = 0;
        }
      }
    }
    
    // 2. Check if we need emergency promotions
    await this.checkEmergencyPromotion();
    
    // 3. Try pool failover
    const supernodePool = connectionResilience.getPool("supernodes");
    if (supernodePool) {
      await connectionResilience["failover"]("supernodes");
    }
  }
  
  // ==========================================================================
  // Candidate Management
  // ==========================================================================
  
  /**
   * Start candidate evaluation loop
   */
  private startCandidateEvaluation(): void {
    this.candidateCheckInterval = setInterval(() => {
      this.evaluateCandidates();
    }, this.config.candidateEvaluationIntervalMs);
  }
  
  /**
   * Evaluate regular nodes as supernode candidates
   */
  private evaluateCandidates(): void {
    const registry = getPiNodeRegistry();
    
    for (const node of registry.nodes) {
      if (node.role === "supernode") continue;
      
      const candidate = this.evaluateNode(node);
      this.candidates.set(node.id, candidate);
      
      // Auto-promote if threshold met and needed
      if (candidate.isEligible && candidate.eligibilityScore >= this.config.promotionThresholdScore) {
        const activeSupernodes = Array.from(this.supernodeStatuses.values())
          .filter(s => s.health !== "offline" && s.health !== "critical").length;
        
        if (activeSupernodes < this.config.minSupernodes) {
          this.promoteToSupernode(node.id, candidate.currentStake);
        }
      }
    }
  }
  
  /**
   * Evaluate a node's eligibility for supernode promotion
   */
  private evaluateNode(node: PiNode): SupernodeCandidate {
    const connection = connectionResilience.getConnection(node.id);
    
    const currentStake = 0; // Would come from staking system
    const uptime = connection?.uptime ?? 0;
    
    let score = 0;
    let reasons: string[] = [];
    
    // Check staking
    if (currentStake >= this.config.minStakingAmount) {
      score += 30;
    } else {
      reasons.push(`Insufficient stake (${currentStake}/${this.config.minStakingAmount})`);
    }
    
    // Check uptime
    if (uptime >= this.config.minUptimePercentage) {
      score += 30;
    } else {
      reasons.push(`Low uptime (${uptime.toFixed(2)}%)`);
    }
    
    // Check connection quality
    if (connection?.state === "connected") {
      score += 20;
      if (connection.latencyMs && connection.latencyMs < 100) {
        score += 10;
      }
    } else {
      reasons.push("Not connected");
    }
    
    // Check capabilities
    if (node.capabilities?.validation && node.capabilities?.consensus) {
      score += 10;
    }
    
    return {
      nodeId: node.id,
      currentStake,
      requiredStake: this.config.minStakingAmount,
      uptime,
      eligibilityScore: score,
      isEligible: reasons.length === 0 && currentStake >= this.config.minStakingAmount,
      reason: reasons.length > 0 ? reasons.join("; ") : "Eligible",
    };
  }
  
  /**
   * Check if emergency promotion is needed
   */
  private async checkEmergencyPromotion(): Promise<void> {
    const activeSupernodes = Array.from(this.supernodeStatuses.values())
      .filter(s => s.health !== "offline" && s.health !== "critical").length;
    
    if (activeSupernodes < this.config.minSupernodes) {
      const neededPromotions = this.config.minSupernodes - activeSupernodes;
      console.warn(`[SupernodeStability] Need ${neededPromotions} emergency supernode promotions`);
      
      // Get best candidates
      const eligibleCandidates = Array.from(this.candidates.values())
        .filter(c => c.isEligible)
        .sort((a, b) => b.eligibilityScore - a.eligibilityScore)
        .slice(0, neededPromotions);
      
      for (const candidate of eligibleCandidates) {
        await this.promoteToSupernode(candidate.nodeId, candidate.currentStake);
      }
    }
  }
  
  /**
   * Promote a node to supernode
   */
  private async promoteToSupernode(nodeId: string, stakingAmount: number): Promise<boolean> {
    console.log(`[SupernodeStability] Promoting ${nodeId} to supernode...`);
    
    const result = upgradeToSupernode(nodeId, Math.max(stakingAmount, this.config.minStakingAmount));
    
    if (result.ok && result.supernode) {
      // Create status for new supernode
      const status = this.createSupernodeStatus(result.supernode);
      this.supernodeStatuses.set(nodeId, status);
      
      // Remove from candidates
      this.candidates.delete(nodeId);
      
      this.emit("supernode-promoted", {
        nodeId,
        stakingAmount,
        timestamp: new Date(),
      });
      
      console.log(`[SupernodeStability] Successfully promoted ${nodeId} to supernode`);
      return true;
    }
    
    console.error(`[SupernodeStability] Failed to promote ${nodeId}: ${result.message}`);
    return false;
  }
  
  // ==========================================================================
  // Event Handling
  // ==========================================================================
  
  /**
   * Check if a node is a supernode
   */
  private isSupernodeConnection(nodeId: string): boolean {
    return this.supernodeStatuses.has(nodeId);
  }
  
  /**
   * Handle connection events for supernodes
   */
  private handleConnectionEvent(event: { type: string; nodeId: string; details: Record<string, unknown> }): void {
    const status = this.supernodeStatuses.get(event.nodeId);
    if (!status) return;
    
    switch (event.type) {
      case "connected":
        status.isConnected = true;
        status.lastSeen = new Date();
        break;
        
      case "disconnected":
        status.isConnected = false;
        break;
        
      case "heartbeat":
        status.lastSeen = new Date();
        status.latencyMs = (event.details.latencyMs as number) ?? null;
        break;
        
      case "failed":
        status.isConnected = false;
        status.health = "offline";
        this.handleCriticalSupernode(event.nodeId, status);
        break;
    }
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  /**
   * Get supernode status
   */
  getSupernodeStatus(nodeId: string): SupernodeStatus | undefined {
    return this.supernodeStatuses.get(nodeId);
  }
  
  /**
   * Get all supernode statuses
   */
  getAllSupernodeStatuses(): SupernodeStatus[] {
    return Array.from(this.supernodeStatuses.values());
  }
  
  /**
   * Get quorum state
   */
  getQuorumState(): ConsensusQuorum {
    return { ...this.quorumState };
  }
  
  /**
   * Get stability metrics
   */
  getStabilityMetrics(): StabilityMetrics {
    const statuses = Array.from(this.supernodeStatuses.values());
    const regions = new Set(statuses.map(s => s.region));
    
    return {
      totalSupernodes: statuses.length,
      activeSupernodes: statuses.filter(s => s.isConnected).length,
      healthySupernodes: statuses.filter(s => s.health === "excellent" || s.health === "good").length,
      degradedSupernodes: statuses.filter(s => s.health === "degraded").length,
      offlineSupernodes: statuses.filter(s => s.health === "offline").length,
      consensusState: this.quorumState.consensusState,
      quorumMet: this.quorumState.isQuorumMet,
      quorumPercentage: (this.quorumState.activeNodes / this.quorumState.requiredNodes) * 100,
      averageUptime: statuses.length > 0 
        ? statuses.reduce((sum, s) => sum + s.uptime, 0) / statuses.length 
        : 0,
      totalStaked: statuses.reduce((sum, s) => sum + s.stakingAmount, 0),
      totalDelegators: statuses.reduce((sum, s) => sum + s.delegators, 0),
      regionCount: regions.size,
      lastUpdate: new Date(),
    };
  }
  
  /**
   * Get candidates
   */
  getCandidates(): SupernodeCandidate[] {
    return Array.from(this.candidates.values());
  }
  
  /**
   * Get eligible candidates
   */
  getEligibleCandidates(): SupernodeCandidate[] {
    return Array.from(this.candidates.values()).filter(c => c.isEligible);
  }
  
  /**
   * Force quorum check
   */
  forceQuorumCheck(): ConsensusQuorum {
    this.checkQuorum();
    return this.getQuorumState();
  }
  
  /**
   * Force health check
   */
  forceHealthCheck(): void {
    this.performHealthCheck();
  }
  
  /**
   * Check if system is stable
   */
  isStable(): boolean {
    return (
      this.isRunning &&
      this.quorumState.isQuorumMet &&
      this.quorumState.consensusState === "stable"
    );
  }
  
  /**
   * Get configuration
   */
  getConfig(): StabilityConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<StabilityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.quorumState.requiredNodes = Math.ceil(
      this.config.minSupernodes * (this.config.minQuorumPercentage / 100)
    );
    this.emit("config-updated", this.config);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const supernodeStability = SupernodeStabilityManager.getInstance();

export { SupernodeStabilityManager };

// Helper functions
export function isQuorumMet(): boolean {
  return supernodeStability.getQuorumState().isQuorumMet;
}

export function getConsensusState(): ConsensusState {
  return supernodeStability.getQuorumState().consensusState;
}

export function getActiveSupernodeCount(): number {
  return supernodeStability.getStabilityMetrics().activeSupernodes;
}

export function isNetworkStable(): boolean {
  return supernodeStability.isStable();
}
