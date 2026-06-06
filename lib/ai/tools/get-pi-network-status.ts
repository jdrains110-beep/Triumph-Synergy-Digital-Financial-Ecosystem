import { tool } from "ai";
import { z } from "zod";

export const getPiNetworkStatus = tool({
  description:
    "Query Pi Network (mainnet) status including latest ledger, protocol version, fee statistics, and RPC health. Use this to give real-time Pi blockchain data.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const baseUrl =
        process.env.NEXTJS_APP_URL ||
        process.env.APP_URL ||
        "https://triumphsynergy.com";

      const response = await fetch(`${baseUrl}/api/pi-rpc/network`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // 10s timeout via AbortSignal
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Pi RPC network endpoint returned ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        network: data.network ?? "mainnet",
        latestLedger: data.info?.blockNumber ?? "unknown",
        protocolVersion: data.info?.protocolVersion ?? "unknown",
        coreVersion: data.info?.coreVersion ?? "unknown",
        networkPassphrase: data.info?.networkPassphrase ?? "unknown",
        baseFee: data.info?.gasPrice ?? "100000",
        feeStats: data.info?.feeStats ?? {},
        rpcEndpoint: data.info?.rpcEndpoint ?? "https://api.mainnet.minepi.com",
        gcvInternal: 314159,
        gcvExternal: 314.159,
        gcvCurrency: "USD",
      };
    } catch (error) {
      // Fallback: hit Pi Horizon directly
      try {
        const horizonRes = await fetch(
          "https://api.mainnet.minepi.com/ledgers?limit=1&order=desc",
          { signal: AbortSignal.timeout(8_000) }
        );
        const horizonData = await horizonRes.json();
        const latest = horizonData?._embedded?.records?.[0];
        return {
          success: true,
          network: "mainnet",
          latestLedger: latest?.sequence?.toString() ?? "unknown",
          protocolVersion: latest?.protocol_version?.toString() ?? "24",
          baseFee: latest?.base_fee_in_stroops?.toString() ?? "100",
          closedAt: latest?.closed_at ?? "unknown",
          gcvInternal: 314159,
          gcvExternal: 314.159,
          gcvCurrency: "USD",
          source: "horizon-direct",
        };
      } catch {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to reach Pi Network RPC",
          network: "mainnet",
          gcvInternal: 314159,
          gcvExternal: 314.159,
        };
      }
    }
  },
});
