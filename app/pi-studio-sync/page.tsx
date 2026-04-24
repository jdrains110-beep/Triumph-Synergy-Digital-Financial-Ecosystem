/**
 * app/pi-studio-sync/page.tsx
 * 
 * Pi Studio Sync Verification Page
 * Shows synchronization status between this Vercel deployment and Pi Studio
 * Pi Studio accesses this to verify the deployment is production-ready
 */

'use client';

import { useEffect, useState } from 'react';

interface SyncStatus {
  status: string;
  hostname: string;
  network: string;
  sandbox: boolean;
  verification: Record<string, boolean>;
  integration: Record<string, unknown>;
  syncDetails: Record<string, boolean>;
  issues: string[];
}

export default function PiStudioSyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSync = async () => {
      try {
        const response = await fetch('/api/pi-studio/sync');
        const data = await response.json();
        setSyncStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync check failed');
      } finally {
        setLoading(false);
      }
    };

    checkSync();
    // Recheck every 30 seconds
    const interval = setInterval(checkSync, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Checking Pi Studio Sync Status...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: 'red' }}>
        Error: {error}
      </div>
    );
  }

  if (!syncStatus) return null;

  const isSynced = syncStatus.status === 'synced';

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Pi Studio Sync Status</h1>

      {/* Status Banner */}
      <div
        style={{
          padding: '20px',
          marginBottom: '30px',
          borderRadius: '8px',
          backgroundColor: isSynced ? '#dcfce7' : '#fee2e2',
          border: `2px solid ${isSynced ? '#22c55e' : '#ef4444'}`,
        }}
      >
        <h2 style={{ margin: '0', color: isSynced ? '#16a34a' : '#991b1b' }}>
          {isSynced ? '✅ 100% SYNCED' : '⚠️ NOT SYNCED'}
        </h2>
        <p style={{ margin: '10px 0 0 0', color: isSynced ? '#166534' : '#7f1d1d' }}>
          {isSynced
            ? 'This deployment is fully synced with Pi Studio'
            : 'This deployment needs Pi Studio registration'}
        </p>
      </div>

      {/* Key Information */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
          <strong>Domain:</strong>
          <div style={{ fontFamily: 'monospace', marginTop: '5px' }}>
            {syncStatus.hostname}
          </div>
        </div>
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
          <strong>Network:</strong>
          <div style={{ marginTop: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            {syncStatus.network}
          </div>
        </div>
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
          <strong>App ID:</strong>
          <div style={{ fontFamily: 'monospace', marginTop: '5px' }}>
            triumph-synergy
          </div>
        </div>
        <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
          <strong>Sandbox Mode:</strong>
          <div style={{ marginTop: '5px' }}>
            {syncStatus.sandbox ? '🔒 Testnet' : '🌍 Mainnet'}
          </div>
        </div>
      </div>

      {/* Verification Checklist */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Verification Status</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {Object.entries(syncStatus.verification).map(([key, value]) => (
            <div
              key={key}
              style={{
                padding: '10px',
                backgroundColor: value ? '#f0fdf4' : '#fef2f2',
                borderLeft: `3px solid ${value ? '#22c55e' : '#ef4444'}`,
              }}
            >
              <span>{value ? '✅' : '❌'}</span>
              <span style={{ marginLeft: '10px', textTransform: 'capitalize' }}>
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Details */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Sync Details</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {Object.entries(syncStatus.syncDetails).map(([key, value]) => (
            <div
              key={key}
              style={{
                padding: '10px',
                backgroundColor: value ? '#f0fdf4' : '#fef2f2',
                borderLeft: `3px solid ${value ? '#22c55e' : '#ef4444'}`,
              }}
            >
              <span>{value ? '✅' : '❌'}</span>
              <span style={{ marginLeft: '10px', textTransform: 'capitalize' }}>
                {key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/interfering/i, 'Interfering')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Issues */}
      {syncStatus.issues.length > 0 && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '30px',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#991b1b' }}>⚠️ Issues</h3>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            {syncStatus.issues.map((issue, idx) => (
              <li key={idx} style={{ color: '#7f1d1d', marginBottom: '5px' }}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last Updated */}
      <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
        Last checked: {new Date().toLocaleTimeString()}
        <br />
        (Auto-refreshes every 30 seconds)
      </div>
    </div>
  );
}
