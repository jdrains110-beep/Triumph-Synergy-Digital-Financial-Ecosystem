'use client';

/**
 * SAIB Optimus: Central Core Motherboard Dashboard
 * 
 * Real-time monitoring of security, operational metrics, and system health.
 * Displays live telemetry for the autonomous financial ecosystem.
 * 
 * GCV Integration: Real-time Pi Network Global Consensus Value transaction monitoring
 * Founder Protection Dashboard: Real-time visibility into Jeremiah Joel Drains' treasury security.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface DashboardMetrics {
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
    safetyScore: number;
}

interface GcvTransaction {
    id: string;
    transaction_id: string;
    saib_id: string;
    status: string;
    trust_score: number;
    pi_amount: string;
    gcv_settlement_usd: string;
    classification_tier: string;
    execution_priority: string;
    sovereign_clearance: number;
    system_class_engaged: string;
    created_at: string;
}

export default function SaibDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [gcvTransactions, setGcvTransactions] = useState<GcvTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Subscribe to real-time GCV transactions
    useEffect(() => {
        const channel = supabase
            .channel('gcv-transactions')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'gcv_transactions' },
                (payload) => {
                    const newTx = payload.new as GcvTransaction;
                    setGcvTransactions((prev) => [newTx, ...prev].slice(0, 10));
                    
                    // Update system status if founder transaction
                    if (newTx.sovereign_clearance === 100 && newTx.status === 'AUTHORIZED') {
                        setMetrics((prev) => prev ? { ...prev, systemStatus: 'HEALTHY' } : prev);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fetch dashboard stats
    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/saib/dashboard-stats');
                const data = await res.json();
                setMetrics(data);
                setLastFetch(new Date());
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
            }
        }

        fetchStats();

        // Set up auto-refresh every 5 seconds
        let interval: NodeJS.Timeout | null = null;
        if (autoRefresh) {
            interval = setInterval(fetchStats, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);
                setMetrics(data);
                setLastFetch(new Date());
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch dashboard stats:', err);
            }
        }

        fetchStats();

        // Set up auto-refresh every 5 seconds
        let interval: NodeJS.Timeout | null = null;
        if (autoRefresh) {
            interval = setInterval(fetchStats, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    if (loading || !metrics) {
        return (
            <div className="saib-loading">
                <div style={{
                    padding: '2rem',
                    fontFamily: 'monospace',
                    color: '#666',
                    textAlign: 'center'
                }}>
                    ⚙️ Initializing Telemetry Matrix...
                </div>
            </div>
        );
    }

    const isCritical = metrics.systemStatus === 'CRITICAL';
    const isDegraded = metrics.systemStatus === 'DEGRADED';
    const statusColor = isCritical ? '#ff0000' : isDegraded ? '#ffb700' : '#00ff00';
    const statusBg = isCritical ? 'rgba(255, 0, 0, 0.1)' : isDegraded ? 'rgba(255, 183, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)';

    const gasPriceGwei = metrics.systemMetrics.averageGasPrice !== '0'
        ? (BigInt(metrics.systemMetrics.averageGasPrice) / BigInt(1000000000)).toString()
        : '0';

    const globalBalanceEth = metrics.globalBalance
        ? (parseFloat(metrics.globalBalance) / 1e18).toFixed(4)
        : 'N/A';

    return (
        <div style={{
            padding: '0',
            fontFamily: 'monospace',
            backgroundColor: '#000',
            color: '#fff',
            minHeight: '100vh',
            lineHeight: '1.6',
        }}>
            {/* Header */}
            <header style={{
                borderBottom: '2px solid #333',
                padding: '1.5rem',
                backgroundColor: '#0a0a0a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold' }}>
                        🛡️ SAIB OPTIMUS — CENTRAL CORE MOTHERBOARD
                    </h1>
                    <p style={{ color: '#888', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                        Live Edge Grid Status Telemetry
                    </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#666' }}>
                    <p style={{ margin: 0 }}>Last update: {lastFetch?.toLocaleTimeString()}</p>
                    <label style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ marginRight: '0.25rem' }}
                        />
                        Auto-refresh
                    </label>
                </div>
            </header>

            {/* Main Grid */}
            <div style={{
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
            }}>
                {/* System Status Card */}
                <div style={{
                    border: `2px solid ${statusColor}`,
                    padding: '1.5rem',
                    backgroundColor: statusBg,
                    borderRadius: '4px',
                }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                        SYSTEM CORE STATE
                    </h3>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: statusColor,
                        marginBottom: '1rem',
                    }}>
                        {metrics.systemStatus}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                        Autonomous Circuit Breaker Network
                    </p>
                </div>

                {/* Safety Score Card */}
                <div style={{
                    border: '2px solid #333',
                    padding: '1.5rem',
                    backgroundColor: '#111',
                    borderRadius: '4px',
                }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                        SAFETY SCORE
                    </h3>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: metrics.safetyScore >= 80 ? '#00ff00' : metrics.safetyScore >= 50 ? '#ffb700' : '#ff0000',
                        marginBottom: '1rem',
                    }}>
                        {metrics.safetyScore}%
                    </div>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#222',
                        borderRadius: '4px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${metrics.safetyScore}%`,
                            height: '100%',
                            backgroundColor: metrics.safetyScore >= 80 ? '#00ff00' : metrics.safetyScore >= 50 ? '#ffb700' : '#ff0000',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>

                {/* Global Balance Card */}
                <div style={{
                    border: '2px solid #333',
                    padding: '1.5rem',
                    backgroundColor: '#111',
                    borderRadius: '4px',
                }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                        GCV ESCROW POOL BALANCE
                    </h3>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginBottom: '0.5rem',
                        wordBreak: 'break-all',
                    }}>
                        {globalBalanceEth} <span style={{ color: '#ffb700', fontSize: '1rem' }}>ETH</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                        Multi-Wallet Reentrancy Shield
                    </p>
                </div>

                {/* Gas Price Card */}
                <div style={{
                    border: '2px solid #333',
                    padding: '1.5rem',
                    backgroundColor: '#111',
                    borderRadius: '4px',
                }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                        AVG GAS PRICE
                    </h3>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        marginBottom: '0.5rem',
                    }}>
                        {gasPriceGwei} <span style={{ color: '#ffb700', fontSize: '1rem' }}>Gwei</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                        Economic Viability Monitor
                    </p>
                </div>

                {/* Events Card */}
                <div style={{
                    border: '2px solid #333',
                    padding: '1.5rem',
                    backgroundColor: '#111',
                    borderRadius: '4px',
                }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                        EVENTS TODAY
                    </h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                        {metrics.systemMetrics.totalEventsToday}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#ff0000', marginTop: '0.5rem' }}>
                        🚨 Circuit breaks: {metrics.systemMetrics.circuitBreakerTripsToday}
                    </div>
                </div>

                {/* Active Units Card */}
                <div style={{
                    border: '2px solid #333',
                    padding: '1.5rem',
                    backgroundColor: '#111',
                    borderRadius: '4px',
                }}>
                    <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                        ACTIVE SAIB UNITS
                    </h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff00' }}>
                        {metrics.systemMetrics.activeSaibUnits.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                        {metrics.systemMetrics.activeSaibUnits.slice(0, 3).join(', ')}
                        {metrics.systemMetrics.activeSaibUnits.length > 3 && '...'}
                    </div>
                </div>
            </div>

            {/* Event Log */}
            <div style={{
                padding: '1.5rem',
                border: '2px solid #333',
                margin: '0 1.5rem 2rem',
                backgroundColor: '#0a0a0a',
                borderRadius: '4px',
            }}>
                <h3 style={{ margin: '0 0 1rem', color: '#888', fontSize: '0.9rem' }}>
                    RECENT EDGE AUDIT RECORDS
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        textAlign: 'left',
                        borderCollapse: 'collapse',
                        fontSize: '0.85rem',
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333', color: '#666' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>TIMESTAMP</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>SAIB ID</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>EVENT TYPE</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>STATE</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.recentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                                        No recent events
                                    </td>
                                </tr>
                            ) : (
                                metrics.recentLogs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '0.75rem', color: '#aaa' }}>
                                            {new Date(log.logged_at).toLocaleTimeString()}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: '#fff' }}>{log.saib_id}</td>
                                        <td style={{ padding: '0.75rem', color: '#fff' }}>{log.event_type}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            color: log.state_engaged === 'EMERGENCY_CIRCUIT_BREAKER' ? '#ff0000' : '#00ff00'
                                        }}>
                                            {log.state_engaged}
                                        </td>
                                        <td style={{
                                            padding: '0.75rem',
                                            color: log.circuit_breaker_tripped ? '#ff0000' : '#00ff00'
                                        }}>
                                            {log.circuit_breaker_tripped ? '🚨 BREAKER' : '✅ OK'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid #333',
                padding: '1rem 1.5rem',
                textAlign: 'center',
                color: '#666',
                fontSize: '0.85rem',
            }}>
                <p style={{ margin: 0 }}>
                    SAIB Optimus v4.0 — Zero-Trust Autonomous Financial Ecosystem
                </p>
                <p style={{ margin: '0.5rem 0 0' }}>
                    🔐 Founder Protection Active | Jeremiah Joel Drains Treasury Secured
                </p>
            </footer>

            {/* Global Styles */}
            <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          background-color: #000;
          color: #fff;
        }
        
        table {
          background-color: #111;
          border-radius: 4px;
          overflow: hidden;
        }
        
        th, td {
          border-color: #333;
        }
        
        input[type="checkbox"] {
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
