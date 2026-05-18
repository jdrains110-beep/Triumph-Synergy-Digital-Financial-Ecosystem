/**
 * Shared bearer-token check for the public<->Docker bridge endpoints.
 *
 * The same token is configured on the Docker Desktop pi-bridge-connector
 * service (PUBLIC_BRIDGE_TOKEN) and on each public site
 * (PUBLIC_BRIDGE_TOKEN env var).
 */

export function bridgeTokenOk(req: Request): boolean {
  const expected = (process.env.PUBLIC_BRIDGE_TOKEN || "").trim();
  if (!expected) return false; // bridge disabled until token is set
  const hdr = req.headers.get("authorization") || "";
  const got = hdr.toLowerCase().startsWith("bearer ")
    ? hdr.slice(7).trim()
    : "";
  if (!got || got.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}

export function nodeIdFrom(req: Request): string {
  return (req.headers.get("x-triumph-node-id") || "unknown").slice(0, 64);
}

export const BRIDGE_STATE_KEY = (nodeId: string) =>
  `triumph:bridge:node:${nodeId}:state`;
export const BRIDGE_STATE_TTL_S = 60;
export const BRIDGE_NODES_SET = "triumph:bridge:nodes";
export const BRIDGE_INGEST_CHANNEL = "triumph:bridge:ingest";
export const BRIDGE_COMMANDS_CHANNEL = (nodeId: string) =>
  `triumph:bridge:commands:${nodeId}`;
export const BRIDGE_COMMANDS_BROADCAST = "triumph:bridge:commands:*";
