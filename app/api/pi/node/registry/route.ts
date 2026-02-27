import { NextResponse, type NextRequest } from "next/server";
import {
  getPiNodeRegistry,
  registerPiNode,
  removePiNode,
  PI_NODE_ROOT_PUBLIC_KEY,
} from "@/lib/pi-node/registry";
import { verifyPiNodeSignature } from "@/lib/pi-node/crypto";

type RegistryAction = "register" | "remove";

type RegistryRequest = {
  action: RegistryAction;
  node?: unknown;
  nodeId?: string;
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

export async function GET() {
  return NextResponse.json(getPiNodeRegistry());
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as RegistryRequest;
  const { action, node, nodeId, message, signature } = payload;

  if (!action || !["register", "remove"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  }

  if (!message || !signature) {
    return NextResponse.json(
      { error: "Signature and message are required" },
      { status: 400 }
    );
  }

  const expectedMessage = stableStringify({ action, node, nodeId });

  if (message !== expectedMessage) {
    return NextResponse.json(
      { error: "Message does not match payload", expectedMessage },
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

  if (action === "register") {
    const result = registerPiNode(node);
    return NextResponse.json({
      ...result,
      registry: getPiNodeRegistry(),
    });
  }

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
