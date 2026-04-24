/**
 * Pi Network Backbone API
 * 
 * Endpoints for:
 * - Node registration and management
 * - Task submission and monitoring
 * - Docker job management
 * - Supernode operations
 * - Computing power pools
 */

import { NextRequest, NextResponse } from "next/server";
import { secureRoute, safeErrorResponse } from "@/lib/security/api-guard";
import {
  piBackbone,
  piNetworkBackbone,
  distributedNodes,
  dockerProcessing,
  computingAggregator,
} from "@/lib/pi-backbone";

// ============================================================================
// GET - System Status & Queries
// ============================================================================

export async function GET(request: NextRequest) {
  return secureRoute(request, async (req, _session) => {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "status";
  
  try {
    switch (action) {
      // System Status
      case "status": {
        const status = piBackbone.getSystemStatus();
        return NextResponse.json({ success: true, data: status });
      }
      
      // Network Stats
      case "network-stats": {
          const stats = piNetworkBackbone.network.getNetworkStats();
        return NextResponse.json({ success: true, data: stats });
      }
      
      // Node Stats
      case "node-stats": {
        const stats = distributedNodes.getNetworkStats();
        return NextResponse.json({ success: true, data: stats });
      }
      
      // Docker Stats
      case "docker-stats": {
        const stats = dockerProcessing.getStatistics();
        return NextResponse.json({ success: true, data: stats });
      }
      
      // Aggregator Power
      case "aggregated-power": {
        const power = computingAggregator.getAggregatedPower();
        return NextResponse.json({ success: true, data: power });
      }
      
      // Get Node
      case "get-node": {
        const nodeId = searchParams.get("nodeId");
        if (!nodeId) {
          return NextResponse.json({ error: "nodeId required" }, { status: 400 });
        }
        const node = distributedNodes.getNode(nodeId);
        if (!node) {
          return NextResponse.json({ error: "Node not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: node });
      }
      
      // Get Task
      case "get-task": {
        const taskId = searchParams.get("taskId");
        if (!taskId) {
          return NextResponse.json({ error: "taskId required" }, { status: 400 });
        }
        const task = distributedNodes.getTask(taskId);
        if (!task) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: task });
      }
      
      // Get Docker Job
      case "get-job": {
        const jobId = searchParams.get("jobId");
        if (!jobId) {
          return NextResponse.json({ error: "jobId required" }, { status: 400 });
        }
        const job = dockerProcessing.getJob(jobId);
        if (!job) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: job });
      }
      
      // Get Container
      case "get-container": {
        const containerId = searchParams.get("containerId");
        if (!containerId) {
          return NextResponse.json({ error: "containerId required" }, { status: 400 });
        }
        const container = dockerProcessing.getContainer(containerId);
        if (!container) {
          return NextResponse.json({ error: "Container not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: container });
      }
      
      // Get Container Logs
      case "container-logs": {
        const containerId = searchParams.get("containerId");
        const tail = searchParams.get("tail");
        if (!containerId) {
          return NextResponse.json({ error: "containerId required" }, { status: 400 });
        }
        const logs = dockerProcessing.getContainerLogs(containerId, tail ? parseInt(tail) : undefined);
        return NextResponse.json({ success: true, data: logs });
      }
      
      // Get Pool
      case "get-pool": {
        const poolId = searchParams.get("poolId");
        if (!poolId) {
          return NextResponse.json({ error: "poolId required" }, { status: 400 });
        }
        const pool = computingAggregator.getPool(poolId);
        if (!pool) {
          return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: pool });
      }
      
      // Get All Pools
      case "all-pools": {
        const pools = computingAggregator.getAllPools();
        return NextResponse.json({ success: true, data: pools });
      }
      
      // Get All Images
      case "all-images": {
        const images = dockerProcessing.getAllImages();
        return NextResponse.json({ success: true, data: images });
      }
      
      // Get Efficiency Report
      case "efficiency-report": {
        const poolId = searchParams.get("poolId");
        const period = searchParams.get("period");
        if (!poolId) {
          return NextResponse.json({ error: "poolId required" }, { status: 400 });
        }
        const report = computingAggregator.generateEfficiencyReport(
          poolId, 
          period ? parseInt(period) : undefined
        );
        return NextResponse.json({ success: true, data: report });
      }
      
      // Get Scaling Events
      case "scaling-events": {
        const poolId = searchParams.get("poolId") || undefined;
        const events = computingAggregator.getScalingEvents(poolId);
        return NextResponse.json({ success: true, data: events });
      }
      
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorResponse(error) },
      { status: 500 }
    );
  }
  }, { requireAuth: true, requireCsrf: false });
}

// ============================================================================
// POST - Create & Submit Operations
// ============================================================================

export async function POST(request: NextRequest) {
  return secureRoute(request, async (req, _session) => {
  try {
    const body = await req.json();
    const { action, ...params } = body;
    
    switch (action) {
      // Initialize System
      case "initialize": {
        const result = await piBackbone.initialize();
        return NextResponse.json({ success: true, data: result });
      }
      
      // Register Full Node
      case "register-full-node": {
        const { publicKey, name, owner, specs } = params;
        if (!publicKey || !name || !owner || !specs) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const result = piBackbone.registerFullNode({ publicKey, name, owner, specs });
        return NextResponse.json({ success: true, data: result });
      }
      
      // Register Node (compute only)
      case "register-node": {
        const { name, owner, specs } = params;
        if (!name || !owner || !specs) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
          const node = distributedNodes.registerNode({
            name,
            ownerId: owner,
            walletId: `wallet-${owner}`,
            specs: {
              cpuCores: specs.cpuCores || 4,
              cpuFrequency: specs.cpuSpeed || specs.cpuFrequency || 3.0,
              cpuModel: specs.cpuModel || "Unknown",
              ramGB: specs.ramGB || 16,
              storageGB: specs.storageGB || 500,
              storageType: specs.storageType || "ssd",
              networkMbps: specs.bandwidth || specs.networkMbps || 1000,
              gpuModel: specs.gpuModel,
              gpuVRAM: specs.gpuVRAM,
            },
            network: {
              publicIP: "0.0.0.0",
              region: "global",
              country: "unknown",
              isp: "unknown",
              connectionType: "fiber" as const,
              port: 31400,
              peerCount: 0,
              inboundBandwidth: specs.bandwidth || specs.networkMbps || 1000,
              outboundBandwidth: specs.bandwidth || specs.networkMbps || 1000,
            },
          });
        return NextResponse.json({ success: true, data: node });
      }
      
      // Create Cluster
      case "create-cluster": {
        const { name, operator, nodeIds } = params;
        if (!name || !operator) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
          const cluster = distributedNodes.createCluster({
            name,
            leaderId: operator,
            initialNodes: nodeIds || [],
          });
        return NextResponse.json({ success: true, data: cluster });
      }
      
      // Create Supernode
      case "create-supernode": {
        const { name, operator, clusterIds, directNodeIds } = params;
        if (!name || !operator || !clusterIds) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const result = piBackbone.createSupernode({ name, operator, clusterIds, directNodeIds });
        return NextResponse.json({ success: true, data: result });
      }
      
      // Submit Task
      case "submit-task": {
        const { type, priority, requirements, submittedBy, reward } = params;
        if (!type || !requirements || !submittedBy) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const task = distributedNodes.submitTask({
          type, priority, requirements, input: "", submittedBy, reward: reward || 0
        });
        return NextResponse.json({ success: true, data: task });
      }
      
      // Submit Docker Job
      case "submit-job": {
        const { name, imageId, command, requirements, priority, parallelism, submittedBy, reward } = params;
        if (!name || !imageId || !command || !requirements || !submittedBy) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const result = await piBackbone.submitContainerizedJob({
          name, imageId, command, requirements, priority, parallelism, submittedBy, reward: reward || 0
        });
        return NextResponse.json({ success: true, data: result });
      }
      
      // Register Docker Image
      case "register-image": {
        const { name, tag, category, description, size, layers, entrypoint, requirements } = params;
        if (!name || !tag || !category || !requirements) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const image = dockerProcessing.registerImage({
          name, tag, category, description: description || "", 
          size: size || 100, layers: layers || 5,
          entrypoint: entrypoint || ["/bin/sh", "-c"],
          requirements
        });
        return NextResponse.json({ success: true, data: image });
      }
      
      // Create Container
      case "create-container": {
        const { name, imageId, nodeId, resources, command, env } = params;
        if (!name || !imageId || !nodeId || !resources) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const container = dockerProcessing.createContainer({
          name, imageId, nodeId, resources, command, env
        });
        return NextResponse.json({ success: true, data: container });
      }
      
      // Start Container
      case "start-container": {
        const { containerId } = params;
        if (!containerId) {
          return NextResponse.json({ error: "containerId required" }, { status: 400 });
        }
        const container = dockerProcessing.startContainer(containerId);
        return NextResponse.json({ success: true, data: container });
      }
      
      // Stop Container
      case "stop-container": {
        const { containerId } = params;
        if (!containerId) {
          return NextResponse.json({ error: "containerId required" }, { status: 400 });
        }
        const container = dockerProcessing.stopContainer(containerId);
        return NextResponse.json({ success: true, data: container });
      }
      
      // Create Resource Pool
      case "create-pool": {
        const { name, strategy, nodeIds, autoScale } = params;
        if (!name || !strategy || !nodeIds) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const result = piBackbone.createResourcePool({ name, strategy, nodeIds, autoScale });
        return NextResponse.json({ success: true, data: result });
      }
      
      // Scale Pool Up
      case "scale-pool-up": {
        const { poolId, count } = params;
        if (!poolId) {
          return NextResponse.json({ error: "poolId required" }, { status: 400 });
        }
        const pool = computingAggregator.scalePoolUp(poolId, count || 1);
        return NextResponse.json({ success: true, data: pool });
      }
      
      // Scale Pool Down
      case "scale-pool-down": {
        const { poolId, count } = params;
        if (!poolId) {
          return NextResponse.json({ error: "poolId required" }, { status: 400 });
        }
        const pool = computingAggregator.scalePoolDown(poolId, count || 1);
        return NextResponse.json({ success: true, data: pool });
      }
      
      // Submit Workload
      case "submit-workload": {
        const { name, type, requirements, characteristics, preferredPoolId } = params;
        if (!name || !type || !requirements || !characteristics) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
        const workload = computingAggregator.submitWorkload({
          name, type, requirements, characteristics, preferredPoolId
        });
        return NextResponse.json({ success: true, data: workload });
      }
      
      // Stake for Validation
      case "stake-for-validation": {
        const { nodeId, amount } = params;
        if (!nodeId || !amount) {
          return NextResponse.json({ error: "nodeId and amount required" }, { status: 400 });
        }
          const node = piNetworkBackbone.network.stakeForValidation(nodeId, amount);
        return NextResponse.json({ success: true, data: node });
      }
      
      // Submit Transaction
      case "submit-transaction": {
        const { type, from, to, amount } = params;
        if (!type || !from || !to) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
          const tx = piNetworkBackbone.network.submitTransaction({ type, from, to, amount });
        return NextResponse.json({ success: true, data: tx });
      }
      
      // Create Governance Proposal
      case "create-proposal": {
        const { title, description, proposer, endBlock } = params;
        if (!title || !description || !proposer) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
          const proposal = piNetworkBackbone.network.createProposal({ proposer, type: "parameter", title, description, data: {}, durationDays: endBlock || 30 });
        return NextResponse.json({ success: true, data: proposal });
      }
      
      // Vote on Proposal
      case "vote-on-proposal": {
        const { proposalId, voter, support, weight } = params;
        if (!proposalId || !voter || support === undefined || !weight) {
          return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }
          const proposal = piNetworkBackbone.network.voteOnProposal(proposalId, voter, support ? "for" : "against");
        return NextResponse.json({ success: true, data: proposal });
      }
      
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorResponse(error) },
      { status: 500 }
    );
  }
  }, { requireAuth: true, requireCsrf: true, rateLimit: { max: 30, windowMs: 60_000, endpoint: "backbone-post" } });
}

// ============================================================================
// PUT - Update Operations
// ============================================================================

export async function PUT(request: NextRequest) {
  return secureRoute(request, async (req, _session) => {
  try {
    const body = await req.json();
    const { action, ...params } = body;
    
    switch (action) {
      // Update Node Status
      case "update-node-status": {
        const { nodeId, status } = params;
        if (!nodeId || !status) {
          return NextResponse.json({ error: "nodeId and status required" }, { status: 400 });
        }
        const node = distributedNodes.updateNodeStatus(nodeId, status);
        return NextResponse.json({ success: true, data: node });
      }
      
      // Update Node Metrics
      case "update-node-metrics": {
        const { nodeId, metrics } = params;
        if (!nodeId || !metrics) {
          return NextResponse.json({ error: "nodeId and metrics required" }, { status: 400 });
        }
        const node = distributedNodes.updateNodeMetrics(nodeId, metrics);
        return NextResponse.json({ success: true, data: node });
      }
      
      // Update Task Progress
      case "update-task-progress": {
        const { taskId, progress } = params;
        if (!taskId || progress === undefined) {
          return NextResponse.json({ error: "taskId and progress required" }, { status: 400 });
        }
        const task = distributedNodes.updateTaskProgress(taskId, progress);
        return NextResponse.json({ success: true, data: task });
      }
      
      // Complete Task
      case "complete-task": {
        const { taskId, result } = params;
        if (!taskId) {
          return NextResponse.json({ error: "taskId required" }, { status: 400 });
        }
        const task = distributedNodes.completeTask(taskId, result);
        return NextResponse.json({ success: true, data: task });
      }
      
      // Fail Task
      case "fail-task": {
        const { taskId, error } = params;
        if (!taskId) {
          return NextResponse.json({ error: "taskId required" }, { status: 400 });
        }
        const task = distributedNodes.failTask(taskId, error);
        return NextResponse.json({ success: true, data: task });
      }
      
      // Update Job Progress
      case "update-job-progress": {
        const { jobId, progress } = params;
        if (!jobId || progress === undefined) {
          return NextResponse.json({ error: "jobId and progress required" }, { status: 400 });
        }
        const job = dockerProcessing.updateJobProgress(jobId, progress);
        return NextResponse.json({ success: true, data: job });
      }
      
      // Complete Job
      case "complete-job": {
        const { jobId, outputData } = params;
        if (!jobId) {
          return NextResponse.json({ error: "jobId required" }, { status: 400 });
        }
        const job = dockerProcessing.completeJob(jobId, outputData);
        return NextResponse.json({ success: true, data: job });
      }
      
      // Update Workload Progress
      case "update-workload-progress": {
        const { workloadId, progress } = params;
        if (!workloadId || progress === undefined) {
          return NextResponse.json({ error: "workloadId and progress required" }, { status: 400 });
        }
        const workload = computingAggregator.updateWorkloadProgress(workloadId, progress);
        return NextResponse.json({ success: true, data: workload });
      }
      
      // Complete Workload
      case "complete-workload": {
        const { workloadId } = params;
        if (!workloadId) {
          return NextResponse.json({ error: "workloadId required" }, { status: 400 });
        }
        const workload = computingAggregator.completeWorkload(workloadId);
        return NextResponse.json({ success: true, data: workload });
      }
      
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorResponse(error) },
      { status: 500 }
    );
  }
  }, { requireAuth: true, requireCsrf: true });
}

// ============================================================================
// DELETE - Remove Operations
// ============================================================================

export async function DELETE(request: NextRequest) {
  return secureRoute(request, async (req, _session) => {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  
  try {
    switch (action) {
      // Cancel Job
      case "cancel-job": {
        const jobId = searchParams.get("jobId");
        if (!jobId) {
          return NextResponse.json({ error: "jobId required" }, { status: 400 });
        }
        const job = dockerProcessing.cancelJob(jobId);
        return NextResponse.json({ success: true, data: job });
      }
      
      // Remove Container
      case "remove-container": {
        const containerId = searchParams.get("containerId");
        if (!containerId) {
          return NextResponse.json({ error: "containerId required" }, { status: 400 });
        }
        dockerProcessing.removeContainer(containerId);
        return NextResponse.json({ success: true });
      }
      
      // Remove Node from Cluster
      case "remove-from-cluster": {
        const clusterId = searchParams.get("clusterId");
        const nodeId = searchParams.get("nodeId");
        if (!clusterId || !nodeId) {
          return NextResponse.json({ error: "clusterId and nodeId required" }, { status: 400 });
        }
        const cluster = distributedNodes.removeNodeFromCluster(clusterId, nodeId);
        return NextResponse.json({ success: true, data: cluster });
      }
      
      // Remove Unit from Pool
      case "remove-from-pool": {
        const poolId = searchParams.get("poolId");
        const unitId = searchParams.get("unitId");
        if (!poolId || !unitId) {
          return NextResponse.json({ error: "poolId and unitId required" }, { status: 400 });
        }
        const pool = computingAggregator.removeUnitFromPool(poolId, unitId);
        return NextResponse.json({ success: true, data: pool });
      }
      
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorResponse(error) },
      { status: 500 }
    );
  }
  }, { requireAuth: true, requireCsrf: true });
}
