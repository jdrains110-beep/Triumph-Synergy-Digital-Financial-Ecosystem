"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, CircleAlert, CircleCheckBig, RefreshCw } from "lucide-react";
import {
  SAIB_VERSION_CATALOG,
  SAIB_VERSION_ORDER,
  type SaibVersionKey,
} from "@/lib/saib/version-catalog";

type CapabilityProbe = {
  name: string;
  endpoint: string;
  description: string;
  ok: boolean;
  status: number;
  latencyMs: number;
};

type VersionPayload = {
  version: string;
  title: string;
  mission: string;
  health: "ACTIVE" | "PARTIAL" | "OFFLINE";
  activeCount: number;
  totalCapabilities: number;
  probes: CapabilityProbe[];
};

export function SaibVersionFloorDashboard({ version }: { version: SaibVersionKey }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VersionPayload | null>(null);

  const spec = SAIB_VERSION_CATALOG[version];

  const versionNumber = useMemo(() => Number.parseInt(version.replace("v", ""), 10), [version]);
  const previousVersion = versionNumber > 1 ? (`v${versionNumber - 1}` as SaibVersionKey) : null;
  const nextVersion = versionNumber < 10 ? (`v${versionNumber + 1}` as SaibVersionKey) : null;

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/saib/capabilities?version=${version}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Probe failed with status ${res.status}`);
      }

      const data = await res.json();
      setPayload(data.versions?.[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to probe SAIB capabilities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [version]);

  const healthTone =
    payload?.health === "ACTIVE"
      ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
      : payload?.health === "PARTIAL"
        ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
        : "text-rose-300 border-rose-500/40 bg-rose-500/10";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-black/30 p-6 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                SAIB Floor {version.toUpperCase()}
              </p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{spec.title}</h1>
              <p className="mt-2 max-w-3xl text-gray-300">{spec.mission}</p>
            </div>
            <button
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Run Live Probe
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className={`rounded-lg border px-3 py-1 text-xs font-semibold ${healthTone}`}>
              {payload?.health ?? "CHECKING"}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
              Active Capabilities: {payload?.activeCount ?? 0}/{payload?.totalCapabilities ?? spec.capabilities.length}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
              Total Floors: {SAIB_VERSION_ORDER.length}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {(payload?.probes ?? spec.capabilities.map((capability) => ({
            ...capability,
            ok: false,
            status: 0,
            latencyMs: 0,
          }))).map((capability) => (
            <div key={capability.name} className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{capability.name}</p>
                  <p className="text-sm text-gray-300">{capability.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {capability.ok ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-200">
                      <CircleCheckBig className="h-4 w-4" /> ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200">
                      <CircleAlert className="h-4 w-4" /> STANDBY
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300">
                    <Activity className="h-4 w-4" /> {capability.latencyMs}ms
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                <span>Endpoint: {capability.endpoint}</span>
                <span>HTTP {capability.status || "N/A"}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {previousVersion ? (
              <Link
                href={`/ecosystem/saib-${previousVersion}`}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
              >
                Previous: {previousVersion.toUpperCase()}
              </Link>
            ) : null}
            {nextVersion ? (
              <Link
                href={`/ecosystem/saib-${nextVersion}`}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
              >
                Next: {nextVersion.toUpperCase()}
              </Link>
            ) : null}
          </div>
          <Link
            href="/ecosystem/saib-floors"
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
          >
            View All Floors
          </Link>
        </div>
      </div>
    </div>
  );
}
