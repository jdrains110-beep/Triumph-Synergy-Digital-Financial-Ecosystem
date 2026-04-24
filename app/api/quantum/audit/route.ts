/**
 * Quantum Audit API Route
 * POST /api/quantum/audit
 *
 * Accepts audit events from Docker quantum-shield and other services,
 * storing them in the quantum_audit_log table via Supabase admin client.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logQuantumAudit, type QuantumAuditEntry } from "@/lib/supabase-quantum";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuantumAuditEntry;

    if (!body.operation || !body.algorithm) {
      return NextResponse.json(
        { error: "operation and algorithm are required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    await logQuantumAudit(admin, {
      ...body,
      ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/quantum/audit] Error:", err);
    return NextResponse.json(
      { error: "Failed to log audit event" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("quantum_audit_log")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/quantum/audit] GET error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve audit log" },
      { status: 500 },
    );
  }
}
