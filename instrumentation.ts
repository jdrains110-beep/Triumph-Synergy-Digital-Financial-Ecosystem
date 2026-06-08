/**
 * Next.js instrumentation hook — runs once at server boot.
 *
 * On the Node runtime we kick off the Triumph Synergy autonomous loop:
 * the app starts probing SAIB V9 + v4.3 + all sovereign-* services
 * the moment it comes up, with no user request required.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Skip during `next build` to avoid touching network from the build sandbox.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Allow opting out via env (useful in tests / CI).
  if (process.env.TRIUMPH_AUTONOMY_DISABLED === "1") return;

  try {
    const { startAutonomousLoop } = await import("./lib/ecosystem/autonomous-tick");
    const intervalMs = Number.parseInt(process.env.TRIUMPH_AUTONOMY_INTERVAL_MS ?? "30000", 10);
    const started = startAutonomousLoop(Number.isFinite(intervalMs) ? intervalMs : 30_000);
    if (started) {
      // eslint-disable-next-line no-console
      console.info("[triumph-autonomy] loop started — interval=%dms", intervalMs);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[triumph-autonomy] boot failed:", (e as Error).message);
  }
}
