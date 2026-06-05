/**
 * SAIB Optimus: Sliding-Window State Machine
 * 
 * Autonomous Network Degradation Prediction
 * Tracks last 5 latency measurements in Cloudflare KV.
 * Automatically detects trends and predicts infrastructure failure BEFORE it happens.
 * Enables SAIB to self-route away from failing nodes without human intervention.
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
  slope: number;           // Rate of change (positive = getting worse)
  confidence: number;      // 0-1 confidence in prediction
  recommendedAction: string;
  predictedFailureMs?: number; // When backend will fail based on trend
}

/**
 * Records a new latency measurement and updates the sliding window state.
 * Automatically maintains only the last 5 entries (rolling window).
 * Calculates moving average and trend analysis.
 */
export async function updateSlidingWindowState(
  saibId: string,
  currentLatency: number,
  endpoint: string,
  env: any
): Promise<SlidingWindowState> {
  const kvKey = `state_window_${saibId}`;
  
  try {
    // 1. FETCH CURRENT HISTORY FROM KV
    let stateData: SlidingWindowState = await env.SAIB_BACKUP_KV.get(kvKey, { type: 'json' }) || {
      saibId,
      history: [],
      movingAverage: 0,
      trendAnalysis: {
        status: 'STABLE',
        slope: 0,
        confidence: 0,
        recommendedAction: 'CONTINUE_STANDARD_FORWARD'
      },
      lastUpdated: 0
    };

    // 2. APPEND NEW LATENCY RECORD
    stateData.history.push({
      timestamp: Date.now(),
      latency: currentLatency,
      endpoint
    });

    // 3. ENFORCE SLIDING WINDOW: Keep only last 5 entries
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

    // 7. PERSIST TO KV WITH 24-HOUR TTL
    await env.SAIB_BACKUP_KV.put(
      kvKey,
      JSON.stringify(stateData),
      { expirationTtl: 86400 } // 24 hours
    );

    console.log(`[STATE] ✅ Updated sliding window for ${saibId}`);
    console.log(`[STATE] Moving avg: ${stateData.movingAverage.toFixed(0)}ms, Trend: ${stateData.trendAnalysis.status}`);

    return stateData;
  } catch (error) {
    console.error(`[STATE] ❌ Error updating state: ${error}`);
    throw error;
  }
}

/**
 * Analyzes latency trend to predict network degradation.
 * Uses statistical analysis of the last 5 measurements.
 */
function analyzeTrend(history: LatencyRecord[]): TrendAnalysis {
  const trendAnalysis: TrendAnalysis = {
    status: 'STABLE',
    slope: 0,
    confidence: 0,
    recommendedAction: 'CONTINUE_STANDARD_FORWARD'
  };

  if (history.length < 2) {
    return trendAnalysis;
  }

  // Calculate slope (rate of change) using linear regression
  const n = history.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = history.map(h => h.latency);

  const xMean = xs.reduce((a, b) => a + b) / n;
  const yMean = ys.reduce((a, b) => a + b) / n;

  const numerator = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

  trendAnalysis.slope = denominator === 0 ? 0 : numerator / denominator;

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
      
      // Predict when failure will occur
      const projectedLatency = lastThree[2].latency + (trendAnalysis.slope * 2);
      if (projectedLatency > 3000) {
        trendAnalysis.predictedFailureMs = Date.now() + 30000; // Will fail in ~30s
      }
    }
  }

  // 2. CHECK FOR ALREADY-HIGH LATENCY (CRITICAL_FAILURE)
  const maxLatency = Math.max(...ys);
  if (maxLatency > 2500) {
    trendAnalysis.status = 'CRITICAL_FAILURE';
    trendAnalysis.confidence = 0.95;
    trendAnalysis.recommendedAction = 'ROUTE_TO_BACKUP_KV_IMMEDIATELY';
  }
  // 3. CHECK FOR SPIKE (DEGRADATION_DETECTED)
  else if (history.length >= 2) {
    const currentLatency = history[history.length - 1].latency;
    const previousLatency = history[history.length - 2].latency;
    const spike = Math.abs(currentLatency - previousLatency);

    if (spike > 500) {
      // 500ms+ jump in latency
      trendAnalysis.status = 'DEGRADATION_DETECTED';
      trendAnalysis.confidence = 0.7;
      trendAnalysis.recommendedAction = 'MONITOR_CLOSELY_INCREASE_TIMEOUT';
    }
  }

  return trendAnalysis;
}

/**
 * Retrieves the current state for a SAIB instance without updating it.
 * Used for read-only trend queries.
 */
export async function getSlidingWindowState(
  saibId: string,
  env: any
): Promise<SlidingWindowState | null> {
  try {
    const kvKey = `state_window_${saibId}`;
    const state = await env.SAIB_BACKUP_KV.get(kvKey, { type: 'json' });
    return state as SlidingWindowState | null;
  } catch (error) {
    console.error(`[STATE] Error retrieving state: ${error}`);
    return null;
  }
}

/**
 * Clears the state history for a SAIB instance.
 * Used for recovery or system reset.
 */
export async function resetSlidingWindowState(
  saibId: string,
  env: any
): Promise<void> {
  try {
    const kvKey = `state_window_${saibId}`;
    await env.SAIB_BACKUP_KV.delete(kvKey);
    console.log(`[STATE] ✅ Reset state for ${saibId}`);
  } catch (error) {
    console.error(`[STATE] Error resetting state: ${error}`);
  }
}

/**
 * Predictive routing decision based on trend analysis.
 * SAIB uses this to make autonomous decisions about where to forward data.
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
        reason: 'Network is healthy, proceeding with standard forwarding'
      };

    case 'DEGRADATION_DETECTED':
      return {
        strategy: 'STANDARD_FORWARD',
        delayMs: 200,
        reason: 'Latency spike detected, adding 200ms delay for recovery'
      };

    case 'DEGRADATION_IMMINENT':
      return {
        strategy: 'EDGE_CACHE_BYPASS',
        delayMs: 1000,
        reason: 'Network degradation predicted, activating edge caching and retry logic'
      };

    case 'CRITICAL_FAILURE':
      return {
        strategy: 'BACKUP_KV_CACHE',
        delayMs: 5000,
        reason: 'Critical latency detected, routing to KV cache for resilience'
      };

    default:
      return {
        strategy: 'STANDARD_FORWARD',
        delayMs: 0,
        reason: 'Unknown trend status, defaulting to standard forwarding'
      };
  }
}

/**
 * Get aggregate statistics across all SAIB instances for system-wide monitoring.
 * Useful for detecting systemic infrastructure issues.
 */
export async function getGlobalTrendStatistics(
  env: any,
  limit: number = 50
): Promise<{
  totalInstances: number;
  averageLatency: number;
  criticalInstances: string[];
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}> {
  try {
    // Note: This is a conceptual implementation.
    // Full implementation would require listing all KV keys with prefix matching.
    const stats = {
      totalInstances: 0,
      averageLatency: 0,
      criticalInstances: [],
      systemHealth: 'HEALTHY' as const
    };

    // In production, you'd query KV with list() to get all state_window_* keys
    // For now, returning placeholder that would be enriched with real data
    return stats;
  } catch (error) {
    console.error('[STATE] Error calculating global stats:', error);
    return {
      totalInstances: 0,
      averageLatency: 0,
      criticalInstances: [],
      systemHealth: 'HEALTHY'
    };
  }
}

/**
 * Export state history to a monitoring service for analytics.
 * Enables long-term trend analysis and capacity planning.
 */
export async function exportStateHistory(
  saibId: string,
  env: any,
  destinationUrl?: string
): Promise<boolean> {
  try {
    const state = await getSlidingWindowState(saibId, env);
    if (!state) {
      console.warn(`[STATE] No history found for ${saibId}`);
      return false;
    }

    const exportPayload = {
      saibId,
      exportedAt: new Date().toISOString(),
      measurements: state.history,
      movingAverage: state.movingAverage,
      latestTrend: state.trendAnalysis
    };

    // If destination URL provided, send to analytics backend
    if (destinationUrl) {
      await fetch(destinationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload)
      });
    }

    console.log(`[STATE] ✅ Exported history for ${saibId}`);
    return true;
  } catch (error) {
    console.error(`[STATE] Error exporting history: ${error}`);
    return false;
  }
}
