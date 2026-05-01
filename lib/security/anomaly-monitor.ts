/**
 * Anomaly Monitor — sovereign apex layer.
 *
 * Tracks short-window event counters and posts to ALERT_WEBHOOK_URL when
 * thresholds are exceeded. Designed to be cheap (in-memory rolling
 * counters) and safe (never throws into the calling code path).
 *
 * Trip conditions (defaults — tunable via env):
 *   - >= 25 auth.failure events for the same actor in 5 minutes
 *   - >= 50 ratelimit.tripped events on any single route in 5 minutes
 *   - any payment.replay_blocked event
 *   - >= 10 csp.violation events from the same UA in 5 minutes
 */
import { appendAuditEvent } from "./audit-chain";

interface Counter {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 5 * 60 * 1000;
const counters = new Map<string, Counter>();
const recentlyAlerted = new Map<string, number>();
const ALERT_DEDUPE_MS = 10 * 60 * 1000;

if (typeof globalThis !== "undefined" && !(globalThis as any).__anomaly_gc) {
  (globalThis as any).__anomaly_gc = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of counters) if (v.resetAt < now) counters.delete(k);
    for (const [k, t] of recentlyAlerted) if (now - t > ALERT_DEDUPE_MS) recentlyAlerted.delete(k);
  }, 60_000);
}

function bump(key: string): number {
  const now = Date.now();
  const c = counters.get(key);
  if (!c || c.resetAt < now) {
    counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return 1;
  }
  c.count++;
  return c.count;
}

async function fireWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const dedupeKey = `${event}::${JSON.stringify(payload)}`;
  if (recentlyAlerted.has(dedupeKey)) return;
  recentlyAlerted.set(dedupeKey, Date.now());

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[TRIUMPH-SYNERGY APEX ALERT] ${event}`,
        event,
        payload,
        ts: new Date().toISOString(),
      }),
      // Don't let webhook latency block requests
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // swallow — alerting must never break the app
  }
}

export interface AnomalyInput {
  type:
    | "auth.failure"
    | "ratelimit.tripped"
    | "payment.replay_blocked"
    | "csp.violation"
    | "payment.amount_mismatch";
  actor?: string;
  route?: string;
  ua?: string;
  meta?: Record<string, unknown>;
}

export async function recordSecurityEvent(input: AnomalyInput): Promise<void> {
  try {
    let key: string;
    let threshold: number;
    switch (input.type) {
      case "auth.failure":
        key = `auth.failure::${input.actor ?? "unknown"}`;
        threshold = Number(process.env.ANOMALY_AUTH_FAILURE_THRESHOLD ?? 25);
        break;
      case "ratelimit.tripped":
        key = `ratelimit::${input.route ?? "unknown"}`;
        threshold = Number(process.env.ANOMALY_RATELIMIT_THRESHOLD ?? 50);
        break;
      case "csp.violation":
        key = `csp::${input.ua ?? "unknown"}`;
        threshold = Number(process.env.ANOMALY_CSP_THRESHOLD ?? 10);
        break;
      case "payment.replay_blocked":
      case "payment.amount_mismatch":
        // Always alert
        void appendAuditEvent("anomaly.detected", { input });
        await fireWebhook(input.type, { ...input });
        return;
      default:
        return;
    }
    const count = bump(key);
    void appendAuditEvent(input.type, { ...input, count });
    if (count >= threshold) {
      void appendAuditEvent("anomaly.detected", { input, count, threshold });
      await fireWebhook(input.type, { ...input, count, threshold });
    }
  } catch {
    // never throw
  }
}
