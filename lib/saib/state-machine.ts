/**
 * SAIB Optimus: Sliding-Window State Machine (Shared Library)
 * 
 * Autonomous Network Degradation Prediction
 * Tracks last 5 latency measurements in Cloudflare KV + optionally in Next.js Redis.
 * Automatically detects trends and predicts infrastructure failure BEFORE it happens.
 * 
 * This enables SAIB to make intelligent routing decisions without human intervention.
 */

export interface LatencyRecord {
  timestamp: number;
  latency: number;
  endpoint: string;
}

export interface SlidingWindowState {
  saibId: string;
  history: LatencyRecord[];
  movingAverage: number;
  trendAnalysis: TrendAnalysis;
  lastUpdated: number;
}

export interface TrendAnalysis {
  status: 'STABLE' | 'DEGRADATION_DETECTED' | 'DEGRADATION_IMMINENT' | 'CRITICAL_FAILURE';
  slope: number;           // Rate of change per measurement
  confidence: number;      // 0-1 prediction confidence
  recommendedAction: string;
  predictedFailureMs?: number; // When system will fail based on trend
}

/**
 * Calculate linear regression slope for trend analysis.
 * Used to detect if latency is consistently increasing.
 */
function calculateTrendSlope(latencies: number[]): number {
  if (latencies.length < 2) return 0;

  const n = latencies.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = latencies;

  const xMean = xs.reduce((a, b) => a + b) / n;
  const yMean = ys.reduce((a, b) => a + b) / n;

  const numerator = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Analyze latency trend to predict network degradation.
 * Returns a TrendAnalysis with status, slope, and recommended actions.
 */
export function analyzeTrend(history: LatencyRecord[]): TrendAnalysis {
  const trendAnalysis: TrendAnalysis = {
    status: 'STABLE',
    slope: 0,
    confidence: 0,
    recommendedAction: 'CONTINUE_STANDARD_FORWARD',
  };

  if (history.length < 2) {
    return trendAnalysis;
  }

  const latencies = history.map(h => h.latency);
  trendAnalysis.slope = calculateTrendSlope(latencies);

  // 1. CHECK FOR STEADY INCREASE (DEGRADATION_IMMINENT)
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    const isIncreasing =
      lastThree[1].latency > lastThree[0].latency &&
      lastThree[2].latency > lastThree[1].latency;

    if (isIncreasing && trendAnalysis.slope > 50) {
      // Latency increasing by >50ms per measurement
      trendAnalysis.status = 'DEGRADATION_IMMINENT';
      trendAnalysis.confidence = Math.min(1, trendAnalysis.slope / 200);
      trendAnalysis.recommendedAction = 'ACTIVATE_EDGE_CACHE_BYPASS';

      // Predict when failure will occur (2 more measurements at current rate)
      const projectedLatency = lastThree[2].latency + trendAnalysis.slope * 2;
      if (projectedLatency > 3000) {
        trendAnalysis.predictedFailureMs = Date.now() + 30000; // ~30 seconds
      }

      return trendAnalysis;
    }
  }

  // 2. CHECK FOR ALREADY-HIGH LATENCY (CRITICAL_FAILURE)
  const maxLatency = Math.max(...latencies);
  if (maxLatency > 2500) {
    trendAnalysis.status = 'CRITICAL_FAILURE';
    trendAnalysis.confidence = 0.95;
    trendAnalysis.recommendedAction = 'ROUTE_TO_BACKUP_KV_IMMEDIATELY';
    return trendAnalysis;
  }

  // 3. CHECK FOR SUDDEN SPIKE (DEGRADATION_DETECTED)
  if (history.length >= 2) {
    const currentLatency = history[history.length - 1].latency;
    const previousLatency = history[history.length - 2].latency;
    const spike = Math.abs(currentLatency - previousLatency);

    if (spike > 500) {
      // 500ms+ jump in latency
      trendAnalysis.status = 'DEGRADATION_DETECTED';
      trendAnalysis.confidence = 0.7;
      trendAnalysis.recommendedAction = 'MONITOR_CLOSELY_INCREASE_TIMEOUT';
      return trendAnalysis;
    }
  }

  // 4. STABLE STATE
  trendAnalysis.status = 'STABLE';
  trendAnalysis.confidence = 0.95;
  trendAnalysis.recommendedAction = 'CONTINUE_STANDARD_FORWARD';

  return trendAnalysis;
}

/**
 * Make routing decision based on trend analysis.
 * SAIB uses this to autonomously choose between forwarding strategies.
 */
export function makeRoutingDecision(trend: TrendAnalysis): {
  strategy: 'STANDARD_FORWARD' | 'EDGE_CACHE_BYPASS' | 'BACKUP_KV_CACHE' | 'HIBERNATION';
  delayMs: number;
  reason: string;
} {
  switch (trend.status) {
    case 'STABLE':
      return {
        strategy: 'STANDARD_FORWARD',
        delayMs: 0,
        reason: 'Network is healthy, proceeding with standard forwarding',
      };

    case 'DEGRADATION_DETECTED':
      return {
        strategy: 'STANDARD_FORWARD',
        delayMs: 200,
        reason: 'Latency spike detected, adding 200ms delay for recovery',
      };

    case 'DEGRADATION_IMMINENT':
      return {
        strategy: 'EDGE_CACHE_BYPASS',
        delayMs: 1000,
        reason: 'Network degradation predicted, activating edge caching',
      };

    case 'CRITICAL_FAILURE':
      return {
        strategy: 'BACKUP_KV_CACHE',
        delayMs: 5000,
        reason: 'Critical latency detected, routing to KV cache for resilience',
      };

    default:
      return {
        strategy: 'STANDARD_FORWARD',
        delayMs: 0,
        reason: 'Unknown trend status, defaulting to standard forwarding',
      };
  }
}

/**
 * Update sliding window state with a new latency measurement.
 * Maintains only last 5 entries (rolling window).
 * 
 * This function is designed to work with either Cloudflare KV or Redis.
 */
export async function updateSlidingWindowState(
  saibId: string,
  currentLatency: number,
  endpoint: string,
  kvStorage: any // KV or Redis-like interface
): Promise<SlidingWindowState> {
  const kvKey = `state_window_${saibId}`;

  try {
    // 1. FETCH CURRENT HISTORY
    let stateData: SlidingWindowState = (await kvStorage.get(kvKey)) || {
      saibId,
      history: [],
      movingAverage: 0,
      trendAnalysis: {
        status: 'STABLE',
        slope: 0,
        confidence: 0,
        recommendedAction: 'CONTINUE_STANDARD_FORWARD',
      },
      lastUpdated: 0,
    };

    // 2. APPEND NEW MEASUREMENT
    stateData.history.push({
      timestamp: Date.now(),
      latency: currentLatency,
      endpoint,
    });

    // 3. ENFORCE SLIDING WINDOW (keep last 5)
    if (stateData.history.length > 5) {
      stateData.history = stateData.history.slice(-5);
    }

    // 4. CALCULATE MOVING AVERAGE
    const totalLatency = stateData.history.reduce((sum, record) => sum + record.latency, 0);
    stateData.movingAverage = totalLatency / stateData.history.length;

    // 5. PERFORM TREND ANALYSIS
    stateData.trendAnalysis = analyzeTrend(stateData.history);

    // 6. UPDATE TIMESTAMP
    stateData.lastUpdated = Date.now();

    // 7. PERSIST TO STORAGE
    await kvStorage.put(kvKey, stateData, { expirationTtl: 86400 }); // 24 hour TTL

    console.log(`[STATE] ✅ Updated sliding window for ${saibId}`);
    console.log(`[STATE] Moving avg: ${stateData.movingAverage.toFixed(0)}ms, Trend: ${stateData.trendAnalysis.status}`);

    return stateData;
  } catch (error) {
    console.error(`[STATE] Error updating state:`, error);
    throw error;
  }
}

/**
 * Retrieve current state without updating it.
 * Used for read-only queries.
 */
export async function getSlidingWindowState(
  saibId: string,
  kvStorage: any
): Promise<SlidingWindowState | null> {
  try {
    const kvKey = `state_window_${saibId}`;
    const state = await kvStorage.get(kvKey);
    return state as SlidingWindowState | null;
  } catch (error) {
    console.error(`[STATE] Error retrieving state:`, error);
    return null;
  }
}

/**
 * Reset state history for a SAIB unit.
 * Used for recovery or system reset.
 */
export async function resetSlidingWindowState(
  saibId: string,
  kvStorage: any
): Promise<void> {
  try {
    const kvKey = `state_window_${saibId}`;
    await kvStorage.delete(kvKey);
    console.log(`[STATE] ✅ Reset state for ${saibId}`);
  } catch (error) {
    console.error(`[STATE] Error resetting state:`, error);
  }
}

/**
 * Get statistics across all SAIB instances.
 * Useful for system-wide monitoring and capacity planning.
 */
export async function getGlobalTrendStatistics(
  kvStorage: any,
  prefix: string = 'state_window_'
): Promise<{
  totalInstances: number;
  averageLatency: number;
  criticalInstances: string[];
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}> {
  try {
    // Note: Full implementation depends on KV implementation (Cloudflare vs Redis)
    // For now, returning placeholder structure

    const stats = {
      totalInstances: 0,
      averageLatency: 0,
      criticalInstances: [] as string[],
      systemHealth: 'HEALTHY' as const,
    };

    // In production, you'd list all keys with the prefix and aggregate

    return stats;
  } catch (error) {
    console.error('[STATE] Error calculating global stats:', error);
    return {
      totalInstances: 0,
      averageLatency: 0,
      criticalInstances: [],
      systemHealth: 'HEALTHY',
    };
  }
}

/**
 * Export state history for long-term analytics.
 * Enables capacity planning and infrastructure improvements.
 */
export async function exportStateHistory(
  saibId: string,
  kvStorage: any,
  destinationUrl?: string
): Promise<boolean> {
  try {
    const state = await getSlidingWindowState(saibId, kvStorage);
    if (!state) {
      console.warn(`[STATE] No history found for ${saibId}`);
      return false;
    }

    const exportPayload = {
      saibId,
      exportedAt: new Date().toISOString(),
      measurements: state.history,
      movingAverage: state.movingAverage,
      latestTrend: state.trendAnalysis,
    };

    // Send to analytics if destination provided
    if (destinationUrl) {
      await fetch(destinationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      });
    }

    console.log(`[STATE] ✅ Exported history for ${saibId}`);
    return true;
  } catch (error) {
    console.error(`[STATE] Error exporting history:`, error);
    return false;
  }
}

/**
 * Export all public types for TypeScript support.
 */
export type { LatencyRecord, SlidingWindowState, TrendAnalysis };
