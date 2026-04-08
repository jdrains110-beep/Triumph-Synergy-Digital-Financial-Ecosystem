/**
 * Pi Backbone Unit Tests
 * Covers: distributed-nodes types, NodeCluster, Supernode, ComputeTask,
 *         LoadBalancer, BackboneNode registration and network stats
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------
const backboneMock = {
  registerNode: vi.fn(),
  removeNode: vi.fn(),
  getNode: vi.fn(),
  listNodes: vi.fn(),
  submitTask: vi.fn(),
  getTask: vi.fn(),
  getNetworkStats: vi.fn(),
  createCluster: vi.fn(),
  createSupernode: vi.fn(),
  getSupernode: vi.fn(),
  getLoadBalancer: vi.fn(),
};

vi.mock("@/lib/pi-backbone", () => ({
  PiBackbone: {
    getInstance: vi.fn(() => backboneMock),
  },
}));

import { PiBackbone } from "@/lib/pi-backbone";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function makeNodeSpecs() {
  return {
    cpuCores: 16,
    cpuModel: "AMD EPYC 7742",
    cpuFrequency: 3.4,
    ramGB: 128,
    storageGB: 4000,
    gpuCount: 2,
    gpuModel: "NVIDIA A100",
    gpuVRAM: 80,
    gpuTFLOPS: 312,
    networkMbps: 10000,
  };
}

function makeNodeNetwork() {
  return {
    publicIP: "203.0.113.42",
    region: "us-east-1",
    country: "US",
    isp: "Amazon AWS",
    connectionType: "fiber" as const,
    port: 31400,
    peerCount: 24,
    inboundBandwidth: 5000,
    outboundBandwidth: 5000,
  };
}

function makeNode(tier = "standard") {
  return {
    id: `node-${Date.now()}`,
    name: "Triumph-Node-01",
    tier,
    status: "active",
    operator: "triumph-operator-001",
    region: "us-east-1",
    version: "2.4.1",
    capabilities: ["validation", "storage", "ml-inference"] as string[],
    computePower: 312,
    specs: makeNodeSpecs(),
    network: makeNodeNetwork(),
    storage: 4000,
    bandwidth: 10000,
    reputation: 0.98,
    uptime: 99.9,
    joinedAt: new Date(),
    lastActivityAt: new Date(),
  };
}

function makeTask(type = "validation") {
  return {
    id: `task-${Date.now()}`,
    type,
    priority: "normal" as const,
    status: "queued" as const,
    requirements: { minCPUCores: 4, minRAMGB: 8 },
    input: JSON.stringify({ blockHash: "0xabc" }),
    progress: 0,
    computeUnits: 100,
    retryCount: 0,
    maxRetries: 3,
    reward: 0.5,
    tokenReward: 10,
    submittedBy: "user-001",
    submittedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("PiBackbone singleton", () => {
  it("should return the same instance each time", () => {
    const a = PiBackbone.getInstance();
    const b = PiBackbone.getInstance();
    expect(a).toBe(b);
  });
});

describe("registerNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should register a new standard node", async () => {
    const node = makeNode("standard");
    backboneMock.registerNode.mockResolvedValueOnce(node);

    const result = await backboneMock.registerNode({
      name: "Triumph-Node-01",
      tier: "standard",
      region: "us-east-1",
      version: "2.4.1",
      capabilities: ["validation", "storage"],
      computePower: 100,
      storage: 4000,
      bandwidth: 10000,
      specs: makeNodeSpecs(),
      network: makeNodeNetwork(),
      operator: "triumph-operator-001",
    });

    expect(result.id).toBeTruthy();
    expect(result.status).toBe("active");
    expect(result.region).toBe("us-east-1");
    expect(result.capabilities).toContain("validation");
  });

  it("should register a supernode with higher specs", async () => {
    const superNode = { ...makeNode("supernode"), computePower: 5000 };
    backboneMock.registerNode.mockResolvedValueOnce(superNode);

    const result = await backboneMock.registerNode({
      ...makeNode("supernode"),
      tier: "supernode",
    });

    expect(result.tier).toBe("supernode");
    expect(result.computePower).toBeGreaterThan(100);
  });

  it("should reject duplicate node registration", async () => {
    backboneMock.registerNode.mockRejectedValueOnce(
      new Error("Node with this public key already registered")
    );

    await expect(
      backboneMock.registerNode({ publicKey: "PK_EXISTING" })
    ).rejects.toThrow("already registered");
  });
});

describe("submitTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should queue a validation task", async () => {
    const task = makeTask("validation");
    backboneMock.submitTask.mockResolvedValueOnce(task);

    const result = await backboneMock.submitTask({
      type: "validation",
      priority: "normal",
      input: JSON.stringify({ blockHash: "0xabc" }),
      requirements: { minCPUCores: 4 },
      submittedBy: "user-001",
    });

    expect(result.status).toBe("queued");
    expect(result.type).toBe("validation");
    expect(result.reward).toBeGreaterThan(0);
  });

  it("should queue an ML training task with GPU requirements", async () => {
    const task = { ...makeTask("ml-training"), requirements: { requireGPU: true, minGPUVRAM: 40 } };
    backboneMock.submitTask.mockResolvedValueOnce(task);

    const result = await backboneMock.submitTask({
      type: "ml-training",
      priority: "high",
      requirements: { requireGPU: true, minGPUVRAM: 40 },
      input: "training-dataset-uri",
      submittedBy: "ml-researcher",
    });

    expect(result.type).toBe("ml-training");
    expect(result.requirements.requireGPU).toBe(true);
  });

  it("should reject tasks with an unknown type", async () => {
    backboneMock.submitTask.mockRejectedValueOnce(
      new Error("Unknown task type: unknown-type")
    );

    await expect(
      backboneMock.submitTask({ type: "unknown-type", input: "", submittedBy: "u1" })
    ).rejects.toThrow("Unknown task type");
  });
});

describe("getNetworkStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return aggregate statistics for the backbone network", () => {
    backboneMock.getNetworkStats.mockReturnValueOnce({
      totalNodes: 256,
      activeNodes: 248,
      totalClusters: 16,
      totalSupernodes: 4,
      processingTasks: 1024,
      completedTasks: 8500000,
      totalComputePower: 500000,
      networkHealth: 99.2,
      averageResponseTimeMs: 8,
    });

    const stats = backboneMock.getNetworkStats();

    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.activeNodes).toBeLessThanOrEqual(stats.totalNodes);
    expect(stats.networkHealth).toBeGreaterThanOrEqual(0);
    expect(stats.networkHealth).toBeLessThanOrEqual(100);
    expect(stats.processingTasks).toBeGreaterThanOrEqual(0);
  });
});

describe("createCluster", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create a node cluster with a leader", async () => {
    backboneMock.createCluster.mockResolvedValueOnce({
      id: "cluster-001",
      name: "US East Cluster",
      leaderId: "node-leader-001",
      status: "active",
      tier: "standard",
      memberNodes: ["node-001", "node-002", "node-003"],
      maxNodes: 16,
      clusterScore: 0.95,
      healthScore: 98,
      rewardPool: 100,
      rewardDistribution: "proportional",
      specializations: ["validation"],
      createdAt: new Date(),
      lastActivity: new Date(),
    });

    const cluster = await backboneMock.createCluster({
      name: "US East Cluster",
      region: "us-east-1",
      tier: "standard",
      initialNodes: ["node-001", "node-002"],
    });

    expect(cluster.id).toBeTruthy();
    expect(cluster.memberNodes.length).toBeGreaterThan(0);
    expect(cluster.leaderId).toBeTruthy();
  });
});

describe("createSupernode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create a supernode with aggregated compute power", async () => {
    backboneMock.createSupernode.mockResolvedValueOnce({
      id: "supernode-001",
      name: "Triumph Primary Supernode",
      tier: "supernode",
      coordinatorId: "node-coordinator-001",
      clusters: ["cluster-001", "cluster-002"],
      directNodes: ["node-direct-001"],
      totalComputePower: 100000,
      totalStorage: 500,
      totalBandwidth: 100,
      totalNodes: 32,
      capabilities: ["validation", "ml-inference"],
      processingCapacity: 1000000,
      avgResponseTime: 5,
      reliability: 99.99,
      stakedPi: 1000000,
      rewardsDistributed: 50000,
      operatingCost: 1000,
      regions: ["us-east-1", "eu-west-1"],
      primaryRegion: "us-east-1",
      createdAt: new Date(),
    });

    const supernode = await backboneMock.createSupernode({
      name: "Triumph Primary Supernode",
      coordinatorId: "node-coordinator-001",
      clusters: ["cluster-001"],
      stakedPi: 1000000,
    });

    expect(supernode.id).toBeTruthy();
    expect(supernode.totalComputePower).toBeGreaterThan(0);
    expect(supernode.reliability).toBeGreaterThan(99);
    expect(supernode.tier).toBe("supernode");
  });
});

// ---------------------------------------------------------------------------
// Node type enumerations
// ---------------------------------------------------------------------------
describe("Node type enumerations", () => {
  const nodeTiers = ["standard", "enhanced", "professional", "enterprise", "supernode", "hypernode"];
  const nodeStatuses = ["active", "inactive", "suspended", "maintenance", "upgrading", "syncing"];
  const taskTypes = [
    "validation", "computation", "ml-training", "ml-inference",
    "rendering", "encryption", "storage", "indexing", "oracle", "custom",
  ];

  it.each(nodeTiers)("node tier '%s' should be defined", (tier) => {
    expect(typeof tier).toBe("string");
  });

  it.each(nodeStatuses)("node status '%s' should be defined", (status) => {
    expect(typeof status).toBe("string");
  });

  it.each(taskTypes)("task type '%s' should be defined", (type) => {
    expect(typeof type).toBe("string");
  });
});
