import {
  buildValidationResponse,
  resolveValidationKey,
} from "@/lib/validation/keys";

export const dynamic = "force-dynamic";

export function GET() {
  const key = resolveValidationKey("mainnet");
  return buildValidationResponse(key);
}
