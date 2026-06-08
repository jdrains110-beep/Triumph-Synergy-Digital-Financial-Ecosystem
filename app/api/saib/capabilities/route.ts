import { type NextRequest, NextResponse } from "next/server";
import {
  SAIB_VERSION_CATALOG,
  SAIB_VERSION_ORDER,
  type SaibVersionKey,
} from "@/lib/saib/version-catalog";

export const dynamic = "force-dynamic";

type ProbeResult = {
  name: string;
  endpoint: string;
  description: string;
  ok: boolean;
  status: number;
  latencyMs: number;
};

function isVersionKey(value: string): value is SaibVersionKey {
  return SAIB_VERSION_ORDER.includes(value as SaibVersionKey);
}

async function runProbe(req: NextRequest, endpoint: string): Promise<{ ok: boolean; status: number; latencyMs: number }> {
  const startedAt = Date.now();
  const origin = req.nextUrl.origin;

  try {
    const url = new URL(endpoint, origin).toString();
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function GET(req: NextRequest) {
  const versionParam = req.nextUrl.searchParams.get("version")?.toLowerCase();

  if (versionParam && !isVersionKey(versionParam)) {
    return NextResponse.json(
      { error: "Invalid version. Use v1-v10." },
      { status: 400 },
    );
  }

  const targetVersions = versionParam ? [versionParam] : SAIB_VERSION_ORDER;

  const versionResults = await Promise.all(
    targetVersions.map(async (versionKey) => {
      const spec = SAIB_VERSION_CATALOG[versionKey as SaibVersionKey];
      const probes: ProbeResult[] = await Promise.all(
        spec.capabilities.map(async (capability) => {
          const probe = await runProbe(req, capability.endpoint);
          return {
            name: capability.name,
            endpoint: capability.endpoint,
            description: capability.description,
            ...probe,
          };
        }),
      );

      const activeCount = probes.filter((p) => p.ok).length;
      const health =
        activeCount === probes.length
          ? "ACTIVE"
          : activeCount > 0
            ? "PARTIAL"
            : "OFFLINE";

      return {
        version: versionKey,
        title: spec.title,
        mission: spec.mission,
        health,
        activeCount,
        totalCapabilities: probes.length,
        probes,
      };
    }),
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    versions: versionResults,
  });
}
