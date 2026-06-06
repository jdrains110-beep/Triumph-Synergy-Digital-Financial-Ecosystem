import { tool } from "ai";
import { z } from "zod";

export const queryPiBalance = tool({
  description:
    "Query the Pi Network balance of a wallet address (Stellar public key). Returns the account's Pi balance, sequence number, and account flags on mainnet.",
  inputSchema: z.object({
    address: z
      .string()
      .describe(
        "Pi Network wallet address (Stellar public key, starts with G, 56 characters)."
      ),
  }),
  execute: async ({ address }) => {
    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      return {
        success: false,
        error:
          "Invalid Pi Network address format. Must be a Stellar public key starting with G (56 characters).",
        address,
      };
    }

    const baseUrl =
      process.env.NEXTJS_APP_URL ||
      process.env.APP_URL ||
      "https://triumphsynergy.com";

    try {
      const response = await fetch(
        `${baseUrl}/api/pi-rpc/balance?address=${encodeURIComponent(address)}`,
        {
          signal: AbortSignal.timeout(10_000),
          headers: { "x-saib-probe": "balance-query" },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          httpStatus: response.status,
          error: `Balance endpoint returned ${response.status}`,
          address,
        };
      }

      const data = await response.json();

      const piBalance = parseFloat(data?.balance ?? data?.balances?.[0]?.balance ?? "0");

      return {
        success: true,
        address,
        piBalance,
        piBalanceFormatted: `${piBalance.toLocaleString("en-US", { maximumFractionDigits: 7 })} π`,
        gcvInternalUSD: piBalance * 314_159,
        gcvExternalUSD: piBalance * 314.159,
        gcvInternalFormatted: `$${(piBalance * 314_159).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
        gcvExternalFormatted: `$${(piBalance * 314.159).toLocaleString("en-US", { maximumFractionDigits: 4 })}`,
        network: "mainnet",
        raw: data,
      };
    } catch (error) {
      // Fallback: query Horizon directly
      try {
        const horizonRes = await fetch(
          `https://api.mainnet.minepi.com/accounts/${encodeURIComponent(address)}`,
          { signal: AbortSignal.timeout(8_000) }
        );

        if (!horizonRes.ok) {
          return {
            success: false,
            error:
              horizonRes.status === 404
                ? "Account not found on Pi mainnet. The address may not be activated."
                : `Horizon returned ${horizonRes.status}`,
            address,
            network: "mainnet",
          };
        }

        const account = await horizonRes.json();
        const piAsset = (account.balances ?? []).find(
          (b: { asset_type: string }) => b.asset_type === "native"
        );
        const piBalance = parseFloat(piAsset?.balance ?? "0");

        return {
          success: true,
          address,
          piBalance,
          piBalanceFormatted: `${piBalance.toLocaleString("en-US", { maximumFractionDigits: 7 })} π`,
          gcvInternalUSD: piBalance * 314_159,
          gcvExternalUSD: piBalance * 314.159,
          gcvInternalFormatted: `$${(piBalance * 314_159).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
          gcvExternalFormatted: `$${(piBalance * 314.159).toLocaleString("en-US", { maximumFractionDigits: 4 })}`,
          network: "mainnet",
          sequence: account.sequence,
          source: "horizon-direct",
        };
      } catch {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to query Pi Network balance",
          address,
          network: "mainnet",
        };
      }
    }
  },
});
