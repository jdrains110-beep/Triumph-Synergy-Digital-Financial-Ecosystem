/**
 * Distributed Node & Supernode System
 * 
 * Combines computing power across nodes for maximum efficiency:
 * - Node clustering and federation
 * - Supernode formation and management
 * - Computing power aggregation
 * - Load balancing and task distribution
 * - Fault tolerance and redundancy
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type NodeTier = 
  | "standard"      // Basic node
  | "enhanced"      // Above-average specs
  | "premium"       // High-performance node
  | "supernode"     // Aggregated supernode
  | "hypernode";    // Top-tier aggregated node

export type NodeCapability = 
  | "compute"       // CPU/GPU processing
  | "storage"       // Data storage
  | "bandwidth"     // Network relay
  | "memory"        // RAM-intensive tasks
  | "gpu"           // GPU acceleration
  | "ml"            // Machine learning
  | "rendering"     // 3D/Video rendering
  | "encryption"    // Cryptographic operations
  | "validation"    // Block validation
  | "oracle";       // External data feeds

export type ClusterStatus = 
  | "forming"
  | "active"
  | "degraded"
  | "scaling"
  | "dissolving"
  | "offline";

export interface ComputeNode {
  id: string;
  ownerId: string;
  walletId: string;
  name: string;
  tier: NodeTier;
  status: "online" | "offline" | "busy" | "syncing" | "maintenance";
  capabilities: NodeCapability[];
  
  // Hardware specs
  specs: NodeSpecs;
  
  // Performance metrics
  performance: NodePerformance;
  
  // Network info
  network: NodeNetwork;
  
  // Contribution stats
  contribution: NodeContribution;
  
  // Cluster membership
  clusterId?: string;
  supernodeId?: string;
  
  createdAt: Date;
  lastSeen: Date;
}

export interface NodeSpecs {
  cpuCores: number;
  cpuFrequency: number;      // GHz
  cpuModel: string;
  ramGB: number;
  storageGB: number;
  storageType: "ssd" | "hdd" | "nvme";
  gpuModel?: string;
  gpuVRAM?: number;          // GB
  gpuTFLOPS?: number;
  networkMbps: number;
}

export interface NodePerformance {
  computeScore: number;      // Benchmark score
  storageIOPS: number;
  networkLatency: number;    // ms
  uptime: number;            // Percentage
  reliability: number;       // 0-100
  tasksCompleted: number;
  tasksFailed: number;
  avgTaskTime: number;       // ms
  currentLoad: number;       // Percentage
  availableRAM: number;      // GB
  availableStorage: number;  // GB
}

export interface NodeNetwork {
  publicIP: string;
  region: string;
  country: string;
  isp: string;
  connectionType: "fiber" | "cable" | "dsl" | "satellite" | "mobile";
  port: number;
  peerCount: number;
  inboundBandwidth: number;  // Mbps
  outboundBandwidth: number; // Mbps
}

export interface NodeContribution {
  totalComputeHours: number;
  totalStorageGB: number;
  totalBandwidthTB: number;
  tasksProcessed: number;
  blocksValidated: number;
  rewardsEarned: number;     // In Pi
  tokensEarned: number;
  rank: number;
  reputationScore: number;
}

export interface NodeCluster {
  id: string;
  name: string;
  leaderId: string;
  status: ClusterStatus;
  tier: NodeTier;
  memberNodes: string[];
  maxNodes: number;
  
  // Aggregated capabilities
  aggregatedSpecs: AggregatedSpecs;
  specializations: NodeCapability[];
  
  // Performance
  clusterScore: number;
  healthScore: number;
  loadDistribution: Map<string, number>;
  
  // Rewards
  rewardPool: number;
  rewardDistribution: "equal" | "proportional" | "weighted";
  
  createdAt: Date;
  lastActivity: Date;
}

export interface AggregatedSpecs {
  totalCPUCores: number;
  totalRAMGB: number;
  totalStorageGB: number;
  totalGPUs: number;
  totalGPUTFLOPS: number;
  totalBandwidthMbps: number;
  avgLatency: number;
  combinedComputeScore: number;
}

export interface Supernode {
  id: string;
  name: string;
  tier: "supernode" | "hypernode";
  status: ClusterStatus;
  coordinatorId: string;
  
  // Member clusters
  clusters: string[];
  directNodes: string[];
  
  // Aggregated power
  totalComputePower: number;   // TFLOPS
  totalStorage: number;        // TB
  totalBandwidth: number;      // Gbps
  totalNodes: number;
  
  // Capabilities
  capabilities: NodeCapability[];
  
  // Performance
  processingCapacity: number;  // Tasks per hour
  avgResponseTime: number;     // ms
  reliability: number;         // Percentage
  
  // Economics
  stakedPi: number;
  rewardsDistributed: number;
  operatingCost: number;
  
  // Geographic distribution
  regions: string[];
  primaryRegion: string;
  
  createdAt: Date;
}

export interface ComputeTask {
  id: string;
  type: TaskType;
  priority: "low" | "normal" | "high" | "critical";
  status: "queued" | "assigned" | "processing" | "completed" | "failed" | "cancelled";
  
  // Requirements
  requirements: TaskRequirements;
  
  // Assignment
  assignedTo?: string;         // Node or cluster ID
  assignedAt?: Date;
  
  // Execution
  input: string;
  output?: string;
  progress: number;            // Percentage
  startedAt?: Date;
  completedAt?: Date;
  
  // Metrics
  computeUnits: number;
  actualComputeTime?: number;  // ms
  retryCount: number;
  maxRetries: number;
  
  // Rewards
  reward: number;              // Pi
  tokenReward: number;
  
  submittedBy: string;
  submittedAt: Date;
}

export type TaskType = 
  | "validation"       // Block/transaction validation
  | "computation"      // General compute
  | "ml-training"      // Machine learning training
  | "ml-inference"     // ML inference
  | "rendering"        // 3D/Video rendering
  | "encryption"       // Cryptographic operations
  | "storage"          // Data storage/retrieval
  | "indexing"         // Data indexing
  | "oracle"           // External data fetching
  | "custom";          // Custom task

export interface TaskRequirements {
  minCPUCores?: number;
  minRAMGB?: number;
  minStorageGB?: number;
  requireGPU?: boolean;
  minGPUVRAM?: number;
  requiredCapabilities?: NodeCapability[];
  maxLatency?: number;
  preferredRegions?: string[];
  estimatedDuration?: number;  // ms
  deadline?: Date;
}

export interface LoadBalancer {
  algorithm: "round-robin" | "least-loaded" | "capability-match" | "geographic" | "weighted";
  weights: Map<string, number>;
  healthChecks: Map<string, Date>;
  circuitBreakers: Map<string, CircuitBreaker>;
}

export interface CircuitBreaker {
  nodeId: string;
  state: "closed" | "open" | "half-open";
  failureCount: number;
  failureThreshold: number;
  lastFailure?: Date;
  resetTimeout: number;        // ms
}

// ============================================================================
// Distributed Node Manager
// ============================================================================

class DistributedNodeManager extends EventEmitter {
  private static instance: DistributedNodeManager;
  
  private nodes: Map<string, ComputeNode> = new Map();
  private clusters: Map<string, NodeCluster> = new Map();
  private supernodes: Map<string, Supernode> = new Map();
  private tasks: Map<string, ComputeTask> = new Map();
  
  // Task queues by priority
  private taskQueues: {
    critical: string[];
    high: string[];
    normal: string[];
    low: string[];
  } = { critical: [], high: [], normal: [], low: [] };
  
  // Load balancer
  private loadBalancer: LoadBalancer = {
    algorithm: "capability-match",
    weights: new Map(),
    healthChecks: new Map(),
    circuitBreakers: new Map(),
  };
  
  // Indexes
  private nodesByCapability: Map<NodeCapability, Set<string>> = new Map();
  private nodesByRegion: Map<string, Set<string>> = new Map();
  private nodesByCluster: Map<string, Set<string>> = new Map();
  private nodesBySupernode: Map<string, Set<string>> = new Map();
  
  private constructor() {
    super();
    this.setMaxListeners(200);
    this.initializeCapabilityIndex();
  }
  
  static getInstance(): DistributedNodeManager {
    if (!DistributedNodeManager.instance) {
      DistributedNodeManager.instance = new DistributedNodeManager();
    }
    return DistributedNodeManager.instance;
  }
  
  private initializeCapabilityIndex(): void {
    const caps: NodeCapability[] = [
      "compute", "storage", "bandwidth", "memory", "gpu",
      "ml", "rendering", "encryption", "validation", "oracle"
    ];
    for (const cap of caps) {
      this.nodesByCapability.set(cap, new Set());
    }
  }
  
  // ==========================================================================
  // Node Management
  // ==========================================================================
  
  /**
   * Register a compute node
   */
  registerNode(params: {
    ownerId: string;
    walletId: string;
    name: string;
    specs: NodeSpecs;
    network: NodeNetwork;
    capabilities?: NodeCapability[];
  }): ComputeNode {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Calculate tier based on specs
    const tier = this.calculateNodeTier(params.specs);
    
    // Auto-detect capabilities
    const capabilities = params.capabilities || this.detectCapabilities(params.specs);
    
    // Calculate initial performance metrics
    const computeScore = this.calculateComputeScore(params.specs);
    
    const node: ComputeNode = {
      id,
      ownerId: params.ownerId,
      walletId: params.walletId,
      name: params.name,
      tier,
      status: "syncing",
      capabilities,
      specs: params.specs,
      performance: {
        computeScore,
        storageIOPS: params.specs.storageType === "nvme" ? 500000 : params.specs.storageType === "ssd" ? 100000 : 5000,
        networkLatency: 50,
        uptime: 100,
        reliability: 100,
        tasksCompleted: 0,
        tasksFailed: 0,
        avgTaskTime: 0,
        currentLoad: 0,
        availableRAM: params.specs.ramGB,
        availableStorage: params.specs.storageGB,
      },
      network: params.network,
      contribution: {
        totalComputeHours: 0,
        totalStorageGB: 0,
        totalBandwidthTB: 0,
        tasksProcessed: 0,
        blocksValidated: 0,
        rewardsEarned: 0,
        tokensEarned: 0,
        rank: 0,
        reputationScore: 50,
      },
      createdAt: new Date(),
      lastSeen: new Date(),
    };
    
    this.nodes.set(id, node);
    
    // Index by capabilities
    for (const cap of capabilities) {
      this.nodesByCapability.get(cap)!.add(id);
    }
    
    // Index by region
    if (!this.nodesByRegion.has(params.network.region)) {
      this.nodesByRegion.set(params.network.region, new Set());
    }
    this.nodesByRegion.get(params.network.region)!.add(id);
    
    // Initialize circuit breaker
    this.loadBalancer.circuitBreakers.set(id, {
      nodeId: id,
      state: "closed",
      failureCount: 0,
      failureThreshold: 5,
      resetTimeout: 60000,
    });
    
    this.emit("node-registered", { node });
    return node;
  }
  
  private calculateNodeTier(specs: NodeSpecs): NodeTier {
    let score = 0;
    
    score += specs.cpuCores * 10;
    score += specs.cpuFrequency * 20;
    score += specs.ramGB * 5;
    score += specs.storageGB * 0.1;
    score += specs.networkMbps * 0.5;
    
    if (specs.gpuTFLOPS) score += specs.gpuTFLOPS * 50;
    
    if (score >= 2000) return "premium";
    if (score >= 1000) return "enhanced";
    return "standard";
  }
  
  private detectCapabilities(specs: NodeSpecs): NodeCapability[] {
    const caps: NodeCapability[] = ["compute"];
    
    if (specs.storageGB >= 500) caps.push("storage");
    if (specs.networkMbps >= 100) caps.push("bandwidth");
    if (specs.ramGB >= 32) caps.push("memory");
    if (specs.gpuModel && specs.gpuTFLOPS && specs.gpuTFLOPS > 0) {
      caps.push("gpu");
      if (specs.gpuTFLOPS >= 10) caps.push("ml");
      if (specs.gpuVRAM && specs.gpuVRAM >= 8) caps.push("rendering");
    }
    if (specs.cpuCores >= 8) caps.push("encryption");
    if (specs.cpuCores >= 4 && specs.ramGB >= 16) caps.push("validation");
    if (specs.networkMbps >= 50) caps.push("oracle");
    
    return caps;
  }
  
  private calculateComputeScore(specs: NodeSpecs): number {
    let score = 0;
    
    // CPU contribution
    score += specs.cpuCores * specs.cpuFrequency * 100;
    
    // RAM contribution
    score += specs.ramGB * 50;
    
    // Storage contribution
    const storageMultiplier = specs.storageType === "nvme" ? 3 : specs.storageType === "ssd" ? 2 : 1;
    score += specs.storageGB * storageMultiplier;
    
    // GPU contribution
    if (specs.gpuTFLOPS) {
      score += specs.gpuTFLOPS * 1000;
    }
    
    // Network contribution
    score += specs.networkMbps * 10;
    
    return Math.round(score);
  }
  
  /**
   * Update node status
   */
  updateNodeStatus(nodeId: string, status: ComputeNode["status"]): ComputeNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error("Node not found");
    
    node.status = status;
    node.lastSeen = new Date();
    
    this.loadBalancer.healthChecks.set(nodeId, new Date());
    
    this.emit("node-status-changed", { nodeId, status });
    return node;
  }
  
  /**
   * Update node metrics
   */
  updateNodeMetrics(nodeId: string, metrics: Partial<NodePerformance>): ComputeNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error("Node not found");
    
    node.performance = { ...node.performance, ...metrics };
    node.lastSeen = new Date();
    
    // Update reliability based on task completion
    if (node.performance.tasksCompleted > 0) {
      const totalTasks = node.performance.tasksCompleted + node.performance.tasksFailed;
      node.performance.reliability = (node.performance.tasksCompleted / totalTasks) * 100;
    }
    
    // Update contribution reputation
    this.updateNodeReputation(node);
    
    return node;
  }
  
  private updateNodeReputation(node: ComputeNode): void {
    let score = 50;
    
    score += (node.performance.uptime - 95) * 2;
    score += (node.performance.reliability - 95) * 2;
    score -= node.performance.networkLatency > 100 ? 10 : 0;
    score += node.contribution.tasksProcessed > 1000 ? 10 : 0;
    score += node.contribution.blocksValidated > 500 ? 10 : 0;
    
    node.contribution.reputationScore = Math.max(0, Math.min(100, score));
  }
  
  // ==========================================================================
  // Cluster Management
  // ==========================================================================
  
  /**
   * Create a node cluster
   */
  createCluster(params: {
    name: string;
    leaderId: string;
    initialNodes: string[];
    maxNodes?: number;
    rewardDistribution?: NodeCluster["rewardDistribution"];
  }): NodeCluster {
    const leader = this.nodes.get(params.leaderId);
    if (!leader) throw new Error("Leader node not found");
    
    // Verify all initial nodes exist
    for (const nodeId of params.initialNodes) {
      if (!this.nodes.has(nodeId)) {
        throw new Error(`Node ${nodeId} not found`);
      }
    }
    
    const id = `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Calculate aggregated specs
    const aggregatedSpecs = this.calculateAggregatedSpecs(params.initialNodes);
    
    // Determine cluster tier
    const tier = this.determineClusterTier(aggregatedSpecs);
    
    // Collect unique specializations
    const specializations = this.collectSpecializations(params.initialNodes);
    
    const cluster: NodeCluster = {
      id,
      name: params.name,
      leaderId: params.leaderId,
      status: "forming",
      tier,
      memberNodes: params.initialNodes,
      maxNodes: params.maxNodes || 50,
      aggregatedSpecs,
      specializations,
      clusterScore: aggregatedSpecs.combinedComputeScore,
      healthScore: 100,
      loadDistribution: new Map(),
      rewardPool: 0,
      rewardDistribution: params.rewardDistribution || "proportional",
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    
    this.clusters.set(id, cluster);
    
    // Update node memberships
    this.nodesByCluster.set(id, new Set(params.initialNodes));
    for (const nodeId of params.initialNodes) {
      const node = this.nodes.get(nodeId)!;
      node.clusterId = id;
    }
    
    // Initialize load distribution
    this.redistributeClusterLoad(id);
    
    cluster.status = "active";
    this.emit("cluster-created", { cluster });
    return cluster;
  }
  
  private calculateAggregatedSpecs(nodeIds: string[]): AggregatedSpecs {
    let totalCPUCores = 0;
    let totalRAMGB = 0;
    let totalStorageGB = 0;
    let totalGPUs = 0;
    let totalGPUTFLOPS = 0;
    let totalBandwidthMbps = 0;
    let totalLatency = 0;
    let combinedComputeScore = 0;
    
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      
      totalCPUCores += node.specs.cpuCores;
      totalRAMGB += node.specs.ramGB;
      totalStorageGB += node.specs.storageGB;
      totalBandwidthMbps += node.specs.networkMbps;
      totalLatency += node.performance.networkLatency;
      combinedComputeScore += node.performance.computeScore;
      
      if (node.specs.gpuModel) {
        totalGPUs++;
        totalGPUTFLOPS += node.specs.gpuTFLOPS || 0;
      }
    }
    
    return {
      totalCPUCores,
      totalRAMGB,
      totalStorageGB,
      totalGPUs,
      totalGPUTFLOPS,
      totalBandwidthMbps,
      avgLatency: nodeIds.length > 0 ? totalLatency / nodeIds.length : 0,
      combinedComputeScore,
    };
  }
  
  private determineClusterTier(specs: AggregatedSpecs): NodeTier {
    if (specs.combinedComputeScore >= 100000) return "premium";
    if (specs.combinedComputeScore >= 50000) return "enhanced";
    return "standard";
  }
  
  private collectSpecializations(nodeIds: string[]): NodeCapability[] {
    const capabilities = new Set<NodeCapability>();
    
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const cap of node.capabilities) {
          capabilities.add(cap);
        }
      }
    }
    
    return Array.from(capabilities);
  }
  
  /**
   * Add node to cluster
   */
  addNodeToCluster(clusterId: string, nodeId: string): NodeCluster {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) throw new Error("Cluster not found");
    
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error("Node not found");
    
    if (cluster.memberNodes.length >= cluster.maxNodes) {
      throw new Error("Cluster is at maximum capacity");
    }
    
    if (node.clusterId) {
      throw new Error("Node is already in a cluster");
    }
    
    cluster.memberNodes.push(nodeId);
    node.clusterId = clusterId;
    this.nodesByCluster.get(clusterId)!.add(nodeId);
    
    // Recalculate specs
    cluster.aggregatedSpecs = this.calculateAggregatedSpecs(cluster.memberNodes);
    cluster.specializations = this.collectSpecializations(cluster.memberNodes);
    cluster.clusterScore = cluster.aggregatedSpecs.combinedComputeScore;
    cluster.tier = this.determineClusterTier(cluster.aggregatedSpecs);
    
    this.redistributeClusterLoad(clusterId);
    
    this.emit("node-joined-cluster", { clusterId, nodeId });
    return cluster;
  }
  
  /**
   * Remove node from cluster
   */
  removeNodeFromCluster(clusterId: string, nodeId: string): NodeCluster | null {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) throw new Error("Cluster not found");
    
    const node = this.nodes.get(nodeId);
    if (node) {
      node.clusterId = undefined;
    }
    
    cluster.memberNodes = cluster.memberNodes.filter(id => id !== nodeId);
    this.nodesByCluster.get(clusterId)?.delete(nodeId);
    
    // Dissolve cluster if too few nodes
    if (cluster.memberNodes.length < 2) {
      cluster.status = "dissolving";
      this.emit("cluster-dissolving", { cluster });
      
      // Clear remaining node memberships
      for (const id of cluster.memberNodes) {
        const n = this.nodes.get(id);
        if (n) n.clusterId = undefined;
      }
      
      this.clusters.delete(clusterId);
      this.nodesByCluster.delete(clusterId);
      return null;
    }
    
    // Recalculate specs
    cluster.aggregatedSpecs = this.calculateAggregatedSpecs(cluster.memberNodes);
    cluster.clusterScore = cluster.aggregatedSpecs.combinedComputeScore;
    
    this.redistributeClusterLoad(clusterId);
    
    this.emit("node-left-cluster", { clusterId, nodeId });
    return cluster;
  }
  
  private redistributeClusterLoad(clusterId: string): void {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;
    
    const totalScore = cluster.aggregatedSpecs.combinedComputeScore;
    
    for (const nodeId of cluster.memberNodes) {
      const node = this.nodes.get(nodeId);
      if (node) {
        const weight = node.performance.computeScore / totalScore;
        cluster.loadDistribution.set(nodeId, weight);
        this.loadBalancer.weights.set(nodeId, weight);
      }
    }
  }
  
  // ==========================================================================
  // Supernode Management
  // ==========================================================================
  
  /**
   * Create a supernode from clusters and nodes
   */
  createSupernode(params: {
    name: string;
    coordinatorId: string;
    clusters?: string[];
    directNodes?: string[];
    stakedPi: number;
  }): Supernode {
    const coordinator = this.nodes.get(params.coordinatorId);
    if (!coordinator) throw new Error("Coordinator node not found");
    
    const id = `supernode-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Verify and collect all nodes
    const allNodeIds: string[] = [];
    const allCapabilities = new Set<NodeCapability>();
    const regions = new Set<string>();
    
    // Add cluster nodes
    for (const clusterId of params.clusters || []) {
      const cluster = this.clusters.get(clusterId);
      if (cluster) {
        allNodeIds.push(...cluster.memberNodes);
        cluster.specializations.forEach(c => allCapabilities.add(c));
      }
    }
    
    // Add direct nodes
    for (const nodeId of params.directNodes || []) {
      if (!allNodeIds.includes(nodeId)) {
        allNodeIds.push(nodeId);
        const node = this.nodes.get(nodeId);
        if (node) {
          node.capabilities.forEach(c => allCapabilities.add(c));
        }
      }
    }
    
    // Calculate aggregated power
    let totalComputePower = 0;
    let totalStorage = 0;
    let totalBandwidth = 0;
    let totalLatency = 0;
    
    for (const nodeId of allNodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        totalComputePower += node.performance.computeScore / 1000; // Convert to TFLOPS estimate
        totalStorage += node.specs.storageGB / 1000; // Convert to TB
        totalBandwidth += node.specs.networkMbps / 1000; // Convert to Gbps
        totalLatency += node.performance.networkLatency;
        regions.add(node.network.region);
        node.supernodeId = id;
      }
    }
    
    // Determine tier
    const tier: "supernode" | "hypernode" = 
      allNodeIds.length >= 100 || totalComputePower >= 100 ? "hypernode" : "supernode";
    
    const supernode: Supernode = {
      id,
      name: params.name,
      tier,
      status: "active",
      coordinatorId: params.coordinatorId,
      clusters: params.clusters || [],
      directNodes: params.directNodes || [],
      totalComputePower,
      totalStorage,
      totalBandwidth,
      totalNodes: allNodeIds.length,
      capabilities: Array.from(allCapabilities),
      processingCapacity: allNodeIds.length * 100, // Estimated tasks/hour
      avgResponseTime: allNodeIds.length > 0 ? totalLatency / allNodeIds.length : 0,
      reliability: 99.9,
      stakedPi: params.stakedPi,
      rewardsDistributed: 0,
      operatingCost: 0,
      regions: Array.from(regions),
      primaryRegion: coordinator.network.region,
      createdAt: new Date(),
    };
    
    this.supernodes.set(id, supernode);
    this.nodesBySupernode.set(id, new Set(allNodeIds));
    
    this.emit("supernode-created", { supernode });
    return supernode;
  }
  
  /**
   * Scale supernode by adding more clusters or nodes
   */
  scaleSupernode(supernodeId: string, additions: {
    clusters?: string[];
    nodes?: string[];
  }): Supernode {
    const supernode = this.supernodes.get(supernodeId);
    if (!supernode) throw new Error("Supernode not found");
    
    supernode.status = "scaling";
    
    // Add clusters
    for (const clusterId of additions.clusters || []) {
      if (!supernode.clusters.includes(clusterId)) {
        const cluster = this.clusters.get(clusterId);
        if (cluster) {
          supernode.clusters.push(clusterId);
          for (const nodeId of cluster.memberNodes) {
            const node = this.nodes.get(nodeId);
            if (node) {
              node.supernodeId = supernodeId;
              this.nodesBySupernode.get(supernodeId)!.add(nodeId);
            }
          }
        }
      }
    }
    
    // Add direct nodes
    for (const nodeId of additions.nodes || []) {
      if (!supernode.directNodes.includes(nodeId)) {
        const node = this.nodes.get(nodeId);
        if (node) {
          supernode.directNodes.push(nodeId);
          node.supernodeId = supernodeId;
          this.nodesBySupernode.get(supernodeId)!.add(nodeId);
        }
      }
    }
    
    // Recalculate aggregates
    this.recalculateSupernodeMetrics(supernodeId);
    
    supernode.status = "active";
    this.emit("supernode-scaled", { supernode });
    return supernode;
  }
  
  private recalculateSupernodeMetrics(supernodeId: string): void {
    const supernode = this.supernodes.get(supernodeId);
    if (!supernode) return;
    
    const nodeIds = this.nodesBySupernode.get(supernodeId);
    if (!nodeIds) return;
    
    let totalComputePower = 0;
    let totalStorage = 0;
    let totalBandwidth = 0;
    let totalLatency = 0;
    const capabilities = new Set<NodeCapability>();
    const regions = new Set<string>();
    
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        totalComputePower += node.performance.computeScore / 1000;
        totalStorage += node.specs.storageGB / 1000;
        totalBandwidth += node.specs.networkMbps / 1000;
        totalLatency += node.performance.networkLatency;
        node.capabilities.forEach(c => capabilities.add(c));
        regions.add(node.network.region);
      }
    }
    
    supernode.totalNodes = nodeIds.size;
    supernode.totalComputePower = totalComputePower;
    supernode.totalStorage = totalStorage;
    supernode.totalBandwidth = totalBandwidth;
    supernode.avgResponseTime = nodeIds.size > 0 ? totalLatency / nodeIds.size : 0;
    supernode.capabilities = Array.from(capabilities);
    supernode.regions = Array.from(regions);
    supernode.processingCapacity = nodeIds.size * 100;
    
    if (nodeIds.size >= 100 || totalComputePower >= 100) {
      supernode.tier = "hypernode";
    }
  }
  
  // ==========================================================================
  // Task Distribution
  // ==========================================================================
  
  /**
   * Submit a compute task
   */
  submitTask(params: {
    type: TaskType;
    priority?: ComputeTask["priority"];
    requirements: TaskRequirements;
    input: string;
    reward: number;
    tokenReward?: number;
    submittedBy: string;
    maxRetries?: number;
  }): ComputeTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const task: ComputeTask = {
      id,
      type: params.type,
      priority: params.priority || "normal",
      status: "queued",
      requirements: params.requirements,
      input: params.input,
      progress: 0,
      computeUnits: this.estimateComputeUnits(params.requirements),
      retryCount: 0,
      maxRetries: params.maxRetries || 3,
      reward: params.reward,
      tokenReward: params.tokenReward || 0,
      submittedBy: params.submittedBy,
      submittedAt: new Date(),
    };
    
    this.tasks.set(id, task);
    this.taskQueues[task.priority].push(id);
    
    // Auto-assign if possible
    this.assignTask(id);
    
    this.emit("task-submitted", { task });
    return task;
  }
  
  private estimateComputeUnits(requirements: TaskRequirements): number {
    let units = 1;
    
    if (requirements.minCPUCores) units += requirements.minCPUCores * 10;
    if (requirements.minRAMGB) units += requirements.minRAMGB * 5;
    if (requirements.requireGPU) units += 50;
    if (requirements.minGPUVRAM) units += requirements.minGPUVRAM * 10;
    if (requirements.estimatedDuration) units += requirements.estimatedDuration / 1000;
    
    return Math.round(units);
  }
  
  /**
   * Assign a task to a node or cluster
   */
  private assignTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "queued") return false;
    
    // Find suitable executor
    const executor = this.findSuitableExecutor(task);
    if (!executor) return false;
    
    task.assignedTo = executor;
    task.status = "assigned";
    task.assignedAt = new Date();
    
    this.emit("task-assigned", { taskId, executorId: executor });
    return true;
  }
  
  private findSuitableExecutor(task: ComputeTask): string | null {
    const candidates: Array<{ id: string; score: number }> = [];
    
    // Check nodes
    for (const [nodeId, node] of this.nodes) {
      if (this.isNodeSuitable(node, task)) {
        const score = this.calculateExecutorScore(node, task);
        candidates.push({ id: nodeId, score });
      }
    }
    
    // Check supernodes for complex tasks
    if (task.computeUnits > 100 || task.requirements.requireGPU) {
      for (const [snId, supernode] of this.supernodes) {
        if (this.isSupernodeSuitable(supernode, task)) {
          candidates.push({ id: snId, score: supernode.processingCapacity });
        }
      }
    }
    
    if (candidates.length === 0) return null;
    
    // Sort by score and return best match
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].id;
  }
  
  private isNodeSuitable(node: ComputeNode, task: ComputeTask): boolean {
    if (node.status !== "online") return false;
    if (node.performance.currentLoad > 90) return false;
    
    // Check circuit breaker
    const breaker = this.loadBalancer.circuitBreakers.get(node.id);
    if (breaker?.state === "open") return false;
    
    const req = task.requirements;
    
    if (req.minCPUCores && node.specs.cpuCores < req.minCPUCores) return false;
    if (req.minRAMGB && node.performance.availableRAM < req.minRAMGB) return false;
    if (req.minStorageGB && node.performance.availableStorage < req.minStorageGB) return false;
    if (req.requireGPU && !node.specs.gpuModel) return false;
    if (req.minGPUVRAM && (!node.specs.gpuVRAM || node.specs.gpuVRAM < req.minGPUVRAM)) return false;
    if (req.maxLatency && node.performance.networkLatency > req.maxLatency) return false;
    
    if (req.requiredCapabilities) {
      for (const cap of req.requiredCapabilities) {
        if (!node.capabilities.includes(cap)) return false;
      }
    }
    
    if (req.preferredRegions && !req.preferredRegions.includes(node.network.region)) {
      return false;
    }
    
    return true;
  }
  
  private isSupernodeSuitable(supernode: Supernode, task: ComputeTask): boolean {
    if (supernode.status !== "active") return false;
    
    const req = task.requirements;
    
    if (req.requiredCapabilities) {
      for (const cap of req.requiredCapabilities) {
        if (!supernode.capabilities.includes(cap)) return false;
      }
    }
    
    if (req.preferredRegions) {
      const hasRegion = req.preferredRegions.some(r => supernode.regions.includes(r));
      if (!hasRegion) return false;
    }
    
    return true;
  }
  
  private calculateExecutorScore(node: ComputeNode, task: ComputeTask): number {
    let score = node.performance.computeScore;
    
    // Prefer less loaded nodes
    score *= (100 - node.performance.currentLoad) / 100;
    
    // Prefer higher reliability
    score *= node.performance.reliability / 100;
    
    // Prefer lower latency
    if (node.performance.networkLatency < 50) score *= 1.2;
    
    // Capability match bonus
    const requiredCaps = task.requirements.requiredCapabilities || [];
    for (const cap of requiredCaps) {
      if (node.capabilities.includes(cap)) score *= 1.1;
    }
    
    return score;
  }
  
  /**
   * Start processing a task
   */
  startTask(taskId: string): ComputeTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    task.status = "processing";
    task.startedAt = new Date();
    
    // Update executor load
    if (task.assignedTo) {
      const node = this.nodes.get(task.assignedTo);
      if (node) {
        node.performance.currentLoad += 10;
      }
    }
    
    this.emit("task-started", { task });
    return task;
  }
  
  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: number): ComputeTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    task.progress = Math.min(100, Math.max(0, progress));
    this.emit("task-progress", { taskId, progress: task.progress });
    return task;
  }
  
  /**
   * Complete a task
   */
  completeTask(taskId: string, output: string): ComputeTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    task.status = "completed";
    task.output = output;
    task.progress = 100;
    task.completedAt = new Date();
    task.actualComputeTime = task.startedAt 
      ? task.completedAt.getTime() - task.startedAt.getTime() 
      : 0;
    
    // Update executor metrics
    if (task.assignedTo) {
      const node = this.nodes.get(task.assignedTo);
      if (node) {
        node.performance.tasksCompleted++;
        node.performance.currentLoad = Math.max(0, node.performance.currentLoad - 10);
        node.contribution.tasksProcessed++;
        node.contribution.rewardsEarned += task.reward;
        node.contribution.tokensEarned += task.tokenReward;
        
        // Update average task time
        const total = node.performance.tasksCompleted;
        node.performance.avgTaskTime = 
          (node.performance.avgTaskTime * (total - 1) + task.actualComputeTime) / total;
        
        // Reset circuit breaker
        const breaker = this.loadBalancer.circuitBreakers.get(node.id);
        if (breaker) {
          breaker.failureCount = 0;
          if (breaker.state === "half-open") breaker.state = "closed";
        }
      }
    }
    
    // Remove from queue
    this.removeFromQueue(taskId, task.priority);
    
    this.emit("task-completed", { task });
    return task;
  }
  
  /**
   * Fail a task
   */
  failTask(taskId: string, error: string): ComputeTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    
    task.retryCount++;
    
    // Update circuit breaker
    if (task.assignedTo) {
      const node = this.nodes.get(task.assignedTo);
      if (node) {
        node.performance.tasksFailed++;
        node.performance.currentLoad = Math.max(0, node.performance.currentLoad - 10);
        
        const breaker = this.loadBalancer.circuitBreakers.get(node.id);
        if (breaker) {
          breaker.failureCount++;
          breaker.lastFailure = new Date();
          if (breaker.failureCount >= breaker.failureThreshold) {
            breaker.state = "open";
            this.emit("circuit-breaker-opened", { nodeId: node.id });
          }
        }
      }
    }
    
    if (task.retryCount < task.maxRetries) {
      // Retry
      task.status = "queued";
      task.assignedTo = undefined;
      task.assignedAt = undefined;
      this.assignTask(taskId);
      this.emit("task-retrying", { taskId, attempt: task.retryCount });
    } else {
      // Final failure
      task.status = "failed";
      task.output = error;
      this.removeFromQueue(taskId, task.priority);
      this.emit("task-failed", { task, error });
    }
    
    return task;
  }
  
  private removeFromQueue(taskId: string, priority: ComputeTask["priority"]): void {
    const queue = this.taskQueues[priority];
    const index = queue.indexOf(taskId);
    if (index > -1) {
      queue.splice(index, 1);
    }
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getNode(nodeId: string): ComputeNode | undefined {
    return this.nodes.get(nodeId);
  }
  
  getCluster(clusterId: string): NodeCluster | undefined {
    return this.clusters.get(clusterId);
  }
  
  getSupernode(supernodeId: string): Supernode | undefined {
    return this.supernodes.get(supernodeId);
  }
  
  getTask(taskId: string): ComputeTask | undefined {
    return this.tasks.get(taskId);
  }
  
  getNodesByCapability(capability: NodeCapability): ComputeNode[] {
    const nodeIds = this.nodesByCapability.get(capability);
    if (!nodeIds) return [];
    return Array.from(nodeIds)
      .map(id => this.nodes.get(id)!)
      .filter(n => n && n.status === "online");
  }
  
  getNetworkStats(): {
    totalNodes: number;
    onlineNodes: number;
    totalClusters: number;
    totalSupernodes: number;
    totalComputePower: number;
    totalStorageTB: number;
    totalBandwidthGbps: number;
    pendingTasks: number;
    processingTasks: number;
    completedTasks: number;
  } {
    let onlineNodes = 0;
    let totalComputePower = 0;
    let totalStorageTB = 0;
    let totalBandwidthGbps = 0;
    
    for (const node of this.nodes.values()) {
      if (node.status === "online") onlineNodes++;
      totalComputePower += node.performance.computeScore / 1000;
      totalStorageTB += node.specs.storageGB / 1000;
      totalBandwidthGbps += node.specs.networkMbps / 1000;
    }
    
    let pendingTasks = 0;
    let processingTasks = 0;
    let completedTasks = 0;
    
    for (const task of this.tasks.values()) {
      switch (task.status) {
        case "queued":
        case "assigned":
          pendingTasks++;
          break;
        case "processing":
          processingTasks++;
          break;
        case "completed":
          completedTasks++;
          break;
      }
    }
    
    return {
      totalNodes: this.nodes.size,
      onlineNodes,
      totalClusters: this.clusters.size,
      totalSupernodes: this.supernodes.size,
      totalComputePower,
      totalStorageTB,
      totalBandwidthGbps,
      pendingTasks,
      processingTasks,
      completedTasks,
    };
  }
  
  getLeaderboard(limit: number = 20): ComputeNode[] {
    return Array.from(this.nodes.values())
      .sort((a, b) => b.contribution.reputationScore - a.contribution.reputationScore)
      .slice(0, limit);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const distributedNodes = DistributedNodeManager.getInstance();

export { DistributedNodeManager };
