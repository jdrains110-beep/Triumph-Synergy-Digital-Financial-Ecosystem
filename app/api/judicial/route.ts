// app/api/judicial/route.ts
// REST API for the Superior Judicial Analysis System

import { NextRequest, NextResponse } from "next/server";
import { JudicialAnalysisSystem } from "@/lib/judicial";
import type { Case } from "@/lib/judicial/types";

const system = new JudicialAnalysisSystem();

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
    const { cases } = body as { cases: Case[] };
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

  const report = system.analyzeCase(caseData, representationOptions);
  return NextResponse.json(report, { status: 200 });
}

// ─── GET /api/judicial?caseId=xxx — transparency ledger for a case ────────────

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get("caseId");

  if (!caseId) {
    // Return overall ledger integrity check
    const integrity = system.ledger.verifyIntegrity();
    return NextResponse.json({
      totalEvents: system.ledger.getAllEvents().length,
      integrity,
    });
  }

  const summary = system.ledger.publicSummary(caseId);
  const events = system.ledger.getEventsByCase(caseId);

  return NextResponse.json({ summary, events }, { status: 200 });
}
