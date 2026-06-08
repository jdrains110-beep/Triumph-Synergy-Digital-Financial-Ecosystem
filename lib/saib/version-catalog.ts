export type SaibVersionKey =
  | "v1"
  | "v2"
  | "v3"
  | "v4"
  | "v5"
  | "v6"
  | "v7"
  | "v8"
  | "v9"
  | "v10";

export type CapabilityProbe = {
  name: string;
  endpoint: string;
  description: string;
};

export type SaibVersionSpec = {
  key: SaibVersionKey;
  title: string;
  mission: string;
  capabilities: CapabilityProbe[];
};

export const SAIB_VERSION_CATALOG: Record<SaibVersionKey, SaibVersionSpec> = {
  v1: {
    key: "v1",
    title: "Foundation Defense Layer",
    mission: "Core defense visibility and baseline guardian telemetry.",
    capabilities: [
      {
        name: "Network Monitoring",
        endpoint: "/api/saib/network-monitoring",
        description: "Signal monitoring, anomaly snapshots, and health signals.",
      },
      {
        name: "Sentinel Guardian",
        endpoint: "/api/saib/sentinel",
        description: "Guardian summary and active threat posture.",
      },
    ],
  },
  v2: {
    key: "v2",
    title: "Warp + Mesh Coordination",
    mission: "Distributed SAIB coordination with mesh and quantum observability.",
    capabilities: [
      {
        name: "Mesh Stats",
        endpoint: "/api/saib/mesh",
        description: "Peer mesh data and distributed gossip heartbeat.",
      },
      {
        name: "Quantum Core",
        endpoint: "/api/saib/quantum-core",
        description: "Quantum-core probes, loophole scan, and world-state sensors.",
      },
    ],
  },
  v3: {
    key: "v3",
    title: "Connector Intelligence",
    mission: "Cross-service orchestration for data, regions, and knowledge.",
    capabilities: [
      {
        name: "Knowledge Feed",
        endpoint: "/api/saib/knowledge",
        description: "Knowledge ingestion and ecosystem intelligence feed.",
      },
      {
        name: "Region Intelligence",
        endpoint: "/api/saib/region",
        description: "Regional telemetry, language, and user-flow awareness.",
      },
    ],
  },
  v4: {
    key: "v4",
    title: "Apex Control",
    mission: "Control-plane insights and enforcement posture across the ecosystem.",
    capabilities: [
      {
        name: "Dashboard Stats",
        endpoint: "/api/saib/dashboard-stats",
        description: "Aggregated SAIB KPI telemetry for operational awareness.",
      },
      {
        name: "Enforcement Engine",
        endpoint: "/api/saib/enforce",
        description: "Policy enforcement status and response-tier controls.",
      },
    ],
  },
  v5: {
    key: "v5",
    title: "Autonomous Executor",
    mission: "Self-healing operational intelligence with predictive execution.",
    capabilities: [
      {
        name: "Operational Status",
        endpoint: "/api/saib/dashboard-stats",
        description: "Live v5 dashboard metrics and runtime telemetry.",
      },
      {
        name: "Sovereign Omega",
        endpoint: "/api/saib/omega",
        description: "Omega core status proxy and sovereign mode observability.",
      },
    ],
  },
  v6: {
    key: "v6",
    title: "Compliance + Security Orchestration",
    mission: "Webhook and sovereignty workflow orchestration at platform scale.",
    capabilities: [
      {
        name: "Security Webhook",
        endpoint: "/api/saib/security-webhook",
        description: "Signed webhook verification and security event processing.",
      },
      {
        name: "Sovereignty Rights",
        endpoint: "/api/saib/gcv/sustainability",
        description: "Public sustainability and compliance telemetry pipeline.",
      },
    ],
  },
  v7: {
    key: "v7",
    title: "INTREPID Public Intelligence",
    mission: "Public-safe unified status across lattice, blockchain, and dispatch.",
    capabilities: [
      {
        name: "INTREPID Status",
        endpoint: "/api/saib/v7",
        description: "Unified read-only status across lattice, Pi, dispatch, and guardian.",
      },
      {
        name: "Pi Learn Core",
        endpoint: "/api/saib/pi/learn",
        description: "Pi learning and knowledge-path telemetry endpoints.",
      },
    ],
  },
  v8: {
    key: "v8",
    title: "Sovereign Mode",
    mission: "Debt freedom protection + omnipresent ecosystem coverage.",
    capabilities: [
      {
        name: "Debt Freedom Protection",
        endpoint: "/api/saib/protect?userId=probe_user",
        description: "Enrollment and live protection state for sovereign guardian coverage.",
      },
      {
        name: "Omnipresence Coverage",
        endpoint: "/api/saib/omnipresence",
        description: "Coverage scan across internal and external ecosystem services.",
      },
      {
        name: "LLM Provisioning",
        endpoint: "/api/saib/llm/provision",
        description: "Language model readiness for sovereign assistant capabilities.",
      },
    ],
  },
  v9: {
    key: "v9",
    title: "Omni-Master Interaction",
    mission: "Autonomous multi-language SAIB interaction and guided execution.",
    capabilities: [
      {
        name: "Interaction Engine",
        endpoint: "/api/saib/v7",
        description: "Public interaction intelligence layer and sovereign status synthesis.",
      },
      {
        name: "Pi Action Engine",
        endpoint: "/api/saib/pi/action",
        description: "Actionable Pi workflows and execution signaling.",
      },
    ],
  },
  v10: {
    key: "v10",
    title: "Sovereign Nano Governance",
    mission: "Validator governance, byzantine resilience, and mutation safety.",
    capabilities: [
      {
        name: "Mesh Governance Health",
        endpoint: "/api/saib/mesh",
        description: "Distributed mesh quorum and validator heartbeat signals.",
      },
      {
        name: "Quantum Governance Core",
        endpoint: "/api/saib/quantum-core",
        description: "Mutation safety, consensus context, and quantum guard telemetry.",
      },
    ],
  },
};

export const SAIB_VERSION_ORDER: SaibVersionKey[] = [
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "v6",
  "v7",
  "v8",
  "v9",
  "v10",
];
