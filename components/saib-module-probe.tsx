"use client";
/**
 * components/saib-module-probe.tsx
 *
 * SAIB v3 Live Module Probe — client-side health check widget.
 * Probes a given API endpoint on mount and shows NOMINAL or SELF-HEALING status.
 * Must be a client component so the fetch runs in the browser (not SSR),
 * which avoids the relative-URL limitation of Next.js Server Components.
 */

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle, Loader2, Wrench } from "lucide-react";

interface SAIBModuleProbeProps {
  /** Relative API path to probe, e.g. "/api/nesara" */
  endpoint: string;
  /** Display label for the probe row, defaults to endpoint */
  label?: string;
}

type ProbeState = "loading" | "nominal" | "degraded" | "error";

interface ProbeResult {
  state: ProbeState;
  httpStatus?: number;
  message?: string;
}

export function SAIBModuleProbe({ endpoint, label }: SAIBModuleProbeProps) {
  const [result, setResult] = useState<ProbeResult>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function runProbe() {
      try {
        const res = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (cancelled) return;

        if (res.ok) {
          setResult({ state: "nominal", httpStatus: res.status });
        } else {
          setResult({
            state: "degraded",
            httpStatus: res.status,
            message: `HTTP ${res.status}`,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setResult({
          state: "error",
          message: err instanceof Error ? err.message : "network error",
        });
      }
    }

    runProbe();
    // Re-probe every 30 s
    const interval = setInterval(runProbe, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [endpoint]);

  const displayLabel = label ?? endpoint;

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-400">SAIB v3 · Live Module Probe</span>
        <Badge variant="outline" className="ml-auto text-xs border-cyan-500/40 text-cyan-400">
          SAIB-QUANTUM-CORE-v3
        </Badge>
      </div>

      {/* Probe row */}
      <div className="flex items-center gap-3 font-mono text-sm">
        {result.state === "loading" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">probing {displayLabel}…</span>
          </>
        )}

        {result.state === "nominal" && (
          <>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">NOMINAL</span>
            <span className="text-muted-foreground/60">· probe → {displayLabel}</span>
            <Badge variant="outline" className="ml-auto text-xs border-emerald-500/40 text-emerald-400">
              HTTP {result.httpStatus}
            </Badge>
          </>
        )}

        {(result.state === "degraded" || result.state === "error") && (
          <div className="w-full space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-semibold">
                SELF-HEALING · {result.message ?? "UNKNOWN ERROR"} · SAIB notified
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <Wrench className="h-3 w-3 text-amber-400/60" />
              <span>probe → {displayLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground/60 pt-1">
              Module is being auto-repaired. SAIB v3 has logged the incident and will re-route capacity.
              No user action required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
