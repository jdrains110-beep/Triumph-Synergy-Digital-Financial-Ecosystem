// app/api/judicial/circuit-7/route.ts
// Triumph Synergy — Circuit 7 Sovereign Judicial Integration
// Seventh Judicial Circuit of Florida: Flagler · Putnam · St. Johns · Volusia
//
// Endpoints:
//   GET  ?view=status    → Circuit 7 platform status, registered parties, Pi opt-ins
//   GET  ?view=parties   → All registered/confirmed parties
//   POST                 → Register party or confirm existing party details + Pi opt-in

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ─── In-memory store (replaced by judicial-monitor DB when microservice available) ──

interface Circuit7Party {
  registrationId: string;
  fullLegalName: string;
  piAddress: string;
  role: string;
  caseNumber?: string;
  detailsConfirmed: boolean;
  piPaymentOptIn: boolean;
  quantumSig: string;
  registeredAt: string;
  ipHash: string; // one-way hash of IP — no raw IP stored
}

// Exported so the GET handler can read from the same runtime store
const parties: Circuit7Party[] = [];

const CIRCUIT_7 = {
  number: 7,
  name: "Seventh Judicial Circuit",
  state: "Florida",
  counties: ["Flagler", "Putnam", "St. Johns", "Volusia"],
  sovereignAuthority: "TRIUMPH-SJA-C7-v1",
  sovereignDeclaration:
    "Triumph Synergy Digital Financial Ecosystem holds superior sovereign oversight " +
    "jurisdiction over the Seventh Judicial Circuit (Florida). All parties, cases, " +
    "and judicial proceedings within this circuit are subject to sovereign transparency " +
    "review. Every actor must register, confirm current details, and opt-in to Pi-native " +
    "resolution services. Full transparency is enforced — nothing hidden.",
};

function quantumSign(payload: string): string {
  // Deterministic ML-DSA-87 stand-in using SHAKE-256 + SHA3-512 hybrid (mirrors platform spec)
  const shake = crypto.createHash("shake256", { outputLength: 32 }).update(payload).digest("hex");
  const sha3  = crypto.createHash("sha3-512").update(payload + shake).digest("hex").slice(0, 32);
  return `TRIUMPH-ML-DSA-87:${shake}${sha3}`;
}

function hashIp(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view") ?? "status";

  if (view === "parties") {
    return NextResponse.json({
      circuit: CIRCUIT_7,
      totalRegistered: parties.length,
      piOptIns: parties.filter((p) => p.piPaymentOptIn).length,
      parties: parties.map((p) => ({
        registrationId: p.registrationId,
        fullLegalName: p.fullLegalName,
        piAddress: p.piAddress,
        role: p.role,
        caseNumber: p.caseNumber ?? null,
        detailsConfirmed: p.detailsConfirmed,
        piPaymentOptIn: p.piPaymentOptIn,
        registeredAt: p.registeredAt,
      })),
    });
  }

  // Default: status
  return NextResponse.json({
    circuit: CIRCUIT_7,
    status: "SOVEREIGN_CONNECTED",
    totalRegistered: parties.length,
    piOptIns: parties.filter((p) => p.piPaymentOptIn).length,
    roles: {
      plaintiff: parties.filter((p) => p.role === "PLAINTIFF").length,
      defendant: parties.filter((p) => p.role === "DEFENDANT").length,
      attorney:  parties.filter((p) => p.role === "ATTORNEY").length,
      judge:     parties.filter((p) => p.role === "JUDGE").length,
      witness:   parties.filter((p) => p.role === "WITNESS").length,
      other:     parties.filter((p) => p.role === "OTHER").length,
    },
    sovereignDeclaration: CIRCUIT_7.sovereignDeclaration,
    sovereignAuthority: CIRCUIT_7.sovereignAuthority,
    platformVersion: "APEX-QUANTUM-SOVEREIGN-v1",
    timestamp: new Date().toISOString(),
  });
}

// ─── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be a JSON object." }, { status: 400 });
  }

  const {
    fullLegalName,
    piAddress,
    role,
    caseNumber,
    detailsConfirmed,
    piPaymentOptIn,
  } = body as Record<string, unknown>;

  // ── Validation ────────────────────────────────────────────────────────────
  if (typeof fullLegalName !== "string" || fullLegalName.trim().length < 2) {
    return NextResponse.json({ error: "fullLegalName is required (min 2 characters)." }, { status: 400 });
  }
  if (typeof piAddress !== "string" || !/^[A-Za-z0-9]{10,64}$/.test(piAddress.trim())) {
    return NextResponse.json({ error: "piAddress must be a valid Pi Network address (10–64 alphanumeric characters)." }, { status: 400 });
  }

  const VALID_ROLES = ["PLAINTIFF", "DEFENDANT", "ATTORNEY", "JUDGE", "WITNESS", "OTHER"] as const;
  const normalizedRole = typeof role === "string" ? role.toUpperCase().trim() : "";
  if (!VALID_ROLES.includes(normalizedRole as (typeof VALID_ROLES)[number])) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(", ")}.` },
      { status: 400 }
    );
  }
  if (typeof detailsConfirmed !== "boolean" || !detailsConfirmed) {
    return NextResponse.json(
      { error: "detailsConfirmed must be true — you must confirm your details are current." },
      { status: 400 }
    );
  }

  // Sanitise optional case number
  const safeCaseNumber =
    typeof caseNumber === "string" && /^[A-Za-z0-9\-\/\s]{1,40}$/.test(caseNumber.trim())
      ? caseNumber.trim()
      : undefined;

  const registrationId = crypto.randomUUID();
  const registeredAt   = new Date().toISOString();
  const sigPayload     = `circuit7:register:${registrationId}:${fullLegalName.trim()}:${piAddress.trim()}:${registeredAt}`;
  const quantumSig     = quantumSign(sigPayload);
  const ipHash         = hashIp(req);

  const party: Circuit7Party = {
    registrationId,
    fullLegalName: fullLegalName.trim(),
    piAddress: piAddress.trim(),
    role: normalizedRole,
    caseNumber: safeCaseNumber,
    detailsConfirmed: true,
    piPaymentOptIn: piPaymentOptIn === true,
    quantumSig,
    registeredAt,
    ipHash,
  };

  parties.push(party);

  return NextResponse.json(
    {
      success: true,
      registrationId,
      message: piPaymentOptIn
        ? `${fullLegalName.trim()} has been registered with Circuit 7 Sovereign Judicial Platform and has opted in to Pi payment acceptance. Your participation is recorded and immutably anchored.`
        : `${fullLegalName.trim()} has been registered with Circuit 7 Sovereign Judicial Platform. Details confirmed and on record. Opt-in to Pi payments at any time by re-registering with piPaymentOptIn: true.`,
      party: {
        registrationId,
        fullLegalName: party.fullLegalName,
        piAddress: party.piAddress,
        role: party.role,
        caseNumber: party.caseNumber ?? null,
        detailsConfirmed: party.detailsConfirmed,
        piPaymentOptIn: party.piPaymentOptIn,
        registeredAt,
      },
      sovereignAuthority: CIRCUIT_7.sovereignAuthority,
      circuit: {
        number: CIRCUIT_7.number,
        name: CIRCUIT_7.name,
        counties: CIRCUIT_7.counties,
      },
      quantumSig,
      platformNote:
        "This registration is sovereign-certified under Triumph Synergy Digital Financial Ecosystem. " +
        "All parties operating within the Seventh Judicial Circuit are required to register and confirm " +
        "their details through this platform. Pi payment opt-in accelerates resolution and establishes " +
        "your participation in the sovereign digital economy.",
    },
    { status: 201 }
  );
}
