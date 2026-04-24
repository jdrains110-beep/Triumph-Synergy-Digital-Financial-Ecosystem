/**
 * Service Guardian
 * 
 * Master orchestrator that ensures all node connections and supernodes remain
 * SECURE, STABLE, and NEVER INTERRUPTIBLE as long as triumph-synergy has service.
 * 
 * Features:
 * - Automatic service recovery
 * - Watchdog timers
 * - Graceful degradation
 * - Emergency protocols
 * - Health dashboards
 */

import { EventEmitter } from "events";
import { 
  connectionResilience, 
  ConnectionResilienceManager,
  type ConnectionMetrics,
  type NodeConnection
} from "./connection-resilience";
import { 
  supernodeStability,
  SupernodeStabilityManager,
  type StabilityMetrics,
  type ConsensusQuorum 
} from "./supernode-stability";
import { getPiNodeRegistry, getPiNodeSummary } from "./registry";
import type { PiNodeSummary } from "@/types/pi-node";

// ============================================================================
// Types
// ============================================================================

export type ServiceState = "starting" | "running" | "degraded" | "recovering" | "stopped" | "failed";

export type AlertSeverity = "info" | "warning" | "critical" | "emergency";

export interface ServiceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt: Date | null;
}

export interface WatchdogTimer {
  id: string;
  name: string;
  intervalMs: number;
  lastTick: Date | null;
  missedCount: number;
  maxMissed: number;
  handler: () => void | Promise<void>;
  isActive: boolean;
}

export interface RecoveryAction {
  id: string;
  name: string;
  priority: number;
  condition: () => boolean;
  action: () => Promise<boolean>;
  lastAttempt: Date | null;
  successCount: number;
  failureCount: number;
  cooldownMs: number;
}

export interface ServiceHealth {
  state: ServiceState;
  overallHealth: number; // 0-100
  connectionHealth: number;
  supernodeHealth: number;
  consensusHealth: number;
  uptime: number;
  lastHealthCheck: Date;
}

export interface GuardianConfig {
  enableAutoRecovery: boolean;
  enableWatchdogs: boolean;
  healthCheckIntervalMs: number;
  watchdogIntervalMs: number;
  maxRecoveryAttempts: number;
  recoveryBackoffMs: number;
  gracefulDegradationEnabled: boolean;
  emergencyProtocolsEnabled: boolean;
  alertRetentionMinutes: number;
  minAcceptableHealth: number;
}

export interface ServiceSummary {
  state: ServiceState;
  health: ServiceHealth;
  connectionMetrics: ConnectionMetrics;
  stabilityMetrics: StabilityMetrics;
  nodesSummary: PiNodeSummary;
  quorumState: ConsensusQuorum;
  activeAlerts: ServiceAlert[];
  uptimeSeconds: number;
  lastUpdate: Date;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_GUARDIAN_CONFIG: GuardianConfig = {
  enableAutoRecovery: true,
  enableWatchdogs: true,
  healthCheckIntervalMs: 5000,
  watchdogIntervalMs: 10000,
  maxRecoveryAttempts: 10,
  recoveryBackoffMs: 5000,
  gracefulDegradationEnabled: true,
  emergencyProtocolsEnabled: true,
  alertRetentionMinutes: 60,
  minAcceptableHealth: 50,
};

// ============================================================================
// Service Guardian
// ============================================================================

class ServiceGuardian extends EventEmitter {
  private static instance: ServiceGuardian;
  
  private config: GuardianConfig;
  private state: ServiceState = "stopped";
  private health: ServiceHealth;
  private alerts: Map<string, ServiceAlert> = new Map();
  private watchdogs: Map<string, WatchdogTimer> = new Map();
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private watchdogInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private alertCleanupInterval: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private recoveryAttempts = 0;
  private lastRecoveryAttempt: Date | null = null;
  
  private constructor(config: Partial<GuardianConfig> = {}) {
    super();
    this.config = { ...DEFAULT_GUARDIAN_CONFIG, ...config };
    this.health = this.initializeHealth();
    this.setMaxListeners(100);
    this.setupRecoveryActions();
  }
  
  static getInstance(config?: Partial<GuardianConfig>): ServiceGuardian {
    if (!ServiceGuardian.instance) {
      ServiceGuardian.instance = new ServiceGuardian(config);
    }
    return ServiceGuardian.instance;
  }
  
  /**
   * Initialize health state
   */
  private initializeHealth(): ServiceHealth {
    return {
      state: "stopped",
      overallHealth: 0,
      connectionHealth: 0,
      supernodeHealth: 0,
      consensusHealth: 0,
      uptime: 0,
      lastHealthCheck: new Date(),
    };
  }
  
  /**
   * Setup recovery actions
   */
  private setupRecoveryActions(): void {
    // Connection recovery
    this.registerRecoveryAction({
      id: "recover-connections",
      name: "Reconnect Disconnected Nodes",
      priority: 1,
      condition: () => {
        const metrics = connectionResilience.getMetrics();
        return metrics.activeConnections < metrics.totalConnections * 0.5;
      },
      action: async () => {
        console.log("[Guardian] Attempting to recover connections...");
        const connections = connectionResilience.getAllConnections();
        let recovered = 0;
        
        for (const conn of connections) {
          if (conn.state === "failed" || conn.state === "disconnected") {
            // Reset and retry
            conn.reconnectAttempts = 0;
            conn.circuitBreaker = "closed";
            conn.circuitBreakerFailures = 0;
            recovered++;
          }
        }
        
        return recovered > 0;
      },
      cooldownMs: 30000,
    });
    
    // Supernode recovery
    this.registerRecoveryAction({
      id: "recover-supernodes",
      name: "Restore Supernode Quorum",
      priority: 0, // Highest priority
      condition: () => !supernodeStability.isStable(),
      action: async () => {
        console.log("[Guardian] Attempting to restore supernode quorum...");
        supernodeStability.forceQuorumCheck();
        return supernodeStability.isStable();
      },
      cooldownMs: 15000,
    });
    
    // Service restart
    this.registerRecoveryAction({
      id: "restart-subsystems",
      name: "Restart Subsystems",
      priority: 2,
      condition: () => this.health.overallHealth < 30,
      action: async () => {
        console.log("[Guardian] Restarting subsystems...");
        
        // Stop and restart resilience manager
        if (connectionResilience.isActive()) {
          await connectionResilience.stop();
        }
        await connectionResilience.start();
        
        // Stop and restart stability manager
        await supernodeStability.stop();
        await supernodeStability.start();
        
        return true;
      },
      cooldownMs: 60000,
    });
  }
  
  // ==========================================================================
  // Lifecycle
  // ==========================================================================
  
  /**
   * Start the guardian and all subsystems
   */
  async start(): Promise<void> {
    if (this.state === "running") {
      console.log("[Guardian] Already running");
      return;
    }
    
    this.state = "starting";
    this.startTime = new Date();
    console.log("[Guardian] ═══════════════════════════════════════════════════════════");
    console.log("[Guardian] Starting Service Guardian...");
    console.log("[Guardian] Ensuring all connections remain SECURE, STABLE, and UNINTERRUPTIBLE");
    console.log("[Guardian] ═══════════════════════════════════════════════════════════");
    
    try {
      // Start connection resilience manager
      console.log("[Guardian] Starting Connection Resilience Manager...");
      await connectionResilience.start();
      
      // Start supernode stability manager
      console.log("[Guardian] Starting Supernode Stability Manager...");
      await supernodeStability.start();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start watchdogs
      if (this.config.enableWatchdogs) {
        this.startWatchdogs();
      }
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start alert cleanup
      this.startAlertCleanup();
      
      this.state = "running";
      this.emit("started", { timestamp: new Date() });
      
      console.log("[Guardian] ═══════════════════════════════════════════════════════════");
      console.log("[Guardian] Service Guardian ACTIVE - All systems protected");
      console.log("[Guardian] ═══════════════════════════════════════════════════════════");
      
    } catch (error) {
      this.state = "failed";
      this.raiseAlert("critical", "Startup Failure", `Failed to start guardian: ${(error as Error).message}`, "guardian");
      throw error;
    }
  }
  
  /**
   * Stop the guardian and all subsystems
   */
  async stop(): Promise<void> {
    if (this.state === "stopped") return;
    
    console.log("[Guardian] Stopping Service Guardian...");
    this.state = "stopped";
    
    // Stop intervals
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.alertCleanupInterval) {
      clearInterval(this.alertCleanupInterval);
      this.alertCleanupInterval = null;
    }
    
    // Stop watchdogs
    for (const watchdog of this.watchdogs.values()) {
      watchdog.isActive = false;
    }
    
    // Stop subsystems
    await supernodeStability.stop();
    await connectionResilience.stop();
    
    this.emit("stopped", { timestamp: new Date() });
    console.log("[Guardian] Service Guardian stopped");
  }
  
  // ==========================================================================
  // Event Handling
  // ==========================================================================
  
  /**
   * Setup event listeners for subsystems
   */
  private setupEventListeners(): void {
    // Connection events
    connectionResilience.on("connection-event", (event) => {
      if (event.type === "failed") {
        this.raiseAlert("warning", "Connection Failed", `Connection to ${event.nodeId} failed`, "resilience");
      } else if (event.type === "recovered") {
        this.resolveAlert(`connection-failed-${event.nodeId}`);
      } else if (event.type === "circuit-open") {
        this.raiseAlert("warning", "Circuit Breaker Open", `Circuit breaker opened for ${event.nodeId}`, "resilience");
      }
    });
    
    connectionResilience.on("pool-unhealthy", (data) => {
      this.raiseAlert("warning", "Pool Unhealthy", `Connection pool ${data.poolId} is unhealthy`, "resilience");
    });
    
    // Supernode events
    supernodeStability.on("health-changed", (data) => {
      if (data.currentHealth === "critical" || data.currentHealth === "offline") {
        this.raiseAlert("critical", "Supernode Critical", `Supernode ${data.nodeId} is ${data.currentHealth}`, "stability");
      }
    });
    
    supernodeStability.on("quorum-lost", (data) => {
      this.raiseAlert("emergency", "Quorum Lost", `Consensus quorum lost! ${data.activeNodes}/${data.requiredNodes} nodes`, "stability");
    });
    
    supernodeStability.on("consensus-state-changed", (data) => {
      if (data.currentState === "failed") {
        this.raiseAlert("emergency", "Consensus Failed", "Consensus mechanism has failed", "stability");
      } else if (data.currentState === "stable" && data.previousState !== "stable") {
        this.resolveAlert("consensus-unstable");
        this.raiseAlert("info", "Consensus Restored", "Consensus mechanism is stable", "stability");
      }
    });
    
    supernodeStability.on("supernode-promoted", (data) => {
      this.raiseAlert("info", "Supernode Promoted", `Node ${data.nodeId} promoted to supernode`, "stability");
    });
  }
  
  // ==========================================================================
  // Health Monitoring
  // ==========================================================================
  
  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
    
    // Initial check
    this.performHealthCheck();
  }
  
  /**
   * Perform comprehensive health check
   */
  private performHealthCheck(): void {
    const connectionMetrics = connectionResilience.getMetrics();
    const stabilityMetrics = supernodeStability.getStabilityMetrics();
    const quorumState = supernodeStability.getQuorumState();
    
    // Calculate individual health scores (0-100)
    const connectionHealth = connectionMetrics.totalConnections > 0
      ? (connectionMetrics.activeConnections / connectionMetrics.totalConnections) * 100
      : 0;
    
    const supernodeHealth = stabilityMetrics.totalSupernodes > 0
      ? (stabilityMetrics.healthySupernodes / stabilityMetrics.totalSupernodes) * 100
      : 0;
    
    const consensusHealth = quorumState.isQuorumMet ? 100 : 
      (quorumState.activeNodes / quorumState.requiredNodes) * 100;
    
    // Calculate overall health (weighted average)
    const overallHealth = Math.round(
      connectionHealth * 0.3 +
      supernodeHealth * 0.4 +
      consensusHealth * 0.3
    );
    
    // Update health state
    this.health = {
      state: this.state,
      overallHealth,
      connectionHealth,
      supernodeHealth,
      consensusHealth,
      uptime: this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0,
      lastHealthCheck: new Date(),
    };
    
    // Determine state based on health
    if (this.state !== "stopped") {
      if (overallHealth >= 80) {
        this.state = "running";
      } else if (overallHealth >= this.config.minAcceptableHealth) {
        this.state = "degraded";
        this.raiseAlert("warning", "Degraded Performance", `System health at ${overallHealth}%`, "guardian");
      } else {
        this.state = "recovering";
        this.raiseAlert("critical", "System Recovery", `System health critical at ${overallHealth}%`, "guardian");
        
        // Trigger auto-recovery if enabled
        if (this.config.enableAutoRecovery) {
          this.performRecovery();
        }
      }
    }
    
    this.emit("health-check", this.health);
  }
  
  // ==========================================================================
  // Watchdogs
  // ==========================================================================
  
  /**
   * Start watchdog timers
   */
  private startWatchdogs(): void {
    // Connection watchdog
    this.registerWatchdog({
      id: "connection-watchdog",
      name: "Connection Watchdog",
      intervalMs: 30000,
      maxMissed: 3,
      handler: () => {
        const metrics = connectionResilience.getMetrics();
        if (metrics.activeConnections === 0) {
          this.raiseAlert("emergency", "All Connections Lost", "No active connections detected", "watchdog");
          this.performRecovery();
        }
      },
    });
    
    // Supernode watchdog
    this.registerWatchdog({
      id: "supernode-watchdog",
      name: "Supernode Watchdog",
      intervalMs: 15000,
      maxMissed: 2,
      handler: () => {
        if (!supernodeStability.isStable()) {
          this.raiseAlert("critical", "Supernode Instability", "Supernode system is unstable", "watchdog");
        }
      },
    });
    
    // Heartbeat watchdog
    this.registerWatchdog({
      id: "heartbeat-watchdog",
      name: "System Heartbeat",
      intervalMs: 10000,
      maxMissed: 5,
      handler: () => {
        this.emit("heartbeat", { timestamp: new Date() });
      },
    });
    
    // Start watchdog loop
    this.watchdogInterval = setInterval(() => {
      this.tickWatchdogs();
    }, this.config.watchdogIntervalMs);
  }
  
  /**
   * Register a watchdog timer
   */
  private registerWatchdog(config: Omit<WatchdogTimer, "lastTick" | "missedCount" | "isActive">): void {
    this.watchdogs.set(config.id, {
      ...config,
      lastTick: null,
      missedCount: 0,
      isActive: true,
    });
  }
  
  /**
   * Tick all watchdogs
   */
  private tickWatchdogs(): void {
    for (const [id, watchdog] of this.watchdogs) {
      if (!watchdog.isActive) continue;
      
      const now = Date.now();
      const timeSinceLastTick = watchdog.lastTick 
        ? now - watchdog.lastTick.getTime() 
        : watchdog.intervalMs;
      
      if (timeSinceLastTick >= watchdog.intervalMs) {
        try {
          const result = watchdog.handler();
          if (result instanceof Promise) {
            result.catch(err => console.error(`[Guardian] Watchdog ${id} error:`, err));
          }
          watchdog.lastTick = new Date();
          watchdog.missedCount = 0;
        } catch (error) {
          watchdog.missedCount++;
          console.error(`[Guardian] Watchdog ${id} failed:`, error);
          
          if (watchdog.missedCount >= watchdog.maxMissed) {
            this.raiseAlert("critical", "Watchdog Failure", `Watchdog ${watchdog.name} exceeded max missed ticks`, "watchdog");
          }
        }
      }
    }
  }
  
  // ==========================================================================
  // Recovery
  // ==========================================================================
  
  /**
   * Register a recovery action
   */
  private registerRecoveryAction(config: Omit<RecoveryAction, "lastAttempt" | "successCount" | "failureCount">): void {
    this.recoveryActions.set(config.id, {
      ...config,
      lastAttempt: null,
      successCount: 0,
      failureCount: 0,
    });
  }
  
  /**
   * Perform automatic recovery
   */
  private async performRecovery(): Promise<void> {
    if (!this.config.enableAutoRecovery) return;
    
    // Check if we're in cooldown
    if (this.lastRecoveryAttempt) {
      const timeSince = Date.now() - this.lastRecoveryAttempt.getTime();
      if (timeSince < this.config.recoveryBackoffMs) {
        return;
      }
    }
    
    // Check max attempts
    if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      this.raiseAlert("emergency", "Recovery Failed", `Max recovery attempts (${this.config.maxRecoveryAttempts}) exceeded`, "guardian");
      return;
    }
    
    this.recoveryAttempts++;
    this.lastRecoveryAttempt = new Date();
    
    console.log(`[Guardian] Beginning recovery attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts}`);
    
    // Sort actions by priority
    const actions = Array.from(this.recoveryActions.values())
      .sort((a, b) => a.priority - b.priority);
    
    for (const action of actions) {
      // Check cooldown
      if (action.lastAttempt) {
        const timeSince = Date.now() - action.lastAttempt.getTime();
        if (timeSince < action.cooldownMs) {
          continue;
        }
      }
      
      // Check condition
      if (!action.condition()) {
        continue;
      }
      
      console.log(`[Guardian] Executing recovery action: ${action.name}`);
      action.lastAttempt = new Date();
      
      try {
        const success = await action.action();
        if (success) {
          action.successCount++;
          console.log(`[Guardian] Recovery action ${action.name} succeeded`);
          
          // Reset recovery attempts on successful recovery
          if (this.health.overallHealth >= this.config.minAcceptableHealth) {
            this.recoveryAttempts = 0;
          }
        } else {
          action.failureCount++;
          console.warn(`[Guardian] Recovery action ${action.name} failed`);
        }
      } catch (error) {
        action.failureCount++;
        console.error(`[Guardian] Recovery action ${action.name} error:`, error);
      }
    }
  }
  
  // ==========================================================================
  // Alerts
  // ==========================================================================
  
  /**
   * Raise an alert
   */
  private raiseAlert(severity: AlertSeverity, title: string, message: string, source: string): string {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const alert: ServiceAlert = {
      id,
      severity,
      title,
      message,
      source,
      timestamp: new Date(),
      acknowledged: false,
      resolvedAt: null,
    };
    
    this.alerts.set(id, alert);
    this.emit("alert", alert);
    
    const prefix = severity === "emergency" ? "🚨" : 
                   severity === "critical" ? "❌" :
                   severity === "warning" ? "⚠️" : "ℹ️";
    console.log(`[Guardian] ${prefix} ${severity.toUpperCase()}: ${title} - ${message}`);
    
    return id;
  }
  
  /**
   * Resolve an alert
   */
  private resolveAlert(idOrPattern: string): void {
    for (const [id, alert] of this.alerts) {
      if (id === idOrPattern || id.includes(idOrPattern)) {
        alert.resolvedAt = new Date();
        this.emit("alert-resolved", alert);
      }
    }
  }
  
  /**
   * Start alert cleanup
   */
  private startAlertCleanup(): void {
    this.alertCleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.config.alertRetentionMinutes * 60 * 1000;
      
      for (const [id, alert] of this.alerts) {
        if (alert.resolvedAt && alert.resolvedAt.getTime() < cutoff) {
          this.alerts.delete(id);
        }
      }
    }, 60000); // Every minute
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  /**
   * Get current service state
   */
  getState(): ServiceState {
    return this.state;
  }
  
  /**
   * Get current health
   */
  getHealth(): ServiceHealth {
    return { ...this.health };
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): ServiceAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolvedAt)
      .sort((a, b) => {
        const severityOrder = { emergency: 0, critical: 1, warning: 2, info: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }
  
  /**
   * Get complete service summary
   */
  getSummary(): ServiceSummary {
    return {
      state: this.state,
      health: this.getHealth(),
      connectionMetrics: connectionResilience.getMetrics(),
      stabilityMetrics: supernodeStability.getStabilityMetrics(),
      nodesSummary: getPiNodeSummary(),
      quorumState: supernodeStability.getQuorumState(),
      activeAlerts: this.getActiveAlerts(),
      uptimeSeconds: this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0,
      lastUpdate: new Date(),
    };
  }
  
  /**
   * Force recovery attempt
   */
  async forceRecovery(): Promise<void> {
    this.recoveryAttempts = 0;
    this.lastRecoveryAttempt = null;
    await this.performRecovery();
  }
  
  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.state === "running" && this.health.overallHealth >= this.config.minAcceptableHealth;
  }
  
  /**
   * Check if service is operational (running or degraded but functional)
   */
  isOperational(): boolean {
    return this.state === "running" || this.state === "degraded";
  }
  
  /**
   * Get configuration
   */
  getConfig(): GuardianConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<GuardianConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit("config-updated", this.config);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const serviceGuardian = ServiceGuardian.getInstance();

export { ServiceGuardian };

// Helper functions
export function isServiceHealthy(): boolean {
  return serviceGuardian.isHealthy();
}

export function isServiceOperational(): boolean {
  return serviceGuardian.isOperational();
}

export function getServiceHealth(): ServiceHealth {
  return serviceGuardian.getHealth();
}

export function getServiceSummary(): ServiceSummary {
  return serviceGuardian.getSummary();
}

export function startServiceGuardian(): Promise<void> {
  return serviceGuardian.start();
}

export function stopServiceGuardian(): Promise<void> {
  return serviceGuardian.stop();
}
