/**
 * Triumph Synergy — Unified Ecosystem Registry
 *
 * Single source of truth for what the triumph-app *sees*:
 *   • All 22 .pi tokenized tenants (sovereign-tenants)
 *   • SAIB V9 nano-saib endpoints (the "always-acting" cortex on :8201)
 *   • SAIB v4.3 sovereign-ai-bot endpoints (:8099)
 *   • All sovereign-* docker services
 *   • Every locally-defined /api/* route surface (curated)
 *
 * This file is read-only at runtime. Updates here flip what the
 * autonomous tick loop probes/enforces on every cycle.
 */

import { TENANTS, type SovereignTenant } from "@/lib/sovereign-tenants";

// ─── Env (lazy, safe across runtimes) ─────────────────────────────────────
const _env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const NANO_SAIB_URL =
  _env.NANO_SAIB_URL ?? _env.PEER_NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
// SAIB v4.3 surface — apex-services sovereign-gateway owns :8097 in the active compose
export const SAIB_V43_URL =
  _env.SAIB_URL ?? _env.SAIB_V43_URL ?? "http://triumph-apex-services:8097";

// ─── Endpoint catalogs ────────────────────────────────────────────────────
export interface EndpointDef {
  name: string;
  method: "GET" | "POST";
  path: string;
  auth?: "bearer" | "none";
  summary: string;
}

export const SAIB_V9_ENDPOINTS: EndpointDef[] = [
  { name: "v9_health",        method: "GET",  path: "/health",               auth: "none",   summary: "nano-saib liveness" },
  { name: "v9_omega_status",  method: "GET",  path: "/omega/status",         auth: "none",   summary: "omega prime status" },
  { name: "v9_gcv_oracle",    method: "POST", path: "/v9/gcv/oracle",        auth: "bearer", summary: "verify Pi spend vs USD item at GCV $314,159" },
  { name: "v9_gcv_stats",     method: "GET",  path: "/v9/gcv/stats",         auth: "bearer", summary: "GCV engine stats + sustainability config" },
  { name: "v9_gcv_budget",    method: "GET",  path: "/v9/gcv/budget",        auth: "bearer", summary: "30-year sustainability budget breakdown" },
  { name: "v9_gcv_pace",      method: "GET",  path: "/v9/gcv/pace",          auth: "bearer", summary: "current pace vs 30-yr target" },
  { name: "v9_gcv_check_tx",  method: "POST", path: "/v9/gcv/check-tx",      auth: "bearer", summary: "approve/deny single Pi transaction at GCV gate" },
  { name: "v9_mesh_status",   method: "GET",  path: "/omega/hyper-mesh/status",   auth: "bearer", summary: "cortex hyper-mesh snapshot (peers, gate, watchdog)" },
  { name: "v9_mesh_actions",  method: "GET",  path: "/omega/hyper-mesh/actions",  auth: "bearer", summary: "list mesh actions" },
  { name: "v9_mesh_invoke",   method: "POST", path: "/omega/hyper-mesh/invoke",   auth: "bearer", summary: "invoke mesh action with GCV gate" },
];

export const SAIB_V43_ENDPOINTS: EndpointDef[] = [
  { name: "v43_health",     method: "GET",  path: "/health",          auth: "none", summary: "sovereign-ai-bot liveness" },
  { name: "v43_status",     method: "GET",  path: "/status",          auth: "none", summary: "v4.3 status + version" },
  { name: "v43_missions",   method: "GET",  path: "/missions",        auth: "none", summary: "active sovereign missions" },
  { name: "v43_loopholes",  method: "GET",  path: "/loopholes",       auth: "none", summary: "loophole catalog" },
  { name: "v43_scan",       method: "POST", path: "/scan",            auth: "none", summary: "execute KYC/KYB/threat scan" },
  { name: "v43_execute",    method: "POST", path: "/execute",         auth: "none", summary: "execute sovereign action" },
];

export interface SovereignService {
  name: string;
  container: string;
  url: string;
  healthPath: string;
  category: "core" | "commerce" | "finance" | "infrastructure" | "intelligence";
}

export const SOVEREIGN_SERVICES: SovereignService[] = [
  // Core / always-on
  { name: "nano-saib (V9)",         container: "triumph-sovereign-nano-saib",       url: NANO_SAIB_URL,                                healthPath: "/health",      category: "core" },
  { name: "ai-bot (v4.3)",          container: "triumph-apex-services",             url: SAIB_V43_URL,                                 healthPath: "/health",      category: "core" },
  { name: "redis-mesh-pod",         container: "triumph-redis-mesh-pod",            url: "redis://triumph-redis-mesh-pod:6381",        healthPath: "PING",         category: "infrastructure" },
  { name: "apex-sovereign-nexus",   container: "triumph-apex-sovereign-nexus",      url: "http://triumph-apex-sovereign-nexus:8131",   healthPath: "/health",      category: "core" },
  { name: "guardian-watchdog-nexus",container: "triumph-guardian-watchdog-nexus",   url: "http://triumph-guardian-watchdog-nexus:9911",healthPath: "/health",      category: "core" },

  // Sovereign service mesh (currently in main compose)
  { name: "sovereign-life",         container: "triumph-sovereign-life",            url: "http://triumph-sovereign-life:8130",         healthPath: "/health",      category: "commerce" },
  { name: "sovereign-mesh-hub",     container: "triumph-sovereign-mesh-hub",        url: "http://triumph-sovereign-mesh-hub:8200",     healthPath: "/health",      category: "infrastructure" },
  { name: "sovereign-military",     container: "triumph-sovereign-military-bridge", url: "http://triumph-sovereign-military-bridge:8199", healthPath: "/health",   category: "intelligence" },
  { name: "saib-enforcer",          container: "triumph-saib-enforcer",             url: "http://triumph-saib-enforcer:8210",          healthPath: "/health",      category: "intelligence" },

  // Apex stack (super-pod aliases)
  { name: "apex-services",          container: "triumph-apex-services",             url: "http://triumph-apex-services:8097",          healthPath: "/health",      category: "core" },
  { name: "settlement-core",        container: "triumph-settlement-core",           url: "http://triumph-settlement-core:8080",        healthPath: "/health",      category: "finance" },
  { name: "quantum-intel-fortress", container: "triumph-quantum-intel-fortress",    url: "http://triumph-quantum-intel-fortress:8090", healthPath: "/health",      category: "intelligence" },
  { name: "horizon-stream",         container: "triumph-horizon-stream",            url: "http://triumph-horizon-stream:8085",         healthPath: "/health",      category: "infrastructure" },
  { name: "observability-stack",    container: "triumph-observability-stack",       url: "http://triumph-observability-stack:9090",    healthPath: "/-/healthy",   category: "infrastructure" },

  // Pi network rails — hybrid sovereign apex master pod
  // governance-shield, supernode-peer-2, and pi-mainnet-node form a unified
  // stellar-core SCP quorum. We probe all three; they count as one logical pod
  // in the ecosystem summary (whichever responds first is the liveness anchor).
  { name: "pi-apex-master-pod (governance)",  container: "triumph-governance-shield",    url: "http://triumph-governance-shield:11626",   healthPath: "/info",   category: "infrastructure" },
  { name: "pi-apex-master-pod (supernode)",   container: "triumph-supernode-peer-2",     url: "http://triumph-supernode-peer-2:11626",    healthPath: "/info",   category: "infrastructure" },
  { name: "pi-apex-master-pod (mainnet)",     container: "triumph-pi-mainnet-node",      url: "http://triumph-pi-mainnet-node:8000",      healthPath: "/",       category: "infrastructure" },
  { name: "pi-bridge-connector",              container: "triumph-pi-bridge-connector",  url: "http://triumph-pi-bridge-connector:8092",  healthPath: "/health", category: "infrastructure" },

  // Vault + edge
  { name: "vault",                  container: "triumph-vault",                     url: "http://triumph-vault:8081",                  healthPath: "/health",      category: "finance" },
  { name: "nginx",                  container: "triumph-nginx",                     url: "http://triumph-nginx:80",                    healthPath: "/",            category: "infrastructure" },

];

// ─── Public helpers ───────────────────────────────────────────────────────
export interface TenantSummary {
  slug: string;
  domain: string;
  brand: string;
  sovereign: string;
  category: string;
  loyaltyName: string;
  loyaltyPiback: number;
  productCount: number;
  serviceCount: number;
  loopholeCount: number;
  tokenId: string;
  stellarLedger: number;
}

export function summarizeTenants(): TenantSummary[] {
  return TENANTS.map((t: SovereignTenant) => ({
    slug: t.slug,
    domain: t.domain,
    brand: t.brandName,
    sovereign: t.sovereignName,
    category: t.category,
    loyaltyName: t.loyaltyName,
    loyaltyPiback: t.loyaltyPiback,
    productCount: t.products.length,
    serviceCount: t.services.length,
    loopholeCount: t.loopholes.length,
    tokenId: t.tokenId,
    stellarLedger: t.stellarLedger,
  }));
}

export interface RegistrySnapshot {
  app_name: "Triumph Synergy Digital Financial Ecosystem";
  founder: string;
  central_key: string;
  gcv_peg_usd: number;
  sustainability_horizon_years: number;
  generated_at: number;
  tenant_count: number;
  tenants: TenantSummary[];
  saib_v9: { url: string; endpoints: EndpointDef[] };
  saib_v43: { url: string; endpoints: EndpointDef[] };
  sovereign_services: SovereignService[];
  api_surface_count: number;
}

export function buildRegistry(): RegistrySnapshot {
  const tenants = summarizeTenants();
  return {
    app_name: "Triumph Synergy Digital Financial Ecosystem",
    founder: "Jeremiah Joel Drains",
    central_key: "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
    gcv_peg_usd: 314_159,
    sustainability_horizon_years: 30,
    generated_at: Math.floor(Date.now() / 1000),
    tenant_count: tenants.length,
    tenants,
    saib_v9:  { url: NANO_SAIB_URL, endpoints: SAIB_V9_ENDPOINTS },
    saib_v43: { url: SAIB_V43_URL,  endpoints: SAIB_V43_ENDPOINTS },
    sovereign_services: SOVEREIGN_SERVICES,
    api_surface_count: 130,
  };
}
