import { tool } from "ai";
import { z } from "zod";

const GCV_INTERNAL = 314_159; // $314,159 USD per π (internal sovereign valuation)
const GCV_EXTERNAL = 314.159; // $314.159 USD per π (external market reference)

export const getGcvValue = tool({
  description:
    "Calculate the GCV (Global Currency Valuation) of a Pi amount. The internal sovereign valuation is $314,159 per π and the external market reference is $314.159 per π. Use this to convert Pi amounts to USD and to explain the dual-value system.",
  inputSchema: z.object({
    piAmount: z
      .number()
      .positive()
      .describe("Amount of Pi (π) to convert. Must be greater than 0."),
    context: z
      .enum(["internal", "external", "both"])
      .optional()
      .default("both")
      .describe(
        "Which GCV context to calculate: 'internal' (sovereign $314,159/π), 'external' (market $314.159/π), or 'both'."
      ),
  }),
  execute: async ({ piAmount, context = "both" }) => {
    const internalUSD = piAmount * GCV_INTERNAL;
    const externalUSD = piAmount * GCV_EXTERNAL;

    const result: Record<string, unknown> = {
      piAmount,
      gcvRateInternal: GCV_INTERNAL,
      gcvRateExternal: GCV_EXTERNAL,
      currency: "USD",
    };

    if (context === "internal" || context === "both") {
      result.internalValueUSD = internalUSD;
      result.internalValueFormatted = `$${internalUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    }

    if (context === "external" || context === "both") {
      result.externalValueUSD = externalUSD;
      result.externalValueFormatted = `$${externalUSD.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
    }

    if (context === "both") {
      result.multiplierDifference = GCV_INTERNAL / GCV_EXTERNAL; // 1,000x
      result.explanation =
        `${piAmount} π = $${internalUSD.toLocaleString("en-US")} (internal sovereign GCV at $314,159/π) ` +
        `or $${externalUSD.toLocaleString("en-US", { maximumFractionDigits: 4 })} (external market at $314.159/π). ` +
        `The 1,000x multiplier reflects sovereign utility vs. open-market exchange.`;
    }

    return result;
  },
});
