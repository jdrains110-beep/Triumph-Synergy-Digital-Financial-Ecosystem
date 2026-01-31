import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  pickValidationMode,
  resolveValidationKey,
} from "@/lib/validation/keys";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const headersObj: Record<string, string | null> = {};
  for (const [k, v] of request.headers.entries()) {
    headersObj[k] = v;
  }

  const mode = pickValidationMode(request);
  const key = resolveValidationKey(mode);

  const payload = {
    host: request.headers.get("host") || null,
    url: request.url,
    detectedMode: mode,
    resolvedKey: key,
    headers: headersObj,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
