import { NextResponse, type NextRequest } from "next/server";
import {
  getPiNodeRegistry,
  getPiNodeSummary,
  registerPiNode,
  registerSuperNode,
  removePiNode,
  upgradeToSupernode,
  updateNodeStatus,
  getNodeById,
  PI_NODE_ROOT_PUBLIC_KEY,
  SUPPORTED_DOMAINS,
} from "@/lib/pi-node/registry";
import { verifyPiNodeSignature } from "@/lib/pi-node/crypto";

type RegistryAction = "register" | "remove" | "register_supernode" | "upgrade_supernode" | "update_status" | "get_node";

type RegistryRequest = {
  action: RegistryAction;
  node?: unknown;
  supernode?: unknown;
  nodeId?: string;
  stakingAmount?: number;
  status?: string;
  message?: string;
  signature?: string;
};

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    const entries = keys.map(
      (key) => `"${key}":${stableStringify(record[key])}`
    );
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  
  if (format === "summary") {
    return NextResponse.json({
      summary: getPiNodeSummary(),
      domains: SUPPORTED_DOMAINS,
      timestamp: new Date().toISOString(),
    });
  }
  
  return NextResponse.json({
    ...getPiNodeRegistry(),
    domains: SUPPORTED_DOMAINS,
    piAppStudio: {
      appId: "triumph-synergy",
      mainnetApp: "triumph-synergy.vercel.app",
      mainnetDev: "triumphsynergy0576.pinet.com",
      testnetApp: "triumph-synergy-testnet.vercel.app",
      testnetDev: "triumphsynergy1991.pinet.com",
    },
  });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as RegistryRequest;
  const { action, node, supernode, nodeId, stakingAmount, status, message, signature } = payload;

  const validActions: RegistryAction[] = [
    "register", "remove", "register_supernode", "upgrade_supernode", "update_status", "get_node"
  ];

  if (!action || !validActions.includes(action)) {
    return NextResponse.json(
      { error: "Invalid action", validActions },
      { status: 400 }
    );
  }

  // Get node info doesn't require signature
  if (action === "get_node") {
    if (!nodeId) {
      return NextResponse.json({ error: "nodeId required" }, { status: 400 });
    }
    const foundNode = getNodeById(nodeId);
    if (!foundNode) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }
    return NextResponse.json({ node: foundNode });
  }

  // All other actions require signature verification
  if (!message || !signature) {
    return NextResponse.json(
      { error: "Signature and message are required for this action" },
      { status: 400 }
    );
  }

  const verified = verifyPiNodeSignature({
    publicKey: PI_NODE_ROOT_PUBLIC_KEY,
    message,
    signature,
  });

  if (!verified) {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );
  }

  // Handle different actions
  switch (action) {
    case "register": {
      const result = registerPiNode(node);
      return NextResponse.json({
        ...result,
        registry: getPiNodeRegistry(),
      });
    }

    case "register_supernode": {
      const result = registerSuperNode(supernode || node);
      return NextResponse.json({
        ...result,
        registry: getPiNodeRegistry(),
      });
    }

    case "upgrade_supernode": {
      if (!nodeId || typeof stakingAmount !== "number") {
        return NextResponse.json(
          { error: "nodeId and stakingAmount required for upgrade" },
          { status: 400 }
        );
      }
      const result = upgradeToSupernode(nodeId, stakingAmount);
      return NextResponse.json({
        ...result,
        registry: getPiNodeRegistry(),
      });
    }

    case "update_status": {
      if (!nodeId || !status) {
        return NextResponse.json(
          { error: "nodeId and status required" },
          { status: 400 }
        );
      }
      const validStatuses = ["unconfigured", "configured", "online", "offline", "syncing"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status", validStatuses },
          { status: 400 }
        );
      }
      const updated = updateNodeStatus(nodeId, status as any);
      return NextResponse.json({
        ok: updated,
        message: updated ? "Status updated" : "Node not found",
        registry: getPiNodeRegistry(),
      });
    }

    case "remove": {
      if (!nodeId) {
        return NextResponse.json(
          { error: "nodeId is required for remove" },
          { status: 400 }
        );
      }
      const removed = removePiNode(nodeId);
      return NextResponse.json({
        ok: removed,
        message: removed ? "Node removed" : "Node not found",
        registry: getPiNodeRegistry(),
      });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
