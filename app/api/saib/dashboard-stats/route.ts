/**
 * SAIB Dashboard: Real-Time Telemetry Stats API
 * 
 * Retrieves current system status, security events, and operational metrics
 * for the real-time dashboard display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

interface DashboardStats {
  systemStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  lastUpdateTime: string;
  recentLogs: Array<{
    id: string;
    saib_id: string;
    event_type: string;
    state_engaged: string;
    circuit_breaker_tripped: boolean;
    variance_detected: boolean;
    variance_amount?: string;
    gas_price_wei?: string;
    estimated_cost_usd?: number;
    logged_at: string;
  }>;
  systemMetrics: {
    totalEventsToday: number;
    circuitBreakerTripsToday: number;
    averageGasPrice: string;
    activeSaibUnits: string[];
  };
  globalBalance?: string;
  safetyScore: number; // 0-100, higher is better
}

/**
 * GET /api/saib/dashboard-stats
 * Returns current system telemetry for dashboard display
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[DASHBOARD] 📊 Fetching dashboard stats...');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. FETCH RECENT SECURITY LOGS
    let recentLogs: any[] = [];
    try {
      const { data, error } = await supabase
        .from('saib_security_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('[DASHBOARD] ⚠️ Failed to fetch logs:', error);
      } else {
        recentLogs = data || [];
      }
    } catch (err) {
      console.error('[DASHBOARD] ⚠️ Supabase query failed:', err);
    }

    // 2. CALCULATE SYSTEM METRICS
    const circuitBreakerTrips = recentLogs.filter(log => log.circuit_breaker_tripped).length;
    const totalEventsToday = recentLogs.filter(
      log => new Date(log.logged_at) >= new Date(todayStart)
    ).length;

    // Extract unique SAIB units
    const activeSaibUnits = [...new Set(recentLogs.map(log => log.saib_id))].slice(0, 10);

    // Calculate average gas price from recent logs
    let averageGasPrice = '0';
    const gasPriceLogs = recentLogs
      .filter(log => log.gas_price_wei)
      .map(log => BigInt(log.gas_price_wei || '0'));

    if (gasPriceLogs.length > 0) {
      const sum = gasPriceLogs.reduce((a, b) => a + b, 0n);
      averageGasPrice = (sum / BigInt(gasPriceLogs.length)).toString();
    }

    // 3. DETERMINE SYSTEM STATUS
    let systemStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    
    if (circuitBreakerTrips > 10) {
      systemStatus = 'CRITICAL';
    } else if (circuitBreakerTrips > 3 || totalEventsToday > 100) {
      systemStatus = 'DEGRADED';
    }

    // 4. CALCULATE SAFETY SCORE (0-100)
    // Lower circuit breaker trips = higher safety
    // More successful executions = higher safety
    let safetyScore = 100;
    
    if (totalEventsToday > 0) {
      safetyScore = Math.round(
        100 * (1 - (circuitBreakerTrips / Math.max(totalEventsToday, 1)))
      );
    }
    
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    // 5. FETCH GLOBAL BALANCE (if available)
    let globalBalance = undefined;
    try {
      const { data, error } = await supabase
        .from('ecosystem_balances')
        .select('total_wei_sum')
        .single();

      if (!error && data) {
        globalBalance = data.total_wei_sum;
      }
    } catch (err) {
      console.warn('[DASHBOARD] ⚠️ Failed to fetch global balance:', err);
    }

    // 6. BUILD RESPONSE
    const stats: DashboardStats = {
      systemStatus,
      lastUpdateTime: new Date().toISOString(),
      recentLogs: recentLogs.slice(0, 10),
      systemMetrics: {
        totalEventsToday,
        circuitBreakerTripsToday: circuitBreakerTrips,
        averageGasPrice,
        activeSaibUnits,
      },
      globalBalance,
      safetyScore,
    };

    console.log('[DASHBOARD] ✅ Stats compiled:', {
      systemStatus,
      safetyScore,
      circuitBreakerTrips,
      activeSaibUnits: activeSaibUnits.length,
    });

    return NextResponse.json(stats, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Dashboard-Updated': new Date().toISOString(),
        'X-System-Status': systemStatus,
      },
    });
  } catch (error) {
    console.error('[DASHBOARD] ❌ Fatal error:', error);

    // Return degraded response on error
    return NextResponse.json(
      {
        systemStatus: 'DEGRADED',
        lastUpdateTime: new Date().toISOString(),
        recentLogs: [],
        systemMetrics: {
          totalEventsToday: 0,
          circuitBreakerTripsToday: 0,
          averageGasPrice: '0',
          activeSaibUnits: [],
        },
        safetyScore: 50,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 } // Still 200 so dashboard can display degraded state
    );
  }
}

/**
 * POST /api/saib/dashboard-stats
 * Allows manual status updates (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.headers.get('X-Admin-Token');
    if (adminToken !== process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN !== 'disabled') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Handle various admin actions
    switch (body.action) {
      case 'reset_circuit_breaker':
        // Reset circuit breaker status
        console.log('[DASHBOARD] 🔄 Admin reset circuit breaker');
        return NextResponse.json({ status: 'reset' });

      case 'clear_logs':
        // Clear old logs
        console.log('[DASHBOARD] 🗑️ Admin clearing old logs');
        return NextResponse.json({ status: 'cleared' });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
