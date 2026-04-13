// app/api/judicial/route.ts
// REST API for the Superior Judicial Analysis System
// Connects to judicial-monitor microservice when available, falls back to local engine

import { NextRequest, NextResponse } from "next/server";
import { JudicialAnalysisSystem } from "@/lib/judicial";
import type { Case } from "@/lib/judicial/types";

const system = new JudicialAnalysisSystem();

// Microservice URL — Docker internal or via nginx
const JUDICIAL_SERVICE_URL =
  process.env.JUDICIAL_SERVICE_URL ?? "http://triumph-judicial-monitor:8096";

async function tryMicroservice(
  path: string,
  method: string,
  body?: unknown
): Promise<Response | null> {
  try {
    const res = await fetch(`${JUDICIAL_SERVICE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return res;
  } catch {
    // Microservice unavailable — fall back to local engine
  }
  return null;
}

// ─── POST /api/judicial — analyse a single case or batch ─────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // Batch mode: { cases: Case[], mode: "historical" }
  if (
    body &&
    typeof body === "object" &&
    "mode" in body &&
    (body as { mode: unknown }).mode === "historical"
  ) {
    // Try microservice first
    const msRes = await tryMicroservice("/api/judicial/batch", "POST", body);
    if (msRes) {
      const data = await msRes.json();
      return NextResponse.json(data, { status: 200 });
    }

    // Fallback to local engine
    const { cases } = body as unknown as { cases: Case[] };
    if (!Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty 'cases' array for historical analysis." },
        { status: 400 }
      );
    }
    const result = system.auditHistoricalCases(cases);
    return NextResponse.json(result, { status: 200 });
  }

  // Single case mode: { case: Case, representationOptions?: ... }
  const { case: caseData, representationOptions = {} } = body as {
    case: Case;
    representationOptions?: Parameters<
      InstanceType<typeof JudicialAnalysisSystem>["analyzeCase"]
    >[1];
  };

  if (!caseData || typeof caseData !== "object" || !caseData.id) {
    return NextResponse.json(
      { error: "Provide a valid 'case' object with at least an 'id' field." },
      { status: 400 }
    );
  }

  // Try microservice first
  const msRes = await tryMicroservice("/api/judicial/analyze", "POST", body);
  if (msRes) {
    const data = await msRes.json();
    return NextResponse.json(data, { status: 200 });
  }

  // Fallback to local engine
  const report = system.analyzeCase(caseData, representationOptions);
  return NextResponse.json(report, { status: 200 });
}

// ─── GET /api/judicial — transparency ledger / Florida monitor / stats ────────

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get("caseId");
  const view   = req.nextUrl.searchParams.get("view");

  // Florida monitoring overview
  if (view === "florida") {
    const msRes = await tryMicroservice("/api/judicial/monitor/florida", "GET");
    if (msRes) {
      const data = await msRes.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({
      jurisdiction: "Florida",
      monitoringStatus: "OFFLINE",
      message: "Judicial monitor microservice not available — start Docker services",
    });
  }

  // Aggregate statistics
  if (view === "stats") {
    const msRes = await tryMicroservice("/api/judicial/stats", "GET");
    if (msRes) {
      const data = await msRes.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({
      inMemory: { casesAnalyzed: 0, violationsFound: 0 },
    });
  }

  // Cases list
  if (view === "cases") {
    const msRes = await tryMicroservice(
      `/api/judicial/cases?jurisdiction=${req.nextUrl.searchParams.get("jurisdiction") ?? "Florida"}&limit=${req.nextUrl.searchParams.get("limit") ?? "50"}`,
      "GET"
    );
    if (msRes) {
      const data = await msRes.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({ rows: [] });
  }

  // Service health
  if (view === "health") {
    const msRes = await tryMicroservice("/health", "GET");
    if (msRes) {
      const data = await msRes.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({
      service: "judicial-monitor",
      status: "offline",
      fallback: "local-engine-active",
    });
  }

  // Case-specific ledger
  if (caseId) {
    const msRes = await tryMicroservice(`/api/judicial/ledger/${caseId}`, "GET");
    if (msRes) {
      const data = await msRes.json();
      return NextResponse.json(data, { status: 200 });
    }

    // Fallback
    const summary = system.ledger.publicSummary(caseId);
    const events = system.ledger.getEventsByCase(caseId);
    return NextResponse.json({ summary, events }, { status: 200 });
  }

  // Global ledger integrity
  const msRes = await tryMicroservice("/api/judicial/ledger", "GET");
  if (msRes) {
    const data = await msRes.json();
    return NextResponse.json(data, { status: 200 });
  }

  const integrity = system.ledger.verifyIntegrity();
  return NextResponse.json({
    totalEvents: system.ledger.getAllEvents().length,
    integrity,
  });
}
