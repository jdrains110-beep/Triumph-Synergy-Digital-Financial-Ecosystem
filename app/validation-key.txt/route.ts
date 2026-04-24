import type { NextRequest } from "next/server";
import {
  buildValidationResponse,
  pickValidationMode,
  resolveValidationKey,
} from "@/lib/validation/keys";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const mode = pickValidationMode(request);
  const key = resolveValidationKey(mode);
  return buildValidationResponse(key);
}
