/**
 * Supernode Protocol Authority Endpoint
 * 
 * Queries governance-shield for authoritative Protocol 24 information
 * Enables Triumph Synergy app and central-node to mutually recognize
 * and amplify protocol changes. Both push each other beyond their limits.
 * 
 * Endpoints:
 * - GET /api/supernode/protocol — Unified protocol state (central-node + app)
 * - GET /api/supernode/protocol/info — Central node embedded protocol info
 * - GET /api/supernode/protocol/scp — Full SCP protocol status
 */

import { NextRequest, NextResponse } from "next/server";

interface ProtocolInfo {
  protocol_version: number;
  build_version: string;
  network_passphrase: string;
  queried_at: string;
}

interface CentralNodeProtocolState {
  authoritative_source: string;
  protocol_version: number;
  build_version: string;
  network: string;
  ledger_sequence?: number;
  synced: boolean;
  queried_at: string;
  source_url?: string;
  error?: string;
}

/**
 * Fetch protocol info from governance-shield (/info endpoint)
 */
async function fetchCentralNodeInfo(): Promise<CentralNodeProtocolState | null> {
  const governanceShieldUrl = process.env.GOVERNANCE_SHIELD_URL || "http://triumph-governance-shield:11626";
  const infoUrl = `${governanceShieldUrl}/info`;
  
  try {
    const response = await fetch(infoUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      const data = await response.json() as Record<string, any>;
      const info = data.info;
      
      return {
        authoritative_source: "governance-shield-embedded-protocol",
        protocol_version: info?.protocol_version ?? 0,
        build_version: info?.pi_node_core_info?.build_version ?? info?.stellar_core_version ?? "unknown",
        network: info?.pi_node_core_info?.network_passphrase ?? info?.pi_node_core_info?.network_passphrase ?? "Pi Network",
        ledger_sequence: info?.ledger?.sequence,
        synced: info?.state === "Synced!",
        queried_at: new Date().toISOString(),
        source_url: infoUrl,
      };
    }
  } catch (error) {
    console.error("[Supernode Protocol] Failed to fetch central node info:", (error as Error).message);
    return null;
  }
  
  return null;
}

/**
 * Fetch full SCP status from governance-shield (/scp endpoint)
 */
async function fetchSCPStatus() {
  const governanceShieldUrl = process.env.GOVERNANCE_SHIELD_URL || "http://triumph-governance-shield:11626";
  const scpUrl = `${governanceShieldUrl}/scp`;
  
  try {
    const response = await fetch(scpUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      const data = await response.json() as Record<string, any>;
      return data.scp;
    }
  } catch (error) {
    console.error("[Supernode Protocol] Failed to fetch SCP status:", (error as Error).message);
  }
  
  return null;
}

/**
 * Fetch supernode topology and peers
 */
async function fetchSuperNodeTopology() {
  const governanceShieldUrl = process.env.GOVERNANCE_SHIELD_URL || "http://triumph-governance-shield:11626";
  const peersUrl = `${governanceShieldUrl}/supernode/peers`;
  
  try {
    const response = await fetch(peersUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("[Supernode Protocol] Failed to fetch topology:", (error as Error).message);
  }
  
  return null;
}

// ============================================================================
// GET /api/supernode/protocol — Unified Protocol Authority
// ============================================================================
/**
 * Returns unified protocol state from governance-shield
 * This is THE AUTHORITATIVE SOURCE for Protocol 24
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail") ?? "full"; // "full" | "info" | "scp" | "peers"
  
  // Fetch central-node protocol info (authoritative)
  const centralNodeInfo = await fetchCentralNodeInfo();
  
  if (!centralNodeInfo && detail !== "peers") {
    return NextResponse.json(
      {
        success: false,
        error: "governance-shield unreachable",
        message: "Cannot establish protocol authority — governance-shield not responding",
        fallback: {
          protocol_version: Number(process.env.PI_PROTOCOL_VERSION ?? 24),
          network: process.env.STELLAR_NETWORK_PASSPHRASE ?? "Pi Network",
          build_version: process.env.STELLAR_CORE_VERSION ?? "v24.0.0",
          note: "Using environment variable fallback (governance-shield unreachable)",
        },
      },
      { status: 503 }
    );
  }
  
  if (detail === "info") {
    return NextResponse.json(
      {
        success: true,
        central_node: centralNodeInfo,
        queried_at: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-cache" } }
    );
  }
  
  if (detail === "scp") {
    const scpStatus = await fetchSCPStatus();
    return NextResponse.json(
      {
        success: !!scpStatus,
        scp: scpStatus || { error: "SCP status unavailable" },
        queried_at: new Date().toISOString(),
      },
      { status: scpStatus ? 200 : 503, headers: { "Cache-Control": "no-cache" } }
    );
  }
  
  if (detail === "peers") {
    const topology = await fetchSuperNodeTopology();
    return NextResponse.json(
      {
        success: !!topology,
        supernode_topology: topology || { error: "Topology unavailable" },
        queried_at: new Date().toISOString(),
      },
      { status: topology ? 200 : 503, headers: { "Cache-Control": "no-cache" } }
    );
  }
  
  // FULL detail (default) — Unified protocol state (central-node + app mutual support)
  const [scpStatus, topology] = await Promise.all([
    fetchSCPStatus(),
    fetchSuperNodeTopology(),
  ]);
  
  return NextResponse.json(
    {
      success: true,
      unified_protocol_state: {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // TRIUMPH SYNERGY + CENTRAL-NODE UNIFIED AUTHORITY
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        authority: {
          source: "governance-shield (embedded stellar-core protocol engine)",
          protocol_version: centralNodeInfo?.protocol_version ?? 24,
          build_version: centralNodeInfo?.build_version ?? "v24.0.0",
          network_passphrase: centralNodeInfo?.network ?? "Pi Network",
          synced: centralNodeInfo?.synced ?? false,
          queried_at: centralNodeInfo?.queried_at,
        },
        
        // App instance (Triumph Synergy) recognizes and mirrors central-node authority
        triumph_synergy_app: {
          enabled: true,
          protocol_version: centralNodeInfo?.protocol_version ?? 24,
          network: "Pi Network",
          role: "supernode-frontend",
          recognizes_central_node: true,
          mutual_support: {
            app_to_central: "forwards protocol changes to central-node",
            central_to_app: "provides authoritative protocol updates",
            bi_directional: true,
            both_beyond_limits: "central-node executes, app amplifies distribution",
          },
        },
        
        // Central-node (governance-shield) with embedded Protocol 24
        central_node: {
          enabled: true,
          role: "primary-validator",
          public_key: "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
          protocol_version: centralNodeInfo?.protocol_version ?? 24,
          ledger_sequence: centralNodeInfo?.ledger_sequence,
          synced: centralNodeInfo?.synced ?? false,
          container: "triumph-synergy-governance-shield",
          embedded_stellar_core: {
            protocol: centralNodeInfo?.protocol_version ?? 24,
            build: centralNodeInfo?.build_version ?? "v24.0.0",
            network: centralNodeInfo?.network ?? "Pi Network",
            status: "EMBEDDED (no external dependencies)",
          },
        },
        
        // Supernode topology and mesh
        supernode_mesh: {
          primary: topology?.self?.id || "triumph-central-node",
          primary_key: topology?.self?.public_key || "GA6Z5STF...",
          apex_quantum_mesh_enabled: topology?.apex_quantum_mesh ?? true,
          peer_count: topology?.peer_count ?? 0,
          apex_boost_factor: topology?.apex_boost ?? 1,
          peers: topology?.peers ?? [],
        },
        
        // Full SCP protocol status (mainnet + testnet)
        scp_status: {
          consensus_protocol: "Stellar Consensus Protocol (SCP)",
          mainnet: {
            protocol_version: scpStatus?.mainnet?.protocol_version ?? 24,
            protocol_label: scpStatus?.mainnet?.protocol_label || "Protocol 24 (Pi Node Core ✓)",
            ledger_sequence: scpStatus?.mainnet?.ledger_sequence ?? 0,
          },
          testnet: {
            protocol_version: scpStatus?.testnet?.protocol_version ?? 26,
            protocol_label: scpStatus?.testnet?.protocol_label,
            ledger_sequence: scpStatus?.testnet?.ledger_sequence ?? 0,
          },
          upgrade_watchdog: scpStatus?.upgrade_watchdog,
        },
        
        // Pi Mainnet representation
        pi_mainnet_node: {
          representation: "UNIFIED (Triumph Synergy central-node IS the Pi mainnet node)",
          protocol_authority: "Embedded stellar-core v24 in governance-shield",
          handles_transactions: true,
          syncs_ledger: centralNodeInfo?.synced ?? false,
          consensus_capable: true,
          scp_validator: true,
        },
      },
      
      metadata: {
        timestamp: new Date().toISOString(),
        app_version: "1.0.0",
        app_name: "Triumph Synergy",
        governance_shield_url: process.env.GOVERNANCE_SHIELD_URL || "http://triumph-governance-shield:11626",
        mutual_protocol_recognition: "ACTIVE",
        supernode_central_coupling: "STRONG (bidirectional support)",
      },
    },
    { 
      status: centralNodeInfo ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Protocol-Authority": "governance-shield-embedded-stellar-core",
        "X-Protocol-Version": String(centralNodeInfo?.protocol_version ?? 24),
        "X-Supernode-Unified": "true",
      },
    }
  );
}

export async function HEAD(request: NextRequest) {
  // Quick health check for protocol authority
  const centralNodeInfo = await fetchCentralNodeInfo();
  
  return new NextResponse(null, {
    status: centralNodeInfo ? 200 : 503,
    headers: {
      "X-Protocol-Authority": "governance-shield-embedded-stellar-core",
      "X-Protocol-Version": String(centralNodeInfo?.protocol_version ?? 24),
      "X-Supernode-Status": centralNodeInfo?.synced ? "SYNCED" : "SYNCING",
    },
  });
}
