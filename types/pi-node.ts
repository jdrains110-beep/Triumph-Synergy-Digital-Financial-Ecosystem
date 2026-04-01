export type PiNodeStatus = "unconfigured" | "configured" | "online" | "offline" | "syncing";

export type PiNodeRole = "root" | "peer" | "supernode" | "validator" | "archive";

export type PiNodeCapabilities = {
  consensus: boolean;      // Can participate in consensus
  validation: boolean;     // Can validate transactions
  archival: boolean;       // Stores full blockchain history
  relaying: boolean;       // Relays transactions to network
  staking: boolean;        // Supports staking
  hosting: boolean;        // Can host other apps/nodes
  payments: boolean;       // Can process payments
};

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
  capabilities?: PiNodeCapabilities;
  version?: string;
  uptime?: number;
  connectedPeers?: number;
  blockHeight?: number;
};

export type PiSuperNode = PiNode & {
  role: "supernode";
  stakingAmount: number;
  delegators: number;
  rewardRate: number;
  slashingHistory: number[];
  governanceVotes: number;
  networkContribution: number;
};

export type PiNodeRegistry = {
  rootPublicKey: string;
  ports: number[];
  nodes: PiNode[];
  supernodes: PiSuperNode[];
  networkStats: {
    totalNodes: number;
    activeNodes: number;
    totalSupernodes: number;
    activeSupernodes: number;
    networkHashrate?: string;
    lastBlockTime?: string;
  };
  updatedAt: string;
};

export type PiNodeSummary = {
  total: number;
  configured: number;
  unconfigured: number;
  online: number;
  supernodes: number;
  ports: number[];
  rootPublicKey: string;
  networkHealth: "healthy" | "degraded" | "critical";
};

export type PiNodeRegistrationRequest = {
  action: "register" | "remove" | "upgrade" | "downgrade";
  node?: Partial<PiNode>;
  supernode?: Partial<PiSuperNode>;
  nodeId?: string;
  message: string;
  signature: string;
};
