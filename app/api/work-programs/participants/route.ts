/**
 * POST /api/work-programs/participants
 * Enroll a participant (employer, employee, inmate) in the sovereign work program.
 *
 * GET  /api/work-programs/participants
 * List / search participants with filters.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sovereignWorkEngine,
  buildProgramStats,
  type ParticipantClass,
  type DocFacilityType,
  type ClearanceLevel,
  SOVEREIGN_PROGRAM_ID,
} from "@/lib/programs/sovereign-work-program";

// ── GET — list participants (demo: returns seeded example roster + stats) ─────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const participantClass = searchParams.get("class") as ParticipantClass | null;
  const jurisdiction     = searchParams.get("jurisdiction");
  const facilityId       = searchParams.get("facilityId");

  // Build representative demo roster to show the program is live
  const roster = buildDemoRoster();
  const filtered = roster.filter(p => {
    if (participantClass && p.participantClass !== participantClass) return false;
    if (jurisdiction && p.jurisdiction !== jurisdiction) return false;
    if (facilityId && p.doc?.facilityId !== facilityId) return false;
    return true;
  });

  const stats = buildProgramStats(roster, buildDemoFacilities());

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_PROGRAM_ID,
    participants: filtered,
    stats,
    total: filtered.length,
  });
}

// ── POST — enroll a participant ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    piUid,
    piWallet,
    participantClass,
    displayName,
    jurisdiction,
    doc,
    employer,
  } = body as {
    piUid: string;
    piWallet: string;
    participantClass: ParticipantClass;
    displayName: string;
    jurisdiction: string;
    doc?: {
      facilityId: string;
      facilityName: string;
      facilityType: DocFacilityType;
      jurisdiction: string;
      inmateId: string;
      programEnrollmentDate: string;
      workReleaseEligible: boolean;
      supervisorId: string;
      behavioralScore: number;
      taskCompletionRate: number;
    };
    employer?: {
      organizationId: string;
      organizationName: string;
      organizationType: string;
    };
  };

  if (!piUid || !piWallet || !participantClass || !displayName || !jurisdiction) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: piUid, piWallet, participantClass, displayName, jurisdiction" },
      { status: 400 }
    );
  }

  const validClasses: ParticipantClass[] = [
    "employer", "employee", "inmate-work-release", "inmate-facility", "doc-admin", "sovereign-admin",
  ];
  if (!validClasses.includes(participantClass)) {
    return NextResponse.json(
      { success: false, error: `Invalid participantClass. Valid: ${validClasses.join(", ")}` },
      { status: 400 }
    );
  }

  // Inmate classes require DOC profile
  if (
    (participantClass === "inmate-work-release" || participantClass === "inmate-facility") &&
    !doc
  ) {
    return NextResponse.json(
      { success: false, error: "DOC profile required for inmate participants" },
      { status: 400 }
    );
  }

  const participant = sovereignWorkEngine.enrollParticipant({
    piUid,
    piWallet,
    participantClass,
    displayName,
    jurisdiction,
    doc,
    employer: employer as Parameters<typeof sovereignWorkEngine.enrollParticipant>[0]["employer"],
  });

  return NextResponse.json(
    {
      success: true,
      participant,
      message: `Participant enrolled in ${SOVEREIGN_PROGRAM_ID}. Status: pending-approval.`,
      nextSteps:
        participantClass === "inmate-facility" || participantClass === "inmate-work-release"
          ? [
              "DOC administrator will approve your enrollment within 24h",
              "Once approved, available tasks will appear in your work portal",
              "Earnings will credit to your commissary + sovereign hold account",
              "Work-release participants may qualify for off-facility tasks after 14-day streak",
            ]
          : [
              "Your account is pending sovereign verification",
              "Once approved you can post or accept tasks",
              "Pi earnings are paid upon task verification",
            ],
    },
    { status: 201 }
  );
}

// ── Demo helpers ───────────────────────────────────────────────────────────────

function buildDemoRoster() {
  return [
    sovereignWorkEngine.enrollParticipant({
      piUid: "demo-employer-001",
      piWallet: "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
      participantClass: "employer",
      displayName: "Triumph Synergy Operations",
      jurisdiction: "US-TX",
      employer: {
        organizationId: "TS-001",
        organizationName: "Triumph Synergy Operations",
        organizationType: "sovereign-operator",
      },
    }),
    sovereignWorkEngine.enrollParticipant({
      piUid: "demo-inmate-wr-001",
      piWallet: "GBWORKRELEASE0001TRIUMPH",
      participantClass: "inmate-work-release",
      displayName: "Work Release Participant A",
      jurisdiction: "US-TX",
      doc: {
        facilityId: "TX-STATE-001",
        facilityName: "Texas State Correctional — Unit 7",
        facilityType: "work-release-center",
        jurisdiction: "US-TX",
        inmateId: "TX-WR-8821",
        programEnrollmentDate: new Date().toISOString(),
        workReleaseEligible: true,
        workReleaseApprovedDate: new Date().toISOString(),
        supervisorId: "DOC-ADMIN-TX-001",
        behavioralScore: 87,
        taskCompletionRate: 0.94,
      },
    }),
    sovereignWorkEngine.enrollParticipant({
      piUid: "demo-inmate-fac-001",
      piWallet: "GBINMATEFACILITY0001TRIUMPH",
      participantClass: "inmate-facility",
      displayName: "Facility Participant B",
      jurisdiction: "US-CA",
      doc: {
        facilityId: "CA-STATE-002",
        facilityName: "California Correctional Facility — Block D",
        facilityType: "state-prison",
        jurisdiction: "US-CA",
        inmateId: "CA-FAC-44521",
        programEnrollmentDate: new Date().toISOString(),
        workReleaseEligible: false,
        supervisorId: "DOC-ADMIN-CA-001",
        behavioralScore: 72,
        taskCompletionRate: 0.81,
      },
    }),
  ];
}

function buildDemoFacilities() {
  return [
    sovereignWorkEngine.enrollFacility({
      facilityId: "TX-STATE-001",
      facilityName: "Texas State Correctional — Unit 7",
      facilityType: "work-release-center",
      jurisdiction: "US-TX",
      country: "US",
      sovereignAdminId: "TRIUMPH-SOVEREIGN-ADMIN",
      docAdminIds: ["DOC-ADMIN-TX-001"],
    }),
    sovereignWorkEngine.enrollFacility({
      facilityId: "CA-STATE-002",
      facilityName: "California Correctional Facility — Block D",
      facilityType: "state-prison",
      jurisdiction: "US-CA",
      country: "US",
      sovereignAdminId: "TRIUMPH-SOVEREIGN-ADMIN",
      docAdminIds: ["DOC-ADMIN-CA-001"],
    }),
  ];
}
