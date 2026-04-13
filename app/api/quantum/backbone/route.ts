import { NextResponse } from "next/server";

const QUANTUM_SHIELD_URL =
  process.env.QUANTUM_SHIELD_URL ?? "http://triumph-quantum-shield:8094";
const PROMETHEUS_URL =
  process.env.PROMETHEUS_URL ?? "http://triumph-prometheus:9090";

export const dynamic = "force-dynamic";

type PromVectorResponse = {
  status?: string;
  data?: {
    result?: Array<{
      value?: [number | string, number | string];
    }>;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return res.json() as Promise<T>;
}

async function queryPromValue(expr: string): Promise<number> {
  const encoded = encodeURIComponent(expr);
  const payload = await fetchJson<PromVectorResponse>(
    `${PROMETHEUS_URL}/api/v1/query?query=${encoded}`
  );

  const raw = payload.data?.result?.[0]?.value?.[1];
  if (raw === undefined || raw === null) {
    return 0;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export async function GET() {
  try {
    const [status, connected, reconnects, failovers] = await Promise.all([
      fetchJson<Record<string, unknown>>(
        `${QUANTUM_SHIELD_URL}/quantum/backbone/status`
      ),
      queryPromValue('quantum_backbone_connected{job="triumph-quantum-shield"}'),
      queryPromValue(
        'quantum_backbone_reconnects_total{job="triumph-quantum-shield"}'
      ),
      queryPromValue(
        'quantum_backbone_failovers_total{job="triumph-quantum-shield"}'
      ),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        status,
        metrics: {
          connected,
          reconnects,
          failovers,
        },
        refreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
