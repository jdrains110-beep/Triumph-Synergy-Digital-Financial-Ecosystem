export type PiNodeStatus = "unconfigured" | "configured" | "online" | "offline";

export type PiNodeRole = "root" | "peer";

export type PiNode = {
  id: string;
  name: string;
  publicKey: string;
  host: string;
  ports: number[];
  role: PiNodeRole;
  region?: string;
  status: PiNodeStatus;
  lastSeen?: string;
};

export type PiNodeRegistry = {
  rootPublicKey: string;
  ports: number[];
  nodes: PiNode[];
  updatedAt: string;
};

export type PiNodeSummary = {
  total: number;
  configured: number;
  unconfigured: number;
  ports: number[];
  rootPublicKey: string;
};
