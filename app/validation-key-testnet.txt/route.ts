import { buildValidationResponse, resolveValidationKey } from "@/lib/validation/keys";

export const dynamic = "force-dynamic";

export function GET() {
  const key = resolveValidationKey("testnet");
  return buildValidationResponse(key);
}
