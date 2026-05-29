import { type NextRequest, NextResponse } from "next/server";
import {
  getSanctionsStatus,
  refreshSanctionsLists,
  screenSanctions,
} from "@/lib/pi/sanctions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/sanctions/screen   body: { name?, cryptoAddress?, aliases? }
 * GET  /api/pi/sanctions/screen   → list status (sizes, last refresh)
 * POST /api/pi/sanctions/screen?refresh=1  → trigger refresh
 */
export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("refresh") === "1") {
    const r = await refreshSanctionsLists(true);
    return NextResponse.json({ refreshed: true, ...r });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      cryptoAddress?: string;
      aliases?: string[];
    };
    if (!body.name && !body.cryptoAddress && !body.aliases?.length) {
      return NextResponse.json(
        { error: "name, cryptoAddress, or aliases required" },
        { status: 400 },
      );
    }
    if (Object.keys(getSanctionsStatus()).length === 0) {
      await refreshSanctionsLists();
    }
    const hits = screenSanctions(body);
    const result: "clear" | "review" | "block" = hits.some((h) => h.score >= 95)
      ? "block"
      : hits.length > 0
        ? "review"
        : "clear";
    return NextResponse.json({ result, hits, screenedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "screen failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: getSanctionsStatus(),
    refreshHours: Number(process.env.SANCTIONS_REFRESH_HOURS || "24"),
  });
}
