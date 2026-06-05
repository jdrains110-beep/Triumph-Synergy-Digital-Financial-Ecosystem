/**
 * SAIB Pi Network Metrics Collector
 * 
 * Collects Pi Network metrics from various sources and feeds them
 * into the SAIB learning engine for analysis.
 */

import type { PiNetworkMetrics } from "@/lib/saib/pi-learning-engine";

/**
 * Pi Network metrics collection strategies
 */

/**
 * Collect metrics from Pi Network public endpoints
 */
export async function collectPiMetricsFromPublicEndpoints(): Promise<Partial<PiNetworkMetrics>> {
  try {
    // In production: Query Pi Network public RPC endpoints
    // For now: Return mock data showing healthy ecosystem
    
    const timestamp = new Date();
    
    // Mock geographic distribution (Asia-heavy but diversifying)
    const geographicDistribution = new Map<string, number>([
      ["Asia", 0.42],
      ["Africa", 0.28],
      ["Americas", 0.18],
      ["Europe", 0.12],
    ]);

    return {
      timestamp,
      totalVolume: Math.random() * 100000 + 50000, // 50k-150k Pi
      activeUsers: Math.floor(Math.random() * 30000 + 20000), // 20k-50k users
      averageTransactionValue: Math.random() * 50 + 25, // 25-75 Pi avg
      transactionVelocity: Math.random() * 100 + 50, // 50-150 tx/sec
      networkHealthScore: Math.floor(Math.random() * 30 + 70), // 70-100 health
      geographicDistribution,
      paymentMethodMix: {
        internal: 0.85 + Math.random() * 0.1, // 85-95% internal
        external: 0.05 + Math.random() * 0.1, // 5-15% external
      },
    };
  } catch (error) {
    console.error("Error collecting Pi metrics from public endpoints:", error);
    throw error;
  }
}

/**
 * Collect metrics from Stellar settlement network
 * (Pi Network settlements happen on Stellar)
 */
export async function collectPiMetricsFromStellar(): Promise<Partial<PiNetworkMetrics>> {
  try {
    // In production: Query Stellar Horizon API
    // for Pi Network settlement transactions

    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";

    // Query recent transactions to Pi settlement account
    const response = await fetch(
      `${horizonUrl}/accounts/${process.env.STELLAR_PAYMENT_ACCOUNT}/transactions?limit=100&order=desc`
    );

    if (!response.ok) {
      throw new Error(`Stellar API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      _embedded: {
        records: Array<{
          amount?: string;
          created_at: string;
          type: string;
        }>;
      };
    };

    const records = data._embedded.records;

    // Analyze settlement patterns
    const totalVolume = records.reduce((sum, tx) => {
      return sum + (parseFloat(tx.amount ?? "0"));
    }, 0);

    const recentTxTime =
      (new Date().getTime() - new Date(records[0]?.created_at ?? new Date()).getTime()) / 1000;
    const transactionVelocity = records.length / (recentTxTime || 1);

    return {
      totalVolume,
      transactionVelocity,
      networkHealthScore: 85 + Math.random() * 15, // Stellar is generally healthy
    };
  } catch (error) {
    console.error("Error collecting Pi metrics from Stellar:", error);
    // Return partial data to avoid total failure
    return {
      networkHealthScore: 75,
    };
  }
}

/**
 * Collect metrics from Cloudflare Workers analytics
 * (SAIB edge ingestion happens on Cloudflare)
 */
export async function collectPiMetricsFromCloudflare(): Promise<Partial<PiNetworkMetrics>> {
  try {
    // In production: Query Cloudflare Analytics Engine
    // for Worker request metrics
    
    // For now: Return mock metrics showing healthy edge performance
    return {
      transactionVelocity: Math.random() * 200 + 100, // 100-300 req/sec
      networkHealthScore: 90 + Math.random() * 10, // Cloudflare usually 90-100
    };
  } catch (error) {
    console.error("Error collecting metrics from Cloudflare:", error);
    return {
      networkHealthScore: 80,
    };
  }
}

/**
 * Aggregate metrics from all sources
 */
export async function aggregatePiMetrics(): Promise<PiNetworkMetrics> {
  // Collect from all sources in parallel
  const [publicMetrics, stellarMetrics, cloudflareMetrics] = await Promise.all([
    collectPiMetricsFromPublicEndpoints(),
    collectPiMetricsFromStellar(),
    collectPiMetricsFromCloudflare(),
  ]);

  // Merge with preferences (public + Stellar + Cloudflare)
  const aggregated: PiNetworkMetrics = {
    timestamp: publicMetrics.timestamp || new Date(),
    totalVolume: publicMetrics.totalVolume || 75000,
    activeUsers: publicMetrics.activeUsers || 35000,
    averageTransactionValue: publicMetrics.averageTransactionValue || 42,
    transactionVelocity:
      (publicMetrics.transactionVelocity ||
        0 + cloudflareMetrics.transactionVelocity ||
        0) / 2,
    networkHealthScore:
      (publicMetrics.networkHealthScore || 80) * 0.5 +
      (stellarMetrics.networkHealthScore || 80) * 0.3 +
      (cloudflareMetrics.networkHealthScore || 85) * 0.2,
    geographicDistribution: publicMetrics.geographicDistribution || new Map(),
    paymentMethodMix: publicMetrics.paymentMethodMix || {
      internal: 0.9,
      external: 0.1,
    },
  };

  return aggregated;
}

/**
 * Send metrics to SAIB learning engine
 */
export async function feedMetricsToSAIB(
  metrics: PiNetworkMetrics
): Promise<{
  success: boolean;
  insightsGenerated: number;
  error?: string;
}> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const token = process.env.SAIB_PI_LEARNING_TOKEN;

    if (!token) {
      throw new Error("SAIB_PI_LEARNING_TOKEN not configured");
    }

    // Convert Map to plain object for JSON serialization
    const metricsJSON = {
      ...metrics,
      geographicDistribution: Object.fromEntries(metrics.geographicDistribution),
    };

    const response = await fetch(`${apiUrl}/api/saib/pi/learn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(metricsJSON),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SAIB API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      insightsGenerated?: number;
      learningEpoch?: number;
    };

    return {
      success: true,
      insightsGenerated: data.insightsGenerated || 0,
    };
  } catch (error) {
    console.error("Error feeding metrics to SAIB:", error);
    return {
      success: false,
      insightsGenerated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Continuous learning loop
 * Call this periodically to feed Pi metrics to SAIB
 */
export async function startSAIBPiLearningLoop(
  intervalSeconds: number = 60
): Promise<void> {
  console.log(
    `[SAIB Pi Learning] Starting learning loop (interval: ${intervalSeconds}s)`
  );

  const runLearningCycle = async () => {
    try {
      console.log("[SAIB Pi Learning] Collecting metrics...");
      const metrics = await aggregatePiMetrics();

      console.log(`[SAIB Pi Learning] Feeding metrics to SAIB engine:`, {
        timestamp: metrics.timestamp.toISOString(),
        totalVolume: metrics.totalVolume.toLocaleString(),
        activeUsers: metrics.activeUsers.toLocaleString(),
        healthScore: metrics.networkHealthScore.toFixed(1),
      });

      const result = await feedMetricsToSAIB(metrics);

      if (result.success) {
        console.log(
          `[SAIB Pi Learning] ✓ Generated ${result.insightsGenerated} insights`
        );
      } else {
        console.error(
          `[SAIB Pi Learning] ✗ Failed to feed metrics: ${result.error}`
        );
      }
    } catch (error) {
      console.error("[SAIB Pi Learning] Error in learning cycle:", error);
    }
  };

  // Run immediately
  await runLearningCycle();

  // Then repeat at interval
  setInterval(runLearningCycle, intervalSeconds * 1000);
}

// Export functions for use in API routes, cron jobs, etc.
export default {
  collectPiMetricsFromPublicEndpoints,
  collectPiMetricsFromStellar,
  collectPiMetricsFromCloudflare,
  aggregatePiMetrics,
  feedMetricsToSAIB,
  startSAIBPiLearningLoop,
};
