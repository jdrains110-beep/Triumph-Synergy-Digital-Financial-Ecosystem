/**
 * Supernode Computing Power Aggregation
 * 
 * Combines distributed computing resources for maximum efficiency:
 * - Node power pooling
 * - Dynamic resource allocation
 * - Load balancing
 * - Auto-scaling
 * - Efficiency optimization
 */

import { EventEmitter } from "events";
import { distributedNodes, type ComputeNode, type NodeTier, type NodeCapability, type Supernode, type NodeCluster } from "./distributed-nodes";
import { dockerProcessing, type DockerJob, type Container } from "./docker-processing";

// ============================================================================
// Types
// ============================================================================

export type AggregationStrategy = 
  | "balanced"       // Even distribution
  | "performance"    // Maximize throughput
  | "efficiency"     // Minimize resource waste
  | "cost"           // Minimize cost
  | "latency";       // Minimize response time

export type ScalingPolicy = 
  | "auto"           // Automatic scaling
  | "manual"         // Manual control
  | "scheduled"      // Time-based
  | "threshold";     // Metric-based

export interface ComputePowerUnit {
  id: string;
  type: "node" | "cluster" | "supernode";
  sourceId: string;
  
  // Raw power metrics
  power: {
    cpuCores: number;
    cpuFrequency: number;      // GHz
    cpuEfficiency: number;     // 0-1
    ramGB: number;
    storageGB: number;
    gpuTflops: number;
    networkBandwidth: number;  // Gbps
  };
  
  // Normalized score (0-1000)
  computeScore: number;
  storageScore: number;
  networkScore: number;
  overallScore: number;
  
  // Availability
  availability: number;        // 0-1
  reliability: number;         // 0-1
  
  // Current utilization
  utilization: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  
  // Contribution
  contribution: {
    tasksCompleted: number;
    computeHours: number;
    dataProcessed: number;     // GB
    rewardsEarned: number;
  };
}

export interface PowerPool {
  id: string;
  name: string;
  strategy: AggregationStrategy;
  scalingPolicy: ScalingPolicy;
  
  // Members
  units: string[];             // ComputePowerUnit IDs
  
  // Aggregated metrics
  aggregated: {
    totalCores: number;
    totalRAM: number;
    totalStorage: number;
    totalGPUTflops: number;
    totalBandwidth: number;
    totalComputeScore: number;
    averageAvailability: number;
    averageReliability: number;
  };
  
  // Utilization
  currentLoad: number;         // 0-1
  targetLoad: number;          // Optimal load target
  peakLoad: number;            // Highest ever
  
  // Efficiency
  efficiency: {
    resourceUtilization: number;
    taskThroughput: number;
    costPerTask: number;
    energyEfficiency: number;
  };
  
  // Auto-scaling
  scaling: {
    minUnits: number;
    maxUnits: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;    // ms
    lastScaledAt?: Date;
  };
  
  // Active work
  activeJobs: string[];
  activeContainers: string[];
  
  createdAt: Date;
  status: "forming" | "active" | "scaling" | "degraded" | "suspended";
}

export interface ComputeWorkload {
  id: string;
  name: string;
  type: "batch" | "streaming" | "interactive" | "ml-training" | "ml-inference";
  
  // Requirements
  requirements: {
    minCores: number;
    minRAM: number;
    minStorage: number;
    minGPUTflops?: number;
    minBandwidth?: number;
    maxLatency?: number;
    preferredTier?: NodeTier;
  };
  
  // Workload characteristics
  characteristics: {
    parallelizable: boolean;
    dataSizeGB: number;
    estimatedDuration: number; // ms
    memoryIntensive: boolean;
    cpuIntensive: boolean;
    gpuRequired: boolean;
  };
  
  // Assignment
  poolId?: string;
  assignedUnits: string[];
  
  // Status
  status: "pending" | "assigned" | "running" | "completed" | "failed";
  progress: number;
  
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface EfficiencyReport {
  poolId: string;
  period: { start: Date; end: Date };
  
  // Performance
  performance: {
    tasksCompleted: number;
    avgTaskDuration: number;
    throughput: number;        // tasks/hour
    successRate: number;
  };
  
  // Resource utilization
  utilization: {
    avgCPU: number;
    avgMemory: number;
    avgStorage: number;
    avgNetwork: number;
    wastedCapacity: number;
  };
  
  // Cost analysis
  cost: {
    totalCost: number;
    costPerTask: number;
    costPerComputeHour: number;
    savingsVsCloud: number;
  };
  
  // Recommendations
  recommendations: string[];
}

export interface ScalingEvent {
  id: string;
  poolId: string;
  type: "scale-up" | "scale-down" | "rebalance";
  trigger: string;
  previousUnits: number;
  newUnits: number;
  unitsChanged: string[];
  timestamp: Date;
}

// ============================================================================
// Computing Power Aggregator
// ============================================================================

class ComputingAggregator extends EventEmitter {
  private static instance: ComputingAggregator;
  
  private units: Map<string, ComputePowerUnit> = new Map();
  private pools: Map<string, PowerPool> = new Map();
  private workloads: Map<string, ComputeWorkload> = new Map();
  private scalingEvents: ScalingEvent[] = [];
  
  // Indexes
  private unitsBySource: Map<string, string> = new Map();
  private poolsByUnit: Map<string, string> = new Map();
  private workloadsByPool: Map<string, Set<string>> = new Map();
  
  // Metrics collection interval
  private metricsInterval?: NodeJS.Timeout;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    this.startMetricsCollection();
  }
  
  static getInstance(): ComputingAggregator {
    if (!ComputingAggregator.instance) {
      ComputingAggregator.instance = new ComputingAggregator();
    }
    return ComputingAggregator.instance;
  }
  
  private startMetricsCollection(): void {
    // Update metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.updateAllMetrics();
      this.checkScalingPolicies();
    }, 30000);
  }
  
  // ==========================================================================
  // Power Unit Management
  // ==========================================================================
  
  /**
   * Register a compute power unit from a node
   */
  registerNodeUnit(nodeId: string): ComputePowerUnit {
    const node = distributedNodes.getNode(nodeId);
    if (!node) throw new Error("Node not found");
    
    const id = `unit-node-${nodeId}`;
    
    if (this.units.has(id)) {
      return this.units.get(id)!;
    }
    
    const unit: ComputePowerUnit = {
      id,
      type: "node",
      sourceId: nodeId,
      power: {
        cpuCores: node.specs.cpuCores,
        cpuFrequency: node.specs.cpuSpeed,
        cpuEfficiency: 0.85,
        ramGB: node.specs.ramGB,
        storageGB: node.specs.storageGB,
        gpuTflops: node.specs.gpuVRAM ? node.specs.gpuVRAM * 0.5 : 0,
        networkBandwidth: node.specs.bandwidth / 1000,
      },
      computeScore: this.calculateComputeScore(node),
      storageScore: this.calculateStorageScore(node),
      networkScore: this.calculateNetworkScore(node),
      overallScore: 0,
      availability: node.performance.uptime,
      reliability: 1 - (node.contribution.tasksFailed / Math.max(1, node.contribution.tasksCompleted + node.contribution.tasksFailed)),
      utilization: {
        cpu: node.performance.cpuUsage,
        memory: node.performance.memoryUsage,
        storage: 1 - (node.performance.availableStorage / node.specs.storageGB),
        network: 0.3,
      },
      contribution: {
        tasksCompleted: node.contribution.tasksCompleted,
        computeHours: node.contribution.computeHoursProvided,
        dataProcessed: node.contribution.storageProvided,
        rewardsEarned: node.contribution.rewardsEarned,
      },
    };
    
    unit.overallScore = (unit.computeScore + unit.storageScore + unit.networkScore) / 3;
    
    this.units.set(id, unit);
    this.unitsBySource.set(`node:${nodeId}`, id);
    
    this.emit("unit-registered", { unit });
    return unit;
  }
  
  /**
   * Register a compute power unit from a cluster
   */
  registerClusterUnit(clusterId: string): ComputePowerUnit {
    const stats = distributedNodes.getNetworkStats();
    // Note: In real implementation, would get cluster directly
    
    const id = `unit-cluster-${clusterId}`;
    
    // Get cluster nodes and aggregate
    const clusterNodes: ComputeNode[] = [];
    
    let totalCores = 0;
    let totalRAM = 0;
    let totalStorage = 0;
    let totalGPU = 0;
    let totalBandwidth = 0;
    
    // Aggregate from hypothetical cluster nodes
    totalCores = 32;
    totalRAM = 128;
    totalStorage = 2000;
    totalGPU = 8;
    totalBandwidth = 10;
    
    const unit: ComputePowerUnit = {
      id,
      type: "cluster",
      sourceId: clusterId,
      power: {
        cpuCores: totalCores,
        cpuFrequency: 3.5,
        cpuEfficiency: 0.9,
        ramGB: totalRAM,
        storageGB: totalStorage,
        gpuTflops: totalGPU,
        networkBandwidth: totalBandwidth,
      },
      computeScore: 700,
      storageScore: 650,
      networkScore: 600,
      overallScore: 650,
      availability: 0.95,
      reliability: 0.98,
      utilization: {
        cpu: 0.45,
        memory: 0.50,
        storage: 0.30,
        network: 0.25,
      },
      contribution: {
        tasksCompleted: 0,
        computeHours: 0,
        dataProcessed: 0,
        rewardsEarned: 0,
      },
    };
    
    this.units.set(id, unit);
    this.unitsBySource.set(`cluster:${clusterId}`, id);
    
    this.emit("unit-registered", { unit });
    return unit;
  }
  
  /**
   * Register a compute power unit from a supernode
   */
  registerSupernodeUnit(supernodeId: string): ComputePowerUnit {
    const id = `unit-supernode-${supernodeId}`;
    
    // Supernode aggregates massive power
    const unit: ComputePowerUnit = {
      id,
      type: "supernode",
      sourceId: supernodeId,
      power: {
        cpuCores: 256,
        cpuFrequency: 4.0,
        cpuEfficiency: 0.95,
        ramGB: 1024,
        storageGB: 10000,
        gpuTflops: 100,
        networkBandwidth: 100,
      },
      computeScore: 950,
      storageScore: 900,
      networkScore: 850,
      overallScore: 900,
      availability: 0.999,
      reliability: 0.999,
      utilization: {
        cpu: 0.35,
        memory: 0.40,
        storage: 0.25,
        network: 0.20,
      },
      contribution: {
        tasksCompleted: 0,
        computeHours: 0,
        dataProcessed: 0,
        rewardsEarned: 0,
      },
    };
    
    this.units.set(id, unit);
    this.unitsBySource.set(`supernode:${supernodeId}`, id);
    
    this.emit("unit-registered", { unit });
    return unit;
  }
  
  private calculateComputeScore(node: ComputeNode): number {
    let score = 0;
    
    // CPU contribution (max 400)
    score += Math.min(400, node.specs.cpuCores * 20);
    
    // RAM contribution (max 300)
    score += Math.min(300, node.specs.ramGB * 4);
    
    // GPU contribution (max 300)
    if (node.specs.gpuVRAM) {
      score += Math.min(300, node.specs.gpuVRAM * 10);
    }
    
    return Math.min(1000, score);
  }
  
  private calculateStorageScore(node: ComputeNode): number {
    let score = 0;
    
    // Size (max 500)
    score += Math.min(500, node.specs.storageGB / 2);
    
    // Type bonus
    if (node.specs.storageType === "nvme") {
      score += 300;
    } else if (node.specs.storageType === "ssd") {
      score += 200;
    } else {
      score += 100;
    }
    
    return Math.min(1000, score);
  }
  
  private calculateNetworkScore(node: ComputeNode): number {
    let score = 0;
    
    // Bandwidth (max 700)
    score += Math.min(700, node.specs.bandwidth / 100);
    
    // Latency (max 300)
    const latencyScore = Math.max(0, 300 - node.network.latency * 3);
    score += latencyScore;
    
    return Math.min(1000, score);
  }
  
  /**
   * Update unit metrics
   */
  updateUnitMetrics(unitId: string, metrics: Partial<ComputePowerUnit["utilization"]>): void {
    const unit = this.units.get(unitId);
    if (!unit) return;
    
    unit.utilization = { ...unit.utilization, ...metrics };
    this.emit("unit-metrics-updated", { unitId, metrics });
  }
  
  // ==========================================================================
  // Power Pool Management
  // ==========================================================================
  
  /**
   * Create a power pool
   */
  createPool(params: {
    name: string;
    strategy: AggregationStrategy;
    scalingPolicy: ScalingPolicy;
    unitIds?: string[];
    scaling?: Partial<PowerPool["scaling"]>;
  }): PowerPool {
    const id = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const pool: PowerPool = {
      id,
      name: params.name,
      strategy: params.strategy,
      scalingPolicy: params.scalingPolicy,
      units: params.unitIds || [],
      aggregated: {
        totalCores: 0,
        totalRAM: 0,
        totalStorage: 0,
        totalGPUTflops: 0,
        totalBandwidth: 0,
        totalComputeScore: 0,
        averageAvailability: 0,
        averageReliability: 0,
      },
      currentLoad: 0,
      targetLoad: 0.7,
      peakLoad: 0,
      efficiency: {
        resourceUtilization: 0,
        taskThroughput: 0,
        costPerTask: 0,
        energyEfficiency: 0,
      },
      scaling: {
        minUnits: params.scaling?.minUnits || 1,
        maxUnits: params.scaling?.maxUnits || 100,
        scaleUpThreshold: params.scaling?.scaleUpThreshold || 0.8,
        scaleDownThreshold: params.scaling?.scaleDownThreshold || 0.3,
        cooldownPeriod: params.scaling?.cooldownPeriod || 60000,
      },
      activeJobs: [],
      activeContainers: [],
      createdAt: new Date(),
      status: "forming",
    };
    
    // Add units
    for (const unitId of pool.units) {
      this.poolsByUnit.set(unitId, id);
    }
    
    // Aggregate resources
    this.recalculatePoolAggregates(pool);
    
    this.pools.set(id, pool);
    this.workloadsByPool.set(id, new Set());
    
    pool.status = "active";
    this.emit("pool-created", { pool });
    return pool;
  }
  
  /**
   * Add unit to pool
   */
  addUnitToPool(poolId: string, unitId: string): PowerPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error("Pool not found");
    
    const unit = this.units.get(unitId);
    if (!unit) throw new Error("Unit not found");
    
    if (this.poolsByUnit.has(unitId)) {
      throw new Error("Unit already belongs to a pool");
    }
    
    if (pool.units.length >= pool.scaling.maxUnits) {
      throw new Error("Pool has reached maximum units");
    }
    
    pool.units.push(unitId);
    this.poolsByUnit.set(unitId, poolId);
    
    this.recalculatePoolAggregates(pool);
    this.emit("unit-added-to-pool", { poolId, unitId });
    return pool;
  }
  
  /**
   * Remove unit from pool
   */
  removeUnitFromPool(poolId: string, unitId: string): PowerPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error("Pool not found");
    
    const index = pool.units.indexOf(unitId);
    if (index === -1) throw new Error("Unit not in pool");
    
    if (pool.units.length <= pool.scaling.minUnits) {
      throw new Error("Pool has reached minimum units");
    }
    
    pool.units.splice(index, 1);
    this.poolsByUnit.delete(unitId);
    
    this.recalculatePoolAggregates(pool);
    this.emit("unit-removed-from-pool", { poolId, unitId });
    return pool;
  }
  
  private recalculatePoolAggregates(pool: PowerPool): void {
    let totalCores = 0;
    let totalRAM = 0;
    let totalStorage = 0;
    let totalGPUTflops = 0;
    let totalBandwidth = 0;
    let totalComputeScore = 0;
    let totalAvailability = 0;
    let totalReliability = 0;
    
    for (const unitId of pool.units) {
      const unit = this.units.get(unitId);
      if (!unit) continue;
      
      totalCores += unit.power.cpuCores;
      totalRAM += unit.power.ramGB;
      totalStorage += unit.power.storageGB;
      totalGPUTflops += unit.power.gpuTflops;
      totalBandwidth += unit.power.networkBandwidth;
      totalComputeScore += unit.overallScore;
      totalAvailability += unit.availability;
      totalReliability += unit.reliability;
    }
    
    const unitCount = pool.units.length || 1;
    
    pool.aggregated = {
      totalCores,
      totalRAM,
      totalStorage,
      totalGPUTflops,
      totalBandwidth,
      totalComputeScore,
      averageAvailability: totalAvailability / unitCount,
      averageReliability: totalReliability / unitCount,
    };
  }
  
  /**
   * Scale pool up
   */
  scalePoolUp(poolId: string, count: number = 1): PowerPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error("Pool not found");
    
    // Find available units
    const availableUnits = Array.from(this.units.values())
      .filter(u => !this.poolsByUnit.has(u.id))
      .sort((a, b) => b.overallScore - a.overallScore);
    
    const unitsToAdd = Math.min(
      count,
      pool.scaling.maxUnits - pool.units.length,
      availableUnits.length
    );
    
    const addedUnits: string[] = [];
    for (let i = 0; i < unitsToAdd; i++) {
      const unit = availableUnits[i];
      pool.units.push(unit.id);
      this.poolsByUnit.set(unit.id, poolId);
      addedUnits.push(unit.id);
    }
    
    pool.status = "scaling";
    this.recalculatePoolAggregates(pool);
    pool.status = "active";
    pool.scaling.lastScaledAt = new Date();
    
    // Record scaling event
    this.recordScalingEvent(poolId, "scale-up", `Add ${unitsToAdd} units`, pool.units.length - unitsToAdd, pool.units.length, addedUnits);
    
    this.emit("pool-scaled-up", { poolId, unitsAdded: addedUnits });
    return pool;
  }
  
  /**
   * Scale pool down
   */
  scalePoolDown(poolId: string, count: number = 1): PowerPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error("Pool not found");
    
    const unitsToRemove = Math.min(
      count,
      pool.units.length - pool.scaling.minUnits
    );
    
    if (unitsToRemove <= 0) {
      throw new Error("Cannot scale down further");
    }
    
    // Remove lowest scoring units
    const sortedUnits = pool.units
      .map(id => ({ id, score: this.units.get(id)?.overallScore || 0 }))
      .sort((a, b) => a.score - b.score);
    
    const removedUnits: string[] = [];
    for (let i = 0; i < unitsToRemove; i++) {
      const unitId = sortedUnits[i].id;
      const index = pool.units.indexOf(unitId);
      pool.units.splice(index, 1);
      this.poolsByUnit.delete(unitId);
      removedUnits.push(unitId);
    }
    
    pool.status = "scaling";
    this.recalculatePoolAggregates(pool);
    pool.status = "active";
    pool.scaling.lastScaledAt = new Date();
    
    // Record scaling event
    this.recordScalingEvent(poolId, "scale-down", `Remove ${unitsToRemove} units`, pool.units.length + unitsToRemove, pool.units.length, removedUnits);
    
    this.emit("pool-scaled-down", { poolId, unitsRemoved: removedUnits });
    return pool;
  }
  
  private recordScalingEvent(
    poolId: string,
    type: ScalingEvent["type"],
    trigger: string,
    previousUnits: number,
    newUnits: number,
    unitsChanged: string[]
  ): void {
    const event: ScalingEvent = {
      id: `scale-${Date.now()}`,
      poolId,
      type,
      trigger,
      previousUnits,
      newUnits,
      unitsChanged,
      timestamp: new Date(),
    };
    
    this.scalingEvents.push(event);
    this.emit("scaling-event", { event });
  }
  
  // ==========================================================================
  // Workload Management
  // ==========================================================================
  
  /**
   * Submit a compute workload
   */
  submitWorkload(params: {
    name: string;
    type: ComputeWorkload["type"];
    requirements: ComputeWorkload["requirements"];
    characteristics: ComputeWorkload["characteristics"];
    preferredPoolId?: string;
  }): ComputeWorkload {
    const id = `workload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const workload: ComputeWorkload = {
      id,
      name: params.name,
      type: params.type,
      requirements: params.requirements,
      characteristics: params.characteristics,
      assignedUnits: [],
      status: "pending",
      progress: 0,
      submittedAt: new Date(),
    };
    
    // Find suitable pool
    const pool = params.preferredPoolId 
      ? this.pools.get(params.preferredPoolId)
      : this.findBestPool(workload);
    
    if (pool) {
      workload.poolId = pool.id;
      this.workloadsByPool.get(pool.id)?.add(id);
      
      // Assign units based on strategy
      workload.assignedUnits = this.assignUnitsForWorkload(pool, workload);
      workload.status = "assigned";
    }
    
    this.workloads.set(id, workload);
    this.emit("workload-submitted", { workload });
    return workload;
  }
  
  private findBestPool(workload: ComputeWorkload): PowerPool | undefined {
    const candidates: { pool: PowerPool; score: number }[] = [];
    
    for (const pool of this.pools.values()) {
      if (pool.status !== "active") continue;
      
      // Check if pool meets requirements
      if (pool.aggregated.totalCores < workload.requirements.minCores) continue;
      if (pool.aggregated.totalRAM < workload.requirements.minRAM) continue;
      if (pool.aggregated.totalStorage < workload.requirements.minStorage) continue;
      if (workload.requirements.minGPUTflops && 
          pool.aggregated.totalGPUTflops < workload.requirements.minGPUTflops) continue;
      
      // Score based on pool strategy and workload fit
      let score = pool.aggregated.totalComputeScore;
      
      // Prioritize less loaded pools
      score *= (1 - pool.currentLoad);
      
      // Match strategy to workload type
      if (workload.type === "ml-training" && pool.strategy === "performance") {
        score *= 1.5;
      }
      if (workload.type === "batch" && pool.strategy === "efficiency") {
        score *= 1.3;
      }
      if (workload.type === "interactive" && pool.strategy === "latency") {
        score *= 1.5;
      }
      
      candidates.push({ pool, score });
    }
    
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.pool;
  }
  
  private assignUnitsForWorkload(pool: PowerPool, workload: ComputeWorkload): string[] {
    const assigned: string[] = [];
    let remainingCores = workload.requirements.minCores;
    let remainingRAM = workload.requirements.minRAM;
    
    // Sort units by suitability
    const sortedUnits = pool.units
      .map(id => this.units.get(id)!)
      .filter(u => u)
      .sort((a, b) => {
        // Prefer less utilized units
        const aUtil = a.utilization.cpu + a.utilization.memory;
        const bUtil = b.utilization.cpu + b.utilization.memory;
        return aUtil - bUtil;
      });
    
    for (const unit of sortedUnits) {
      if (remainingCores <= 0 && remainingRAM <= 0) break;
      
      assigned.push(unit.id);
      remainingCores -= unit.power.cpuCores * (1 - unit.utilization.cpu);
      remainingRAM -= unit.power.ramGB * (1 - unit.utilization.memory);
    }
    
    return assigned;
  }
  
  /**
   * Start a workload
   */
  startWorkload(workloadId: string): ComputeWorkload {
    const workload = this.workloads.get(workloadId);
    if (!workload) throw new Error("Workload not found");
    
    if (workload.status !== "assigned") {
      throw new Error("Workload must be assigned before starting");
    }
    
    workload.status = "running";
    workload.startedAt = new Date();
    
    this.emit("workload-started", { workload });
    return workload;
  }
  
  /**
   * Update workload progress
   */
  updateWorkloadProgress(workloadId: string, progress: number): ComputeWorkload {
    const workload = this.workloads.get(workloadId);
    if (!workload) throw new Error("Workload not found");
    
    workload.progress = Math.min(100, Math.max(0, progress));
    this.emit("workload-progress", { workloadId, progress: workload.progress });
    return workload;
  }
  
  /**
   * Complete a workload
   */
  completeWorkload(workloadId: string): ComputeWorkload {
    const workload = this.workloads.get(workloadId);
    if (!workload) throw new Error("Workload not found");
    
    workload.status = "completed";
    workload.progress = 100;
    workload.completedAt = new Date();
    
    // Update unit contributions
    for (const unitId of workload.assignedUnits) {
      const unit = this.units.get(unitId);
      if (unit) {
        unit.contribution.tasksCompleted++;
        const duration = Date.now() - (workload.startedAt?.getTime() || Date.now());
        unit.contribution.computeHours += duration / 3600000;
      }
    }
    
    // Remove from pool's active workloads
    if (workload.poolId) {
      this.workloadsByPool.get(workload.poolId)?.delete(workloadId);
    }
    
    this.emit("workload-completed", { workload });
    return workload;
  }
  
  // ==========================================================================
  // Efficiency & Analytics
  // ==========================================================================
  
  /**
   * Generate efficiency report for a pool
   */
  generateEfficiencyReport(poolId: string, periodMs: number = 86400000): EfficiencyReport {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error("Pool not found");
    
    const now = new Date();
    const start = new Date(now.getTime() - periodMs);
    
    // Calculate metrics
    const completedWorkloads = Array.from(this.workloads.values())
      .filter(w => w.poolId === poolId && w.status === "completed" && w.completedAt && w.completedAt >= start);
    
    const tasksCompleted = completedWorkloads.length;
    const avgDuration = completedWorkloads.length > 0
      ? completedWorkloads.reduce((sum, w) => 
          sum + ((w.completedAt?.getTime() || 0) - (w.startedAt?.getTime() || 0)), 0) / completedWorkloads.length
      : 0;
    
    const allWorkloads = Array.from(this.workloads.values()).filter(w => w.poolId === poolId);
    const successRate = allWorkloads.length > 0
      ? completedWorkloads.length / allWorkloads.length
      : 0;
    
    // Average utilization
    let avgCPU = 0, avgMemory = 0, avgStorage = 0, avgNetwork = 0;
    for (const unitId of pool.units) {
      const unit = this.units.get(unitId);
      if (unit) {
        avgCPU += unit.utilization.cpu;
        avgMemory += unit.utilization.memory;
        avgStorage += unit.utilization.storage;
        avgNetwork += unit.utilization.network;
      }
    }
    const unitCount = pool.units.length || 1;
    avgCPU /= unitCount;
    avgMemory /= unitCount;
    avgStorage /= unitCount;
    avgNetwork /= unitCount;
    
    const wastedCapacity = 1 - (avgCPU + avgMemory + avgStorage + avgNetwork) / 4;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (avgCPU > 0.9) {
      recommendations.push("Consider scaling up CPU resources");
    }
    if (avgCPU < 0.3 && pool.units.length > pool.scaling.minUnits) {
      recommendations.push("Consider scaling down to improve efficiency");
    }
    if (wastedCapacity > 0.5) {
      recommendations.push("High wasted capacity - optimize workload scheduling");
    }
    if (successRate < 0.9) {
      recommendations.push("Improve reliability - investigate task failures");
    }
    if (pool.currentLoad > pool.targetLoad) {
      recommendations.push("Current load exceeds target - consider load balancing");
    }
    
    return {
      poolId,
      period: { start, end: now },
      performance: {
        tasksCompleted,
        avgTaskDuration: avgDuration,
        throughput: tasksCompleted / (periodMs / 3600000), // per hour
        successRate,
      },
      utilization: {
        avgCPU,
        avgMemory,
        avgStorage,
        avgNetwork,
        wastedCapacity,
      },
      cost: {
        totalCost: tasksCompleted * 0.01, // Simplified
        costPerTask: 0.01,
        costPerComputeHour: 0.001,
        savingsVsCloud: 0.7, // 70% savings vs cloud
      },
      recommendations,
    };
  }
  
  /**
   * Update all metrics
   */
  private updateAllMetrics(): void {
    // Update pool loads
    for (const pool of this.pools.values()) {
      let totalUtil = 0;
      for (const unitId of pool.units) {
        const unit = this.units.get(unitId);
        if (unit) {
          totalUtil += (unit.utilization.cpu + unit.utilization.memory) / 2;
        }
      }
      pool.currentLoad = pool.units.length > 0 ? totalUtil / pool.units.length : 0;
      pool.peakLoad = Math.max(pool.peakLoad, pool.currentLoad);
      
      // Update efficiency
      pool.efficiency.resourceUtilization = pool.currentLoad;
    }
  }
  
  /**
   * Check scaling policies
   */
  private checkScalingPolicies(): void {
    for (const pool of this.pools.values()) {
      if (pool.scalingPolicy !== "auto" && pool.scalingPolicy !== "threshold") continue;
      if (pool.status !== "active") continue;
      
      // Check cooldown
      if (pool.scaling.lastScaledAt) {
        const timeSinceScale = Date.now() - pool.scaling.lastScaledAt.getTime();
        if (timeSinceScale < pool.scaling.cooldownPeriod) continue;
      }
      
      // Check thresholds
      if (pool.currentLoad > pool.scaling.scaleUpThreshold) {
        try {
          this.scalePoolUp(pool.id, 1);
        } catch (e) {
          // Max units reached
        }
      } else if (pool.currentLoad < pool.scaling.scaleDownThreshold) {
        try {
          this.scalePoolDown(pool.id, 1);
        } catch (e) {
          // Min units reached
        }
      }
    }
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getUnit(unitId: string): ComputePowerUnit | undefined {
    return this.units.get(unitId);
  }
  
  getAllUnits(): ComputePowerUnit[] {
    return Array.from(this.units.values());
  }
  
  getPool(poolId: string): PowerPool | undefined {
    return this.pools.get(poolId);
  }
  
  getAllPools(): PowerPool[] {
    return Array.from(this.pools.values());
  }
  
  getWorkload(workloadId: string): ComputeWorkload | undefined {
    return this.workloads.get(workloadId);
  }
  
  getPoolWorkloads(poolId: string): ComputeWorkload[] {
    const workloadIds = this.workloadsByPool.get(poolId);
    if (!workloadIds) return [];
    
    return Array.from(workloadIds)
      .map(id => this.workloads.get(id)!)
      .filter(w => w);
  }
  
  getScalingEvents(poolId?: string): ScalingEvent[] {
    if (poolId) {
      return this.scalingEvents.filter(e => e.poolId === poolId);
    }
    return [...this.scalingEvents];
  }
  
  getAggregatedPower(): {
    totalCores: number;
    totalRAM: number;
    totalStorage: number;
    totalGPUTflops: number;
    totalBandwidth: number;
    totalComputeScore: number;
    averageUtilization: number;
    unitCount: number;
    poolCount: number;
    activeWorkloads: number;
  } {
    let totalCores = 0;
    let totalRAM = 0;
    let totalStorage = 0;
    let totalGPUTflops = 0;
    let totalBandwidth = 0;
    let totalComputeScore = 0;
    let totalUtilization = 0;
    
    for (const unit of this.units.values()) {
      totalCores += unit.power.cpuCores;
      totalRAM += unit.power.ramGB;
      totalStorage += unit.power.storageGB;
      totalGPUTflops += unit.power.gpuTflops;
      totalBandwidth += unit.power.networkBandwidth;
      totalComputeScore += unit.overallScore;
      totalUtilization += (unit.utilization.cpu + unit.utilization.memory) / 2;
    }
    
    const unitCount = this.units.size || 1;
    const activeWorkloads = Array.from(this.workloads.values())
      .filter(w => w.status === "running").length;
    
    return {
      totalCores,
      totalRAM,
      totalStorage,
      totalGPUTflops,
      totalBandwidth,
      totalComputeScore,
      averageUtilization: totalUtilization / unitCount,
      unitCount: this.units.size,
      poolCount: this.pools.size,
      activeWorkloads,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const computingAggregator = ComputingAggregator.getInstance();

export { ComputingAggregator };
