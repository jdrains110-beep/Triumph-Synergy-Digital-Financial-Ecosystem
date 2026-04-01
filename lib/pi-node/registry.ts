import { z } from "zod";
import type { PiNode, PiNodeRegistry, PiNodeSummary, PiSuperNode, PiNodeCapabilities } from "@/types/pi-node";

export const PI_NODE_ROOT_PUBLIC_KEY =
  "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

export const PI_NODE_TCP_PORTS = Array.from({ length: 10 }, (_, index) =>
  Number(31400 + index)
);

// Supported domains for Pi App Studio integration
export const SUPPORTED_DOMAINS = {
  mainnet: {
    app: "triumph-synergy.vercel.app",
    dev: "triumphsynergy0576.pinet.com",
    alt: "triumphsynergy7386.pinet.com",
  },
  testnet: {
    app: "triumph-synergy-testnet.vercel.app",
    dev: "triumphsynergy1991.pinet.com",
  },
};

const capabilitiesSchema = z.object({
  consensus: z.boolean().optional(),
  validation: z.boolean().optional(),
  archival: z.boolean().optional(),
  relaying: z.boolean().optional(),
  staking: z.boolean().optional(),
  hosting: z.boolean().optional(),
  payments: z.boolean().optional(),
}).optional();

const nodeInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  publicKey: z.string().min(1),
  host: z.string().min(1),
  ports: z.array(z.number().int()).nonempty(),
  role: z.enum(["root", "peer", "supernode", "validator", "archive"]).optional(),
  region: z.string().optional(),
  capabilities: capabilitiesSchema,
  version: z.string().optional(),
});

const supernodeInputSchema = nodeInputSchema.extend({
  role: z.literal("supernode"),
  stakingAmount: z.number().min(0),
  delegators: z.number().min(0).optional(),
  rewardRate: z.number().min(0).optional(),
});

const envRegistrySchema = z.object({
  nodes: z.array(nodeInputSchema),
  supernodes: z.array(supernodeInputSchema).optional(),
});

function normalizePorts(ports: number[]): number[] {
  const normalized = ports
    .filter((port) => Number.isInteger(port))
    .map((port) => Number(port))
    .filter((port) => port > 0);

  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function parseEnvPorts(): number[] {
  const raw = process.env.PI_NODE_PORTS;
  if (!raw) {
    return PI_NODE_TCP_PORTS;
  }

  const ports = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => !Number.isNaN(value));

  const normalized = normalizePorts(ports);
  return normalized.length > 0 ? normalized : PI_NODE_TCP_PORTS;
}

function getDefaultCapabilities(role: string): PiNodeCapabilities {
  const base: PiNodeCapabilities = {
    consensus: false,
    validation: false,
    archival: false,
    relaying: true,
    staking: false,
    hosting: false,
    payments: true,
  };

  switch (role) {
    case "root":
      return { ...base, consensus: true, validation: true, hosting: true };
    case "supernode":
      return { ...base, consensus: true, validation: true, staking: true, hosting: true, archival: true };
    case "validator":
      return { ...base, consensus: true, validation: true };
    case "archive":
      return { ...base, archival: true };
    default:
      return base;
  }
}

function buildRootNode(): PiNode {
  const host = process.env.PI_NODE_ROOT_HOST || "triumph-synergy.vercel.app";
  const ports = parseEnvPorts();

  return {
    id: "pi-node-root",
    name: "Triumph Synergy Pi Node",
    publicKey: PI_NODE_ROOT_PUBLIC_KEY,
    host,
    ports,
    role: "root",
    region: process.env.PI_NODE_ROOT_REGION || "us-east-1",
    status: host ? "configured" : "unconfigured",
    capabilities: getDefaultCapabilities("root"),
    version: "2.0.0",
  };
}

function parseEnvNodes(): { nodes: PiNode[]; supernodes: PiSuperNode[] } {
  const raw = process.env.PI_NODE_REGISTRY_JSON;
  if (!raw) {
    return { nodes: [], supernodes: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = Array.isArray(parsed) ? { nodes: parsed } : parsed;
    const result = envRegistrySchema.safeParse(normalized);

    if (!result.success) {
      return { nodes: [], supernodes: [] };
    }

    const nodes = result.data.nodes
      .filter((n) => n.role !== "supernode")
      .map((node) => ({
        ...node,
        ports: normalizePorts(node.ports),
        role: node.role ?? "peer",
        status: "configured" as const,
        capabilities: node.capabilities || getDefaultCapabilities(node.role || "peer"),
      }));

    const supernodes = (result.data.supernodes || []).map((sn) => ({
      ...sn,
      ports: normalizePorts(sn.ports),
      role: "supernode" as const,
      status: "configured" as const,
      capabilities: sn.capabilities || getDefaultCapabilities("supernode"),
      delegators: sn.delegators || 0,
      rewardRate: sn.rewardRate || 0,
      slashingHistory: [],
      governanceVotes: 0,
      networkContribution: 0,
    }));

    return { nodes, supernodes };
  } catch (error) {
    console.error("Failed to parse PI_NODE_REGISTRY_JSON:", error);
    return { nodes: [], supernodes: [] };
  }
}

function mergeNodes<T extends PiNode>(nodes: T[]): T[] {
  const seen = new Map<string, T>();
  nodes.forEach((node) => {
    const key = node.id || node.publicKey;
    seen.set(key, node);
  });
  return Array.from(seen.values());
}

const runtimePorts = parseEnvPorts();
const parsedEnv = parseEnvNodes();
let runtimeNodes: PiNode[] = mergeNodes([buildRootNode(), ...parsedEnv.nodes]);
let runtimeSupernodes: PiSuperNode[] = mergeNodes(parsedEnv.supernodes);

export function getPiNodeRegistry(): PiNodeRegistry {
  const onlineNodes = runtimeNodes.filter((n) => n.status === "online" || n.status === "configured");
  const onlineSupernodes = runtimeSupernodes.filter((n) => n.status === "online" || n.status === "configured");

  return {
    rootPublicKey: PI_NODE_ROOT_PUBLIC_KEY,
    ports: runtimePorts,
    nodes: runtimeNodes,
    supernodes: runtimeSupernodes,
    networkStats: {
      totalNodes: runtimeNodes.length,
      activeNodes: onlineNodes.length,
      totalSupernodes: runtimeSupernodes.length,
      activeSupernodes: onlineSupernodes.length,
      lastBlockTime: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getPiNodeSummary(): PiNodeSummary {
  const configured = runtimeNodes.filter((node) => node.status === "configured");
  const unconfigured = runtimeNodes.filter((node) => node.status === "unconfigured");
  const online = runtimeNodes.filter((node) => node.status === "online");

  const totalNodes = runtimeNodes.length + runtimeSupernodes.length;
  const healthyNodes = configured.length + online.length + runtimeSupernodes.length;
  const healthRatio = totalNodes > 0 ? healthyNodes / totalNodes : 0;

  return {
    total: totalNodes,
    configured: configured.length,
    unconfigured: unconfigured.length,
    online: online.length,
    supernodes: runtimeSupernodes.length,
    ports: runtimePorts,
    rootPublicKey: PI_NODE_ROOT_PUBLIC_KEY,
    networkHealth: healthRatio > 0.8 ? "healthy" : healthRatio > 0.5 ? "degraded" : "critical",
  };
}

export function registerPiNode(input: unknown): {
  ok: boolean;
  message: string;
  node?: PiNode;
} {
  const result = nodeInputSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: "Invalid node payload: " + result.error.message };
  }

  const node = result.data;
  const normalizedPorts = normalizePorts(node.ports);

  const newNode: PiNode = {
    id: node.id,
    name: node.name,
    publicKey: node.publicKey,
    host: node.host,
    ports: normalizedPorts,
    role: node.role ?? "peer",
    region: node.region,
    status: "configured",
    lastSeen: new Date().toISOString(),
    capabilities: node.capabilities || getDefaultCapabilities(node.role || "peer"),
    version: node.version || "1.0.0",
  };

  runtimeNodes = mergeNodes([
    ...runtimeNodes.filter((existing) => existing.id !== node.id),
    newNode,
  ]);

  return { ok: true, message: "Node registered successfully", node: newNode };
}

export function registerSuperNode(input: unknown): {
  ok: boolean;
  message: string;
  supernode?: PiSuperNode;
} {
  const result = supernodeInputSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: "Invalid supernode payload: " + result.error.message };
  }

  const sn = result.data;
  const normalizedPorts = normalizePorts(sn.ports);

  const newSupernode: PiSuperNode = {
    id: sn.id,
    name: sn.name,
    publicKey: sn.publicKey,
    host: sn.host,
    ports: normalizedPorts,
    role: "supernode",
    region: sn.region,
    status: "configured",
    lastSeen: new Date().toISOString(),
    capabilities: sn.capabilities || getDefaultCapabilities("supernode"),
    version: sn.version || "2.0.0",
    stakingAmount: sn.stakingAmount,
    delegators: sn.delegators || 0,
    rewardRate: sn.rewardRate || 0,
    slashingHistory: [],
    governanceVotes: 0,
    networkContribution: 0,
  };

  runtimeSupernodes = mergeNodes([
    ...runtimeSupernodes.filter((existing) => existing.id !== sn.id),
    newSupernode,
  ]);

  return { ok: true, message: "Supernode registered successfully", supernode: newSupernode };
}

export function upgradeToSupernode(nodeId: string, stakingAmount: number): {
  ok: boolean;
  message: string;
  supernode?: PiSuperNode;
} {
  const existingNode = runtimeNodes.find((n) => n.id === nodeId);
  if (!existingNode) {
    return { ok: false, message: "Node not found" };
  }

  if (stakingAmount < 1000) {
    return { ok: false, message: "Minimum staking amount for supernode is 1000 Pi" };
  }

  const supernode: PiSuperNode = {
    ...existingNode,
    role: "supernode",
    capabilities: getDefaultCapabilities("supernode"),
    stakingAmount,
    delegators: 0,
    rewardRate: 0.05, // 5% default reward rate
    slashingHistory: [],
    governanceVotes: 0,
    networkContribution: 0,
  };

  // Remove from regular nodes, add to supernodes
  runtimeNodes = runtimeNodes.filter((n) => n.id !== nodeId);
  runtimeSupernodes = mergeNodes([...runtimeSupernodes, supernode]);

  return { ok: true, message: "Node upgraded to supernode", supernode };
}

export function removePiNode(nodeId: string): boolean {
  const nextNodes = runtimeNodes.filter((node) => node.id !== nodeId);
  const nextSupernodes = runtimeSupernodes.filter((node) => node.id !== nodeId);
  
  const changed = 
    nextNodes.length !== runtimeNodes.length || 
    nextSupernodes.length !== runtimeSupernodes.length;
  
  runtimeNodes = nextNodes;
  runtimeSupernodes = nextSupernodes;
  return changed;
}

export function updateNodeStatus(nodeId: string, status: PiNode["status"]): boolean {
  let found = false;
  
  runtimeNodes = runtimeNodes.map((node) => {
    if (node.id === nodeId) {
      found = true;
      return { ...node, status, lastSeen: new Date().toISOString() };
    }
    return node;
  });

  if (!found) {
    runtimeSupernodes = runtimeSupernodes.map((node) => {
      if (node.id === nodeId) {
        found = true;
        return { ...node, status, lastSeen: new Date().toISOString() };
      }
      return node;
    });
  }

  return found;
}

export function getNodeById(nodeId: string): PiNode | PiSuperNode | null {
  return (
    runtimeNodes.find((n) => n.id === nodeId) ||
    runtimeSupernodes.find((n) => n.id === nodeId) ||
    null
  );
}
