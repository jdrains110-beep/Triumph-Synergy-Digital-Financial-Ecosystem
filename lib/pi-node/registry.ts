import { z } from "zod";
import type { PiNode, PiNodeRegistry, PiNodeSummary } from "@/types/pi-node";

export const PI_NODE_ROOT_PUBLIC_KEY =
  "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

export const PI_NODE_TCP_PORTS = Array.from({ length: 10 }, (_, index) =>
  Number(31400 + index)
);

const nodeInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  publicKey: z.string().min(1),
  host: z.string().min(1),
  ports: z.array(z.number().int()).nonempty(),
  role: z.enum(["root", "peer"]).optional(),
  region: z.string().optional(),
});

const envRegistrySchema = z.object({
  nodes: z.array(nodeInputSchema),
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

function buildRootNode(): PiNode {
  const host = process.env.PI_NODE_ROOT_HOST || "";
  const ports = parseEnvPorts();

  return {
    id: "pi-node-root",
    name: "Triumph Synergy Pi Node",
    publicKey: PI_NODE_ROOT_PUBLIC_KEY,
    host,
    ports,
    role: "root",
    region: process.env.PI_NODE_ROOT_REGION || undefined,
    status: host ? "configured" : "unconfigured",
  };
}

function parseEnvNodes(): PiNode[] {
  const raw = process.env.PI_NODE_REGISTRY_JSON;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = Array.isArray(parsed) ? { nodes: parsed } : parsed;
    const result = envRegistrySchema.safeParse(normalized);

    if (!result.success) {
      return [];
    }

    return result.data.nodes.map((node) => ({
      ...node,
      ports: normalizePorts(node.ports),
      role: node.role ?? "peer",
      status: "configured",
    }));
  } catch (error) {
    console.error("Failed to parse PI_NODE_REGISTRY_JSON:", error);
    return [];
  }
}

function mergeNodes(nodes: PiNode[]): PiNode[] {
  const seen = new Map<string, PiNode>();

  nodes.forEach((node) => {
    const key = node.id || node.publicKey;
    seen.set(key, node);
  });

  return Array.from(seen.values());
}

const runtimePorts = parseEnvPorts();
// In-memory registry is ephemeral in serverless environments.
// Use PI_NODE_REGISTRY_JSON to provide a durable baseline.
let runtimeNodes: PiNode[] = mergeNodes([buildRootNode(), ...parseEnvNodes()]);

export function getPiNodeRegistry(): PiNodeRegistry {
  return {
    rootPublicKey: PI_NODE_ROOT_PUBLIC_KEY,
    ports: runtimePorts,
    nodes: runtimeNodes,
    updatedAt: new Date().toISOString(),
  };
}

export function getPiNodeSummary(): PiNodeSummary {
  const configured = runtimeNodes.filter((node) => node.status === "configured");
  const unconfigured = runtimeNodes.filter(
    (node) => node.status === "unconfigured"
  );

  return {
    total: runtimeNodes.length,
    configured: configured.length,
    unconfigured: unconfigured.length,
    ports: runtimePorts,
    rootPublicKey: PI_NODE_ROOT_PUBLIC_KEY,
  };
}

export function registerPiNode(input: unknown): {
  ok: boolean;
  message: string;
  node?: PiNode;
} {
  const result = nodeInputSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, message: "Invalid node payload" };
  }

  const node = result.data;
  const normalizedPorts = normalizePorts(node.ports);

  if (!normalizedPorts.every((port) => runtimePorts.includes(port))) {
    return {
      ok: false,
      message: "Node ports must be within allowed Pi node ports",
    };
  }

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
  };

  runtimeNodes = mergeNodes([
    ...runtimeNodes.filter((existing) => existing.id !== node.id),
    newNode,
  ]);

  return { ok: true, message: "Node registered", node: newNode };
}

export function removePiNode(nodeId: string): boolean {
  const nextNodes = runtimeNodes.filter((node) => node.id !== nodeId);
  const changed = nextNodes.length !== runtimeNodes.length;
  runtimeNodes = nextNodes;
  return changed;
}
