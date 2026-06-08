/**
 * Triumph Synergy — Autonomous Tick
 *
 * Single self-driven cycle that:
 *   1. probes SAIB V9 cortex heartbeat (:8201)
 *   2. probes SAIB v4.3 sovereign-ai-bot (:8099)
 *   3. probes every sovereign-* service health
 *   4. asks GCV engine for live budget + pace
 *   5. (optionally) invokes a low-cost mesh action so the cortex
 *      keeps acting on its own without user input
 *
 * Result is cached in-process so the /api/ecosystem/state endpoint
 * always returns the latest snapshot without re-probing.
 */

import * as fs from "node:fs";

import {
  NANO_SAIB_URL,
  SAIB_V43_URL,
  SAIB_V9_ENDPOINTS,
  SAIB_V43_ENDPOINTS,
  SOVEREIGN_SERVICES,
  type SovereignService,
} from "./registry";

// v5.0 imports
import SAIBv5Orchestrator from "@/lib/saib/v5-orchestrator";
import PredictiveStateAnalyzer from "@/lib/saib/predictive-state-machine";
import PersistentMemory from "@/lib/saib/persistent-memory";
import AutonomousExecutor from "@/lib/saib/autonomous-executor";
import { QuantumBuilder } from "@/lib/saib/quantum-builder";

const _env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

// ─── Self-token: identical mechanism to the cortex (read /run/secrets) ────
let _selfToken: string | null = null;
function loadSelfToken(): string | null {
  if (_selfToken !== null) return _selfToken;
  const candidates = [
    _env.PUBLIC_BRIDGE_TOKEN,
    _env.NANO_SAIB_TOKEN,
    _env.SAIB_BRIDGE_TOKEN,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);
  if (candidates.length > 0) {
    _selfToken = candidates[0];
    return _selfToken;
  }
  try {
    const t = fs.readFileSync("/run/secrets/public_bridge_token", "utf-8").trim();
    if (t) {
      _selfToken = t;
      return _selfToken;
    }
  } catch {
    /* secret not mounted — non-bearer endpoints will still work */
  }
  _selfToken = "";
  return _selfToken || null;
}

// ─── HTTP probe helpers ───────────────────────────────────────────────────
async function probe(url: string, opts: { auth?: boolean; method?: "GET" | "POST"; body?: unknown; timeoutMs?: number } = {}): Promise<{
  ok: boolean;
  status: number | null;
  ms: number;
  data: unknown;
  err: string | null;
}> {
  const start = Date.now();
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 4000);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.auth) {
    const tk = loadSelfToken();
    if (tk) headers.authorization = `Bearer ${tk}`;
  }
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    let data: unknown = null;
    try { data = await res.json(); } catch { data = await res.text().catch(() => null); }
    return { ok: res.ok, status: res.status, ms: Date.now() - start, data, err: null };
  } catch (e) {
    return { ok: false, status: null, ms: Date.now() - start, data: null, err: (e as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Tick result type ─────────────────────────────────────────────────────
export interface TickResult {
  ts: number;
  iso: string;
  duration_ms: number;
  saib_v9: {
    url: string;
    status_ok: boolean;
    heartbeat: unknown;
    gcv_stats: unknown;
    actions_count: number;
  };
  saib_v43: {
    url: string;
    status_ok: boolean;
    health: unknown;
    missions: unknown;
  };
  services: Array<{
    name: string;
    container: string;
    category: SovereignService["category"];
    ok: boolean;
    status: number | null;
    ms: number;
  }>;
  ecosystem: {
    services_total: number;
    services_up: number;
    services_down: number;
    health_pct: number;
  };
  // v5.0 data
  saib_v5?: {
    loop_number: number;
    forecast_48h: any;
    forecast_30d: any;
    diagnosis: any;
    execution: any;
    autonomous_decision_rate: number;
    memory_patterns_found: number;
  };
  errors: string[];
}

// ─── In-process cache (pinned to globalThis so it survives module-graph
// ──   isolation between Next.js instrumentation bundle and route bundles)
interface AutonomyState {
  last: TickResult | null;
  running: boolean;
  interval: ReturnType<typeof setInterval> | null;
  // v5.0 components
  orchestrator: SAIBv5Orchestrator | null;
  predictor: PredictiveStateAnalyzer | null;
  memory: PersistentMemory | null;
  executor: AutonomousExecutor | null;
  builder: QuantumBuilder | null;
}
const _g = globalThis as unknown as { __triumph_autonomy?: AutonomyState };
if (!_g.__triumph_autonomy) {
  _g.__triumph_autonomy = {
    last: null,
    running: false,
    interval: null,
    orchestrator: null,
    predictor: null,
    memory: null,
    executor: null,
    builder: null,
  };
}
const _state: AutonomyState = _g.__triumph_autonomy;

export function getLastTick(): TickResult | null {
  return _state.last;
}

// ─── Initialize v5.0 components ───────────────────────────────────────────
function initializeV5Components(): void {
  if (_state.orchestrator) return; // Already initialized

  try {
    _state.predictor = new PredictiveStateAnalyzer(
      _env.REDIS_URL || "redis://localhost:6379"
    );
    _state.memory = new PersistentMemory(
      _env.SUPABASE_URL || "",
      _env.SUPABASE_KEY || "",
      _env.REDIS_URL || "redis://localhost:6379"
    );
    _state.builder = new QuantumBuilder();
    _state.executor = new AutonomousExecutor(_state.memory, _state.builder);
    _state.orchestrator = new SAIBv5Orchestrator(
      _state.predictor,
      _state.memory,
      _state.executor,
      _state.builder
    );
    console.log("[AUTONOMOUS-TICK] v5.0 components initialized");
  } catch (err) {
    console.error("[AUTONOMOUS-TICK] v5.0 initialization error:", err);
  }
}

// ─── The tick ─────────────────────────────────────────────────────────────
export async function runTick(): Promise<TickResult> {
  if (_state.running) {
    if (_state.last) return _state.last;
    return {
      ts: Math.floor(Date.now() / 1000),
      iso: new Date().toISOString(),
      duration_ms: 0,
      saib_v9:  { url: NANO_SAIB_URL, status_ok: false, heartbeat: null, gcv_stats: null, actions_count: 0 },
      saib_v43: { url: SAIB_V43_URL,  status_ok: false, health: null, missions: null },
      services: [],
      ecosystem: { services_total: 0, services_up: 0, services_down: 0, health_pct: 0 },
      errors: ["tick already in progress"],
    };
  }

  // Initialize v5 on first run
  if (!_state.orchestrator) {
    initializeV5Components();
  }

  _state.running = true;
  const start = Date.now();
  const errors: string[] = [];

  // ── 1. SAIB V9 cortex probes (parallel) ──
  const [v9Health, v9MeshStatus, v9Gcv, v9Actions] = await Promise.all([
    probe(`${NANO_SAIB_URL}/health`),
    probe(`${NANO_SAIB_URL}/omega/hyper-mesh/status`, { auth: true }),
    probe(`${NANO_SAIB_URL}/v9/gcv/stats`,             { auth: true }),
    probe(`${NANO_SAIB_URL}/omega/hyper-mesh/actions`, { auth: true }),
  ]);
  if (!v9Health.ok)     errors.push(`v9_health:${v9Health.err ?? v9Health.status}`);
  if (!v9MeshStatus.ok) errors.push(`v9_mesh_status:${v9MeshStatus.err ?? v9MeshStatus.status}`);
  if (!v9Gcv.ok)        errors.push(`v9_gcv_stats:${v9Gcv.err ?? v9Gcv.status}`);
  if (!v9Actions.ok)    errors.push(`v9_actions:${v9Actions.err ?? v9Actions.status}`);

  let actionsCount = 0;
  if (v9Actions.ok && v9Actions.data && typeof v9Actions.data === "object" && "actions" in v9Actions.data) {
    const a = (v9Actions.data as { actions: unknown }).actions;
    if (Array.isArray(a)) actionsCount = a.length;
  }

  // ── 2. SAIB v4.3 probes (parallel) ──
  const [v43Health, v43Missions] = await Promise.all([
    probe(`${SAIB_V43_URL}/health`),
    probe(`${SAIB_V43_URL}/missions`),
  ]);
  if (!v43Health.ok) errors.push(`v43_health:${v43Health.err ?? v43Health.status}`);

  // ── 3. Sovereign services (parallel) ──
  const svcResults = await Promise.all(
    SOVEREIGN_SERVICES.map(async (s) => {
      // skip non-HTTP entries (redis-mesh-pod is redis://…)
      if (!s.url.startsWith("http")) {
        return { name: s.name, container: s.container, category: s.category, ok: true, status: 200, ms: 0 };
      }
      const r = await probe(`${s.url}${s.healthPath}`, { timeoutMs: 5000 });
      return { name: s.name, container: s.container, category: s.category, ok: r.ok, status: r.status, ms: r.ms };
    }),
  );
  const up = svcResults.filter((r) => r.ok).length;

  // ── 4. Run v5.0 orchestrator ──
  let v5Data: any = null;
  if (_state.orchestrator) {
    try {
      const probes_for_v5 = {
        services: svcResults.map(s => ({
          container: s.container,
          latency_ms: s.ms,
          ok: s.ok,
        })),
        gcv_deviation: v9Gcv.ok && v9Gcv.data ? (v9Gcv.data as any).deviation_usd_cents : 0,
      };

      const v5_result = await _state.orchestrator.run_30s_loop(probes_for_v5);
      v5Data = {
        loop_number: v5_result.loop_number,
        forecast_48h: v5_result.forecast.forecast_48h,
        forecast_30d: v5_result.forecast.forecast_30d,
        diagnosis: v5_result.diagnosis,
        execution: v5_result.execution,
        autonomous_decision_rate: v5_result.autonomous_decision_rate,
        memory_patterns_found: v5_result.memory_patterns.length,
      };
    } catch (err) {
      errors.push(`v5_orchestrator_error:${(err as Error).message}`);
      console.error("[AUTONOMOUS-TICK] v5 orchestrator error:", err);
    }
  }

  // ── 5. (Autonomous self-action) ask cortex to run gcv_oracle once per tick ──
  // This is the "always moving" piece — even with zero user traffic, the
  // ecosystem heartbeat keeps the GCV engine warm and validates the peg.
  if (v9MeshStatus.ok) {
    const _selfPing = await probe(`${NANO_SAIB_URL}/omega/hyper-mesh/invoke`, {
      auth: true,
      method: "POST",
      body: {
        action: "gcv_oracle",
        actor_id: "triumph-app-autonomy",
        is_founder: false,
        confidence: 0.95,
        body: { item_usd_value: "314159", offered_pi: "1.0" },
      },
    });
    if (!_selfPing.ok) errors.push(`autonomy_self_ping:${_selfPing.err ?? _selfPing.status}`);
  }

  const result: TickResult = {
    ts: Math.floor(Date.now() / 1000),
    iso: new Date().toISOString(),
    duration_ms: Date.now() - start,
    saib_v9: {
      url: NANO_SAIB_URL,
      status_ok: v9Health.ok && v9MeshStatus.ok,
      heartbeat: v9MeshStatus.data,
      gcv_stats: v9Gcv.data,
      actions_count: actionsCount,
    },
    saib_v43: {
      url: SAIB_V43_URL,
      status_ok: v43Health.ok,
      health: v43Health.data,
      missions: v43Missions.data,
    },
    services: svcResults,
    ecosystem: {
      services_total: svcResults.length,
      services_up: up,
      services_down: svcResults.length - up,
      health_pct: svcResults.length > 0 ? Math.round((up / svcResults.length) * 100) : 0,
    },
    saib_v5: v5Data || undefined,
    errors,
  };

  _state.last = result;
  _state.running = false;
  return result;
}

// ─── Loop control (interval also pinned to globalThis) ───────────────────
export function startAutonomousLoop(intervalMs: number = 30_000): boolean {
  if (_state.interval) return false;
  void runTick().catch(() => { /* swallow — recorded in errors */ });
  _state.interval = setInterval(() => {
    void runTick().catch(() => { /* swallow */ });
  }, Math.max(5_000, intervalMs));
  return true;
}

export function stopAutonomousLoop(): boolean {
  if (!_state.interval) return false;
  clearInterval(_state.interval);
  _state.interval = null;
  return true;
}

export function loopRunning(): boolean {
  return _state.interval !== null;
}
