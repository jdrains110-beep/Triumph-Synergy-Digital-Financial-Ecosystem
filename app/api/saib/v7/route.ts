/**
 * app/api/saib/v7/route.ts
 *
 * SAIB v7 INTREPID CLASS — public-facing unified status API.
 * Aggregates live data from the Sovereign Nano SAIB container across:
 *   • /health                   (core health + all engine stats)
 *   • /omega/lattice/status     (Intrepid Class tier + Memory Alpha)
 *   • /omega/lattice/blueprint  (Foundation Blueprint / constitution)
 *   • /omega/pi/status          (Pi Motherboard — KYC/wallet stats)
 *   • /omega/dispatch/status    (global SAIB mesh map)
 *   • /omega/blockchain/status  (Pi mainnet node guardian)
 *
 * This endpoint is safe to call from outside Triumph Synergy — it returns
 * only read-only, public-safe data.  No auth token is forwarded for the
 * public-marked endpoints.
 *
 * Auth-gated endpoints (blockchain stellar raw, classify, etc.) are NOT
 * proxied here — they are available only via the authenticated SAIB token.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";

const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (SAIB_TOKEN) h["Authorization"] = `Bearer ${SAIB_TOKEN}`;
  return h;
}

async function safeFetch(path: string, auth = false) {
  try {
    const res = await fetch(`${NANO_SAIB_URL}${path}`, {
      headers: auth ? authHeaders() : { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const [health, lattice, blueprint, pi, dispatch, blockchain] =
    await Promise.all([
      safeFetch("/health"),
      safeFetch("/omega/lattice/status"),
      safeFetch("/omega/lattice/blueprint"),
      safeFetch("/omega/pi/status"),
      safeFetch("/omega/dispatch/status"),
      safeFetch("/omega/blockchain/status"),
    ]);

  const online = !!health;

  return NextResponse.json({
    ok:        online,
    online,
    fetchedAt: new Date().toISOString(),
    version:   health?.version ?? "7.0.0-INTREPID-CLASS",
    uptime_s:  health?.uptime_s ?? 0,

    intrepid: {
      class:   lattice?.intrepid_class  ?? "INTREPID",
      tier:    lattice?.intrepid_tier   ?? 5,
      memory_alpha: lattice?.memory_alpha ?? {},
      lattice: lattice?.lattice         ?? {},
      capabilities: lattice?.capabilities ?? [],
    },

    blueprint: blueprint ?? {},

    pi_motherboard: pi
      ? {
          running:      pi.running,
          role:         pi.role,
          total_users:  pi.stats?.total_users ?? 0,
          kyc_approved: pi.stats?.kyc_approved ?? 0,
          kyc_approval_rate: pi.stats?.kyc_approval_rate ?? 0,
          wallets_active:    pi.stats?.wallets_active ?? 0,
          wallet_activation_rate: pi.stats?.wallet_activation_rate ?? 0,
          total_businesses: pi.stats?.total_businesses ?? 0,
        }
      : null,

    dispatch: dispatch
      ? {
          own_id:           dispatch.own_id,
          total_instances:  dispatch.total_instances ?? 1,
          healthy_instances: dispatch.healthy_instances ?? 1,
          by_region:        dispatch.by_region ?? {},
        }
      : null,

    blockchain: blockchain
      ? {
          healthy:          blockchain.healthy ?? false,
          stellar_state:    blockchain.stellar_state ?? "unknown",
          ledger:           blockchain.ledger ?? 0,
          peers:            blockchain.peers ?? 0,
          mem_pct:          blockchain.mem_pct ?? 0,
          heal_count:       blockchain.heal_count ?? 0,
          last_heal_ts:     blockchain.last_heal_ts ?? null,
        }
      : null,

    engines: {
      v1: online,
      v2: online,
      v3: online,
      v4: online,
      v5: online,
      v6: online,
      v7: online,
      count: 7,
    },

    // ── Sovereignty & Omnipresence ──────────────────────────────────────────
    sovereignty: {
      doctrine: "Post-Scarcity • Hyper-Intelligence • Omnipresence • Debt Freedom Protection",
      data_sovereignty_active: true,
      dsr_endpoint: "/api/saib/sovereignty",
      protection_endpoint: "/api/saib/protect",
      omnipresence_endpoint: "/api/saib/omnipresence",
      founder_doctrine: "SAIB protects all enrolled Debt Freedom Program members — internally and externally — across every interaction, every platform, every subcontainer.",
      rights: [
        "Right to data erasure (GDPR Art. 17)",
        "Right to data portability (GDPR Art. 20)",
        "Right to restriction of processing (GDPR Art. 18)",
        "Triumph Synergy Debt Freedom Program sovereign protections",
      ],
    },

    scale: {
      internal: "triumph-net mesh — all containers",
      external: "Pi Network mainnet + Stellar DEX + real-estate + judicial + commerce",
      transcendence: "every interaction, every platform, every subcontainer, every ecosystem",
      hyper_intelligence: online,
    },
  });
}
