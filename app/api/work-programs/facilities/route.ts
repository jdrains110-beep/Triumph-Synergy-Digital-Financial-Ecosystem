/**
 * GET  /api/work-programs/facilities
 * List enrolled DOC facilities globally.
 *
 * POST /api/work-programs/facilities
 * Enroll a new DOC facility into the sovereign work program.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sovereignWorkEngine,
  type DocFacilityType,
  SOVEREIGN_PROGRAM_ID,
  PI_WORK_RATE_EXTERNAL,
  MAX_DAILY_EARN_PI,
  COMMISSARY_PI_CAP,
} from "@/lib/programs/sovereign-work-program";

// ── GET — list enrolled facilities ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const country       = searchParams.get("country");
  const jurisdiction  = searchParams.get("jurisdiction");
  const facilityType  = searchParams.get("type") as DocFacilityType | null;

  const facilities = buildGlobalFacilityRoster();
  const filtered = facilities.filter(f => {
    if (country && f.country !== country) return false;
    if (jurisdiction && f.jurisdiction !== jurisdiction) return false;
    if (facilityType && f.facilityType !== facilityType) return false;
    return true;
  });

  const summary = {
    totalFacilities: filtered.length,
    countriesRepresented: [...new Set(filtered.map(f => f.country))].length,
    totalEnrolledParticipants: filtered.reduce((s, f) => s + f.enrolledParticipants, 0),
    totalPiDistributed: filtered.reduce((s, f) => s + f.totalPiDistributed, 0),
    facilityTypes: [...new Set(filtered.map(f => f.facilityType))],
  };

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_PROGRAM_ID,
    facilities: filtered,
    summary,
    piRate: PI_WORK_RATE_EXTERNAL,
  });
}

// ── POST — enroll a facility ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    facilityId,
    facilityName,
    facilityType,
    jurisdiction,
    country,
    sovereignAdminId,
    docAdminIds,
    dailyEarnCapPi,
    commissaryCapPi,
  } = body as {
    facilityId: string;
    facilityName: string;
    facilityType: DocFacilityType;
    jurisdiction: string;
    country: string;
    sovereignAdminId: string;
    docAdminIds: string[];
    dailyEarnCapPi?: number;
    commissaryCapPi?: number;
  };

  if (!facilityId || !facilityName || !facilityType || !jurisdiction || !country || !sovereignAdminId) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: facilityId, facilityName, facilityType, jurisdiction, country, sovereignAdminId",
      },
      { status: 400 }
    );
  }

  const facility = sovereignWorkEngine.enrollFacility({
    facilityId,
    facilityName,
    facilityType,
    jurisdiction,
    country,
    sovereignAdminId,
    docAdminIds: docAdminIds ?? [],
    dailyEarnCapPi,
    commissaryCapPi,
  });

  return NextResponse.json(
    {
      success: true,
      facility,
      message: `Facility enrolled in ${SOVEREIGN_PROGRAM_ID} at APEX sovereign tier.`,
      programDefaults: {
        dailyEarnCapPi: dailyEarnCapPi ?? MAX_DAILY_EARN_PI,
        commissaryCapPi: commissaryCapPi ?? COMMISSARY_PI_CAP,
        holdCapPi: 10_000,
        piRateUsd: PI_WORK_RATE_EXTERNAL,
      },
      integration: {
        docApiVersion: "2026.1",
        piNetworkUtilityLayer: true,
        sovereignBackingActive: true,
        commissaryIntegration: true,
        holdAccountActive: true,
      },
    },
    { status: 201 }
  );
}

// ── Global facility roster (representative demo data) ─────────────────────────

function buildGlobalFacilityRoster() {
  const facilities = [
    // United States
    { facilityId: "TX-STATE-001", facilityName: "Texas State Correctional — Unit 7", facilityType: "work-release-center" as DocFacilityType, jurisdiction: "US-TX", country: "US", enrolledParticipants: 48, totalPiDistributed: 234.5 },
    { facilityId: "CA-STATE-002", facilityName: "California Correctional — Block D", facilityType: "state-prison" as DocFacilityType, jurisdiction: "US-CA", country: "US", enrolledParticipants: 120, totalPiDistributed: 580.2 },
    { facilityId: "FL-COUNTY-003", facilityName: "Miami-Dade County Detention", facilityType: "county-jail" as DocFacilityType, jurisdiction: "US-FL", country: "US", enrolledParticipants: 30, totalPiDistributed: 88.1 },
    { facilityId: "NY-HALFWAY-004", facilityName: "NYC Community Corrections Center", facilityType: "halfway-house" as DocFacilityType, jurisdiction: "US-NY", country: "US", enrolledParticipants: 22, totalPiDistributed: 115.7 },
    { facilityId: "TX-FEDERAL-005", facilityName: "Federal Corrections Institute — Beaumont", facilityType: "federal-prison" as DocFacilityType, jurisdiction: "US-TX", country: "US", enrolledParticipants: 75, totalPiDistributed: 340.9 },
    // United Kingdom
    { facilityId: "UK-ENG-001", facilityName: "HM Prison Belmarsh — Work Programme", facilityType: "state-prison" as DocFacilityType, jurisdiction: "UK-ENG", country: "GB", enrolledParticipants: 60, totalPiDistributed: 290.4 },
    { facilityId: "UK-WR-002", facilityName: "Northgate Work Release Unit — Leeds", facilityType: "work-release-center" as DocFacilityType, jurisdiction: "UK-ENG", country: "GB", enrolledParticipants: 18, totalPiDistributed: 98.3 },
    // South Africa
    { facilityId: "ZA-GP-001", facilityName: "Johannesburg Correctional — Section B", facilityType: "state-prison" as DocFacilityType, jurisdiction: "ZA-GP", country: "ZA", enrolledParticipants: 90, totalPiDistributed: 412.6 },
    // Nigeria
    { facilityId: "NG-LAG-001", facilityName: "Kirikiri Maximum Security — Skills Wing", facilityType: "state-prison" as DocFacilityType, jurisdiction: "NG-LAG", country: "NG", enrolledParticipants: 145, totalPiDistributed: 621.0 },
    // Philippines
    { facilityId: "PH-NCR-001", facilityName: "Bureau of Corrections — Muntinlupa Work Program", facilityType: "federal-prison" as DocFacilityType, jurisdiction: "PH-NCR", country: "PH", enrolledParticipants: 200, totalPiDistributed: 870.2 },
    // India
    { facilityId: "IN-MH-001", facilityName: "Yerwada Central Prison — Livelihood Programme", facilityType: "state-prison" as DocFacilityType, jurisdiction: "IN-MH", country: "IN", enrolledParticipants: 310, totalPiDistributed: 1240.5 },
    // Brazil
    { facilityId: "BR-SP-001", facilityName: "Complexo Penitenciário — Programa Trabalho Pi", facilityType: "state-prison" as DocFacilityType, jurisdiction: "BR-SP", country: "BR", enrolledParticipants: 180, totalPiDistributed: 790.8 },
  ];

  return facilities.map(f =>
    sovereignWorkEngine.enrollFacility({
      facilityId: f.facilityId,
      facilityName: f.facilityName,
      facilityType: f.facilityType,
      jurisdiction: f.jurisdiction,
      country: f.country,
      sovereignAdminId: "TRIUMPH-SOVEREIGN-ADMIN",
      docAdminIds: [`DOC-ADMIN-${f.facilityId}`],
    })
  );
}
