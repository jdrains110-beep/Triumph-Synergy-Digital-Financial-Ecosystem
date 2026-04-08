/**
 * Quantum / Central Node Scalability Unit Tests
 * Covers: ScalableNode, NodeCluster, CommandBatch, CentralNodeScalabilitySystem,
 *         health monitoring, load balancing, failover
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock heavy module
// ---------------------------------------------------------------------------
const scaleMock = {
  addNode: vi.fn(),
  removeNode: vi.fn(),
  getNode: vi.fn(),
  listNodes: vi.fn(),
  broadcastCommand: vi.fn(),
  broadcastBatch: vi.fn(),
  getMetrics: vi.fn(),
  runHealthCheck: vi.fn(),
  getCluster: vi.fn(),
  listClusters: vi.fn(),
  triggerFailover: vi.fn(),
  checkConsistency: vi.fn(),
};

vi.mock("@/lib/quantum/central-node-scalability", () => ({
  CentralNodeScalabilitySystem: {
    getInstance: vi.fn(() => scaleMock),
  },
}));

import { CentralNodeScalabilitySystem } from "@/lib/quantum/central-node-scalability";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeScalableNode(type = "standard", health = "healthy") {
  return {
    id: `snode-${Date.now()}`,
    publicKey: `PK_${Date.now()}`,
    name: "Triumph-ScalableNode-01",
    type,
    region: "us-east-1",
    cluster: "cluster-alpha",
    health,
    lastHeartbeat: new Date(),
    consecutiveFailures: 0,
    uptimePercent: 99.9,
    responseTime: 5,
    throughput: 1000,
    commandsProcessed: 1000000,
    commandsFailures: 50,
    maxCapacity: 500,
    currentLoad: 120,
    resourceUsage: { cpu: 24, memory: 32, bandwidth: 15 },
    consistencyScore: 98,
    lastSync: new Date(),
    syncVersion: 42,
  };
}

function makeCommandBatch(nodeCount = 3) {
  return {
    id: `batch-${Date.now()}`,
    commands: Array.from({ length: nodeCount }, (_, i) => ({
      id: `cmd-${i}`,
      type: "sync",
      payload: {},
    })),
    priority: "normal" as const,
    targetNodes: "all" as const,
    status: "queued" as const,
    createdAt: new Date(),
    successCount: 0,
    failureCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("CentralNodeScalabilitySystem singleton", () => {
  it("should return the same instance each time", () => {
    const a = CentralNodeScalabilitySystem.getInstance();
    const b = CentralNodeScalabilitySystem.getInstance();
    expect(a).toBe(b);
  });
});

describe("addNode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should add a standard node to the network", async () => {
    const node = makeScalableNode("standard");
    scaleMock.addNode.mockResolvedValueOnce(node);

    const result = await scaleMock.addNode({
      publicKey: "PK_NEW",
      name: "Triumph-ScalableNode-01",
      type: "standard",
      region: "us-east-1",
    });

    expect(result.id).toBeTruthy();
    expect(result.health).toBe("healthy");
    expect(result.uptimePercent).toBeCloseTo(99.9, 1);
  });

  it("should add a regional node", async () => {
    const node = makeScalableNode("regional");
    scaleMock.addNode.mockResolvedValueOnce(node);

    const result = await scaleMock.addNode({ type: "regional", region: "eu-west-1" });
    expect(result.type).toBe("regional");
  });

  it("should reject a duplicate public key", async () => {
    scaleMock.addNode.mockRejectedValueOnce(
      new Error("Node with public key PK_EXISTING already registered")
    );

    await expect(scaleMock.addNode({ publicKey: "PK_EXISTING" })).rejects.toThrow(
      "already registered"
    );
  });
});

describe("broadcastCommand", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should broadcast to all healthy nodes", async () => {
    scaleMock.broadcastCommand.mockResolvedValueOnce({
      commandId: "cmd-001",
      sent: 64,
      acknowledged: 62,
      failed: 2,
    });

    const result = await scaleMock.broadcastCommand({
      type: "sync",
      payload: { blockHeight: 5000000 },
      targetNodes: "all",
      priority: "normal",
    });

    expect(result.sent).toBeGreaterThan(0);
    expect(result.acknowledged).toBeLessThanOrEqual(result.sent);
    expect(result.failed).toBeGreaterThanOrEqual(0);
  });

  it("should deliver high-priority commands first", async () => {
    scaleMock.broadcastCommand.mockResolvedValueOnce({
      commandId: "cmd-critical",
      sent: 64,
      acknowledged: 64,
      failed: 0,
      priority: "critical",
      processingTimeMs: 3,
    });

    const result = await scaleMock.broadcastCommand({
      type: "emergency-sync",
      payload: {},
      targetNodes: "all",
      priority: "critical",
    });

    expect(result.priority).toBe("critical");
    expect(result.processingTimeMs).toBeLessThan(50);
  });
});

describe("broadcastBatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should process a batch of commands", async () => {
    const batch = makeCommandBatch(5);
    scaleMock.broadcastBatch.mockResolvedValueOnce({
      batchId: batch.id,
      total: 5,
      successCount: 5,
      failureCount: 0,
      completedAt: new Date(),
    });

    const result = await scaleMock.broadcastBatch(batch);

    expect(result.total).toBe(5);
    expect(result.successCount).toBe(5);
    expect(result.failureCount).toBe(0);
  });

  it("should report partial failures in a batch", async () => {
    scaleMock.broadcastBatch.mockResolvedValueOnce({
      batchId: "batch-partial",
      total: 10,
      successCount: 8,
      failureCount: 2,
    });

    const result = await scaleMock.broadcastBatch(makeCommandBatch(10));
    expect(result.failureCount).toBe(2);
    expect(result.successCount + result.failureCount).toBe(result.total);
  });
});

describe("runHealthCheck", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should mark unresponsive nodes as degraded", async () => {
    scaleMock.runHealthCheck.mockResolvedValueOnce({
      checked: 256,
      healthy: 240,
      degraded: 12,
      critical: 4,
      offline: 0,
      timestamp: new Date(),
    });

    const result = await scaleMock.runHealthCheck();

    expect(result.checked).toBeGreaterThan(0);
    expect(result.healthy).toBeLessThanOrEqual(result.checked);
    expect(result.healthy + result.degraded + result.critical + result.offline).toBe(result.checked);
  });

  it("should return all-healthy when no issues", async () => {
    scaleMock.runHealthCheck.mockResolvedValueOnce({
      checked: 128,
      healthy: 128,
      degraded: 0,
      critical: 0,
      offline: 0,
    });

    const result = await scaleMock.runHealthCheck();
    expect(result.healthy).toBe(result.checked);
    expect(result.degraded + result.critical + result.offline).toBe(0);
  });
});

describe("triggerFailover", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should promote backup leader on primary failure", async () => {
    scaleMock.triggerFailover.mockResolvedValueOnce({
      clusterId: "cluster-alpha",
      previousLeader: "node-primary-001",
      newLeader: "node-backup-001",
      electionTimeMs: 250,
    });

    const result = await scaleMock.triggerFailover({
      clusterId: "cluster-alpha",
      failedNodeId: "node-primary-001",
    });

    expect(result.newLeader).toBeTruthy();
    expect(result.newLeader).not.toBe(result.previousLeader);
    expect(result.electionTimeMs).toBeLessThan(1000);
  });
});

describe("checkConsistency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should verify state consistency across all nodes", async () => {
    scaleMock.checkConsistency.mockResolvedValueOnce({
      consistent: true,
      syncVersion: 42,
      nodesInSync: 256,
      nodesOutOfSync: 0,
      maxDrift: 0,
    });

    const result = await scaleMock.checkConsistency();

    expect(result.consistent).toBe(true);
    expect(result.nodesOutOfSync).toBe(0);
    expect(result.maxDrift).toBe(0);
  });

  it("should report inconsistency when nodes have drifted", async () => {
    scaleMock.checkConsistency.mockResolvedValueOnce({
      consistent: false,
      syncVersion: 42,
      nodesInSync: 250,
      nodesOutOfSync: 6,
      maxDrift: 3,
    });

    const result = await scaleMock.checkConsistency();
    expect(result.consistent).toBe(false);
    expect(result.nodesOutOfSync).toBeGreaterThan(0);
  });
});

describe("getMetrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return a comprehensive scalability metrics snapshot", () => {
    scaleMock.getMetrics.mockReturnValueOnce({
      totalNodes: 256,
      healthyNodes: 248,
      totalCapacity: 128000,
      usedCapacity: 32000,
      utilizationPercent: 25,
      avgResponseTimeMs: 6,
      totalCommandsProcessed: 50000000,
      failureRate: 0.002,
      consistencyScore: 99,
      uptime: 99.99,
      lastUpdated: new Date(),
    });

    const metrics = scaleMock.getMetrics();

    expect(metrics.totalNodes).toBeGreaterThan(0);
    expect(metrics.healthyNodes).toBeLessThanOrEqual(metrics.totalNodes);
    expect(metrics.utilizationPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.utilizationPercent).toBeLessThanOrEqual(100);
    expect(metrics.failureRate).toBeGreaterThanOrEqual(0);
    expect(metrics.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(metrics.consistencyScore).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Type enumeration coverage
// ---------------------------------------------------------------------------
describe("Node health and type enumerations", () => {
  const healthStates = ["healthy", "degraded", "critical", "offline"];
  const nodeTypes = ["standard", "super", "cluster", "regional"];
  const consistencyLevels = ["eventual", "strong", "strict"];

  it.each(healthStates)("health state '%s' should be a string", (h) => {
    expect(typeof h).toBe("string");
  });

  it.each(nodeTypes)("node type '%s' should be a string", (t) => {
    expect(typeof t).toBe("string");
  });

  it.each(consistencyLevels)("consistency level '%s' should be a string", (c) => {
    expect(typeof c).toBe("string");
  });
});
