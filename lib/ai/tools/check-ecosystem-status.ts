import { tool } from "ai";
import { z } from "zod";

const ENDPOINTS = [
  { name: "SAIB Dashboard Stats", path: "/api/saib/dashboard-stats" },
  { name: "Dual-Value System", path: "/api/dual-value" },
  { name: "Pi RPC Bridge", path: "/api/rpc-bridge" },
  { name: "Pi RPC Network", path: "/api/pi-rpc/network" },
  { name: "Quantum Fortress", path: "/api/quantum-fortress" },
  { name: "Central Node", path: "/api/central-node" },
] as const;

export const checkEcosystemStatus = tool({
  description:
    "Check the live health and status of all Triumph Synergy sovereign ecosystem services, APIs, and Pi Network RPC bridge. Returns uptime, response health, and any degraded services.",
  inputSchema: z.object({
    services: z
      .array(
        z.enum([
          "all",
          "saib",
          "pi-rpc",
          "dual-value",
          "quantum-fortress",
          "central-node",
        ])
      )
      .optional()
      .default(["all"])
      .describe("Which services to check. Use 'all' for a full sweep."),
  }),
  execute: async ({ services = ["all"] }) => {
    const baseUrl =
      process.env.NEXTJS_APP_URL ||
      process.env.APP_URL ||
      "https://triumphsynergy.com";

    const checkAll = services.includes("all");

    const endpointsToCheck = ENDPOINTS.filter((ep) => {
      if (checkAll) return true;
      if (services.includes("saib") && ep.path.startsWith("/api/saib"))
        return true;
      if (services.includes("pi-rpc") && ep.path.startsWith("/api/pi-rpc"))
        return true;
      if (services.includes("dual-value") && ep.path.includes("dual-value"))
        return true;
      if (
        services.includes("quantum-fortress") &&
        ep.path.includes("quantum-fortress")
      )
        return true;
      if (
        services.includes("central-node") &&
        ep.path.includes("central-node")
      )
        return true;
      return false;
    });

    const results = await Promise.allSettled(
      endpointsToCheck.map(async (ep) => {
        const start = Date.now();
        const response = await fetch(`${baseUrl}${ep.path}`, {
          signal: AbortSignal.timeout(6_000),
          headers: { "x-saib-probe": "ecosystem-status" },
        });
        const latencyMs = Date.now() - start;
        return {
          name: ep.name,
          path: ep.path,
          status: response.ok ? "healthy" : "degraded",
          httpStatus: response.status,
          latencyMs,
        };
      })
    );

    const statuses = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            name: endpointsToCheck[i].name,
            path: endpointsToCheck[i].path,
            status: "unreachable",
            httpStatus: 0,
            latencyMs: -1,
            error: r.reason instanceof Error ? r.reason.message : "Timeout or network error",
          }
    );

    const healthy = statuses.filter((s) => s.status === "healthy").length;
    const total = statuses.length;
    const overallStatus =
      healthy === total
        ? "all_systems_operational"
        : healthy === 0
          ? "all_systems_down"
          : "partial_degradation";

    return {
      overallStatus,
      healthyServices: healthy,
      totalChecked: total,
      timestamp: new Date().toISOString(),
      ecosystem: "Triumph Synergy Digital Financial Ecosystem",
      domain: "triumphsynergy.com",
      services: statuses,
    };
  },
});
