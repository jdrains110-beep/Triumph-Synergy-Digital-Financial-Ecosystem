import { type NextRequest, NextResponse } from "next/server";
import { startKyb } from "@/lib/pi/kyc";

/**
 * POST /api/pi/kyb/start
 * body: {
 *   externalId, legalName, registrationNumber, jurisdiction,
 *   registeredAddress?, beneficialOwners?, directors?, requestedLevel?
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      externalId?: string;
      legalName?: string;
      registrationNumber?: string;
      jurisdiction?: string;
      registeredAddress?: string;
      beneficialOwners?: Array<{
        fullName: string;
        dateOfBirth?: string;
        ownershipPct?: number;
        isPep?: boolean;
      }>;
      directors?: Array<{ fullName: string; nationality?: string }>;
      requestedLevel?: "basic" | "enhanced" | "institutional";
    };
    if (!body.externalId || !body.legalName || !body.registrationNumber || !body.jurisdiction) {
      return NextResponse.json(
        {
          error:
            "externalId, legalName, registrationNumber, jurisdiction required",
        },
        { status: 400 },
      );
    }
    const r = await startKyb(
      {
        externalId: body.externalId,
        legalName: body.legalName,
        registrationNumber: body.registrationNumber,
        jurisdiction: body.jurisdiction,
        registeredAddress: body.registeredAddress,
        beneficialOwners: body.beneficialOwners,
        directors: body.directors,
      },
      { requestedLevel: body.requestedLevel },
    );
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "kyb start failed" },
      { status: 500 },
    );
  }
}
