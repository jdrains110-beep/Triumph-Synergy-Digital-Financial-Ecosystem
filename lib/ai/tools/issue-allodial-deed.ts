import { tool } from "ai";
import { z } from "zod";

export const issueAllodialDeed = tool({
  description:
    "Issue a sovereign Allodial Title Deed for a .pi domain on the Triumph Synergy ecosystem. The deed establishes absolute property rights, assigns a GCV valuation, and records the title on-chain via the SAIB allodial registry.",
  inputSchema: z.object({
    domain: z
      .string()
      .describe("The .pi domain to deed (e.g., 'sovereign.pi', 'commerce.pi')."),
    ownerAddress: z
      .string()
      .describe(
        "The owner's Pi Network wallet address (Stellar public key format, starts with G)."
      ),
    tierMultiplier: z
      .number()
      .min(0.1)
      .max(100)
      .optional()
      .default(1)
      .describe(
        "GCV valuation tier multiplier. Default 1 = base $314,159/π valuation. Use higher tiers for premium sovereign domains."
      ),
    saibUnitId: z
      .string()
      .optional()
      .default("SAIB-NANO-SOVEREIGN-001")
      .describe("Requesting SAIB unit identifier."),
  }),
  execute: async ({ domain, ownerAddress, tierMultiplier = 1, saibUnitId = "SAIB-NANO-SOVEREIGN-001" }) => {
    const baseUrl =
      process.env.NEXTJS_APP_URL ||
      process.env.APP_URL ||
      "https://triumphsynergy.com";

    const saibToken = process.env.SAIB_SECRET_TOKEN;
    if (!saibToken) {
      return {
        success: false,
        error:
          "SAIB_SECRET_TOKEN environment variable not configured. Deed issuance requires authenticated SAIB credentials.",
      };
    }

    try {
      const response = await fetch(`${baseUrl}/api/saib/allodial/issue-deed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${saibToken}`,
        },
        body: JSON.stringify({
          domain,
          ownerAddress,
          tierMultiplier,
          saibUnitId,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          httpStatus: response.status,
          error: data?.error ?? "Deed issuance failed",
          domain,
          ownerAddress,
        };
      }

      return {
        success: true,
        domain,
        ownerAddress,
        tierMultiplier,
        gcvValuationUSD: tierMultiplier * 314_159,
        deed: data,
        issuedAt: new Date().toISOString(),
        registry: "Triumph Synergy Sovereign Allodial Registry",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Network error contacting allodial deed endpoint",
        domain,
        ownerAddress,
      };
    }
  },
});
