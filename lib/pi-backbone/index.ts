/**
 * Pi Network Backbone - Main Entry Point
 * 
 * Triumph-Synergy's Pi Network Infrastructure:
 * - Network backbone coordination
 * - Distributed computing nodes
 * - Docker containerized processing
 * - Computing power aggregation
 * - Task distribution
 */

// Core systems
export { 
  piBackbone as piNetworkBackbone, 
  PiNetworkBackbone,
  type NetworkRole,
  type NetworkStatus,
  type NetworkNode,
  type NetworkBlock,
  type NetworkTransaction,
  type TransactionType,
  type GovernanceProposal,
  type NetworkEpoch,
  type CrossChainMessage,
  type NetworkConfig,
} from "./pi-network-backbone";

export {
  distributedNodes,
  DistributedNodeManager,
  type NodeTier,
  type NodeCapability,
  type NodeStatus,
  type ComputeNode,
  type NodeSpecs,
  type NodePerformance,
  type NodeNetwork,
  type NodeContribution,
  type NodeCluster,
  type ClusterStatus,
  type AggregatedSpecs,
  type Supernode,
  type ComputeTask,
  type TaskType,
  type TaskRequirements,
} from "./distributed-nodes";

export {
  dockerProcessing,
  DockerProcessingManager,
  type ContainerStatus,
  type ImageCategory,
  type DockerImage,
  type ImageRequirements,
  type SecurityScan,
  type Container,
  type ContainerResources,
  type ContainerNetwork,
  type PortMapping,
  type ContainerMetrics,
  type ContainerLog,
  type DockerJob,
  type JobType,
  type VolumeMount,
  type JobArtifact,
  type JobSchedule,
  type ContainerRegistry,
  type ResourcePool,
} from "./docker-processing";

export {
  computingAggregator,
  ComputingAggregator,
  type AggregationStrategy,
  type ScalingPolicy,
  type ComputePowerUnit,
  type PowerPool,
  type ComputeWorkload,
  type EfficiencyReport,
  type ScalingEvent,
} from "./computing-aggregation";

// ============================================================================
// Unified Backbone Interface
// ============================================================================

import { piBackbone } from "./pi-network-backbone";
import { distributedNodes } from "./distributed-nodes";
import { dockerProcessing } from "./docker-processing";
import { computingAggregator } from "./computing-aggregation";

/**
 * Unified Pi Network Backbone
 * 
 * Single entry point for all backbone operations
 */
export class PiBackboneSystem {
  private static instance: PiBackboneSystem;
  
  // Sub-systems
  readonly network = piBackbone;
  readonly nodes = distributedNodes;
  readonly docker = dockerProcessing;
  readonly aggregator = computingAggregator;
  
  private constructor() {}
  
  static getInstance(): PiBackboneSystem {
    if (!PiBackboneSystem.instance) {
      PiBackboneSystem.instance = new PiBackboneSystem();
    }
    return PiBackboneSystem.instance;
  }
  
  /**
   * Initialize the entire backbone system
   */
  async initialize(): Promise<{
    network: boolean;
    nodes: boolean;
    docker: boolean;
    aggregator: boolean;
  }> {
    const results = {
      network: false,
      nodes: false,
      docker: false,
      aggregator: false,
    };
    
    try {
      this.network.initialize();
      results.network = true;
    } catch (e) {
      console.error("Network initialization failed:", e);
    }
    
    // Nodes and Docker are auto-initialized as singletons
    results.nodes = true;
    results.docker = true;
    results.aggregator = true;
    
    return results;
  }
  
  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    network: {
      chainId: number;
      status: string;
      nodeCount: number;
      blockCount: number;
      transactionCount: number;
      validatorCount: number;
    };
    nodes: {
      totalNodes: number;
      onlineNodes: number;
      clusters: number;
      supernodes: number;
      pendingTasks: number;
      activeTasks: number;
    };
    docker: {
      images: number;
      containers: number;
      runningContainers: number;
      jobs: number;
      runningJobs: number;
    };
    aggregator: {
      units: number;
      pools: number;
      activeWorkloads: number;
      totalComputeScore: number;
      averageUtilization: number;
    };
  } {
    const networkStats = this.network.getStats();
    const nodeStats = this.nodes.getNetworkStats();
    const dockerStats = this.docker.getStatistics();
    const aggregatorPower = this.aggregator.getAggregatedPower();
    
    return {
      network: {
        chainId: networkStats.chainId,
        status: networkStats.status,
        nodeCount: networkStats.totalNodes,
        blockCount: networkStats.totalBlocks,
        transactionCount: networkStats.totalTransactions,
        validatorCount: networkStats.activeValidators,
      },
      nodes: {
        totalNodes: nodeStats.totalNodes,
        onlineNodes: nodeStats.onlineNodes,
        clusters: nodeStats.totalClusters,
        supernodes: nodeStats.totalSupernodes,
        pendingTasks: nodeStats.pendingTasks,
        activeTasks: nodeStats.activeTasks,
      },
      docker: {
        images: dockerStats.totalImages,
        containers: dockerStats.totalContainers,
        runningContainers: dockerStats.runningContainers,
        jobs: dockerStats.totalJobs,
        runningJobs: dockerStats.runningJobs,
      },
      aggregator: {
        units: aggregatorPower.unitCount,
        pools: aggregatorPower.poolCount,
        activeWorkloads: aggregatorPower.activeWorkloads,
        totalComputeScore: aggregatorPower.totalComputeScore,
        averageUtilization: aggregatorPower.averageUtilization,
      },
    };
  }
  
  /**
   * Register a full-stack compute node
   */
  registerFullNode(params: {
    publicKey: string;
    name: string;
    owner: string;
    specs: {
      cpuCores: number;
      cpuSpeed: number;
      ramGB: number;
      storageGB: number;
      storageType: "hdd" | "ssd" | "nvme";
      bandwidth: number;
      gpuModel?: string;
      gpuVRAM?: number;
    };
  }): {
    networkNodeId: string;
    computeNodeId: string;
    computeUnitId: string;
  } {
    // Register in network
    const networkNode = this.network.registerNode({
      publicKey: params.publicKey,
      endpoint: `https://${params.name}.triumphsynergy.pi`,
      role: "validator",
    });
    
    // Register in compute network
    const computeNode = this.nodes.registerNode({
      name: params.name,
      owner: params.owner,
      specs: params.specs,
    });
    
    // Register as compute unit
    const computeUnit = this.aggregator.registerNodeUnit(computeNode.id);
    
    return {
      networkNodeId: networkNode.id,
      computeNodeId: computeNode.id,
      computeUnitId: computeUnit.id,
    };
  }
  
  /**
   * Submit a containerized compute job
   */
  async submitContainerizedJob(params: {
    name: string;
    imageId: string;
    command: string[];
    requirements: {
      minCores: number;
      minRAM: number;
      minStorage: number;
      requiresGPU?: boolean;
    };
    priority?: "low" | "normal" | "high" | "critical";
    parallelism?: number;
    submittedBy: string;
    reward: number;
  }): Promise<{
    jobId: string;
    workloadId: string;
    containers: string[];
  }> {
    // Create Docker job
    const job = this.docker.submitJob({
      name: params.name,
      type: params.parallelism && params.parallelism > 1 ? "parallel" : "single",
      priority: params.priority || "normal",
      imageId: params.imageId,
      command: params.command,
      resources: {
        cpuCores: params.requirements.minCores,
        cpuShares: 1024,
        memoryMB: params.requirements.minRAM * 1024,
        memorySwapMB: params.requirements.minRAM * 1024 * 2,
        storageMB: params.requirements.minStorage * 1024,
        gpuAccess: params.requirements.requiresGPU || false,
      },
      parallelism: params.parallelism || 1,
      reward: params.reward,
      submittedBy: params.submittedBy,
    });
    
    // Create compute workload
    const workload = this.aggregator.submitWorkload({
      name: params.name,
      type: "batch",
      requirements: {
        minCores: params.requirements.minCores,
        minRAM: params.requirements.minRAM,
        minStorage: params.requirements.minStorage,
        minGPUTflops: params.requirements.requiresGPU ? 1 : undefined,
      },
      characteristics: {
        parallelizable: params.parallelism ? params.parallelism > 1 : false,
        dataSizeGB: params.requirements.minStorage,
        estimatedDuration: 3600000, // 1 hour estimate
        memoryIntensive: params.requirements.minRAM > 16,
        cpuIntensive: params.requirements.minCores > 4,
        gpuRequired: params.requirements.requiresGPU || false,
      },
    });
    
    return {
      jobId: job.id,
      workloadId: workload.id,
      containers: job.containers,
    };
  }
  
  /**
   * Create a supernode from existing nodes
   */
  createSupernode(params: {
    name: string;
    operator: string;
    clusterIds: string[];
    directNodeIds?: string[];
  }): {
    supernodeId: string;
    computeUnitId: string;
    totalPower: number;
  } {
    const supernode = this.nodes.createSupernode({
      name: params.name,
      operator: params.operator,
      clusterIds: params.clusterIds,
      directNodeIds: params.directNodeIds,
    });
    
    const computeUnit = this.aggregator.registerSupernodeUnit(supernode.id);
    
    return {
      supernodeId: supernode.id,
      computeUnitId: computeUnit.id,
      totalPower: supernode.aggregatedPower,
    };
  }
  
  /**
   * Create a resource pool for workloads
   */
  createResourcePool(params: {
    name: string;
    strategy: "balanced" | "performance" | "efficiency" | "cost" | "latency";
    nodeIds: string[];
    autoScale?: boolean;
  }): {
    poolId: string;
    totalCores: number;
    totalRAM: number;
  } {
    // Register nodes as units first
    const unitIds: string[] = [];
    for (const nodeId of params.nodeIds) {
      try {
        const unit = this.aggregator.registerNodeUnit(nodeId);
        unitIds.push(unit.id);
      } catch (e) {
        // Unit already exists
        unitIds.push(`unit-node-${nodeId}`);
      }
    }
    
    const pool = this.aggregator.createPool({
      name: params.name,
      strategy: params.strategy,
      scalingPolicy: params.autoScale ? "auto" : "manual",
      unitIds,
    });
    
    return {
      poolId: pool.id,
      totalCores: pool.aggregated.totalCores,
      totalRAM: pool.aggregated.totalRAM,
    };
  }
}

// Export singleton
export const piBackbone = PiBackboneSystem.getInstance();
