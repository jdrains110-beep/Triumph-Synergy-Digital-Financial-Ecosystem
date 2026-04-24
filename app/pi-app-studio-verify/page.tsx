'use client';

import { useEffect, useState } from 'react';

interface VerificationResult {
  timestamp: string;
  requestedDomain: string;
  deploymentStatus: 'live' | 'failed' | 'checking';
  piSdkStatus: 'injected' | 'missing' | 'checking';
  validSetup: boolean;
  issues: string[];
  warnings: string[];
  currentDomain?: {
    hostname: string;
    network: string;
    sandbox: boolean;
    accessible: boolean;
    sdkInjected: boolean;
    statusCode?: number;
    responseTime?: number;
  };
  piAppStudioIntegration?: {
    primaryDomain: string;
    isTrueMainnet: boolean;
    vercelMainnetConnectsToMainnet: boolean;
    piSdkVersion: string;
    appId: string;
  };
}

export default function VerificationDashboard() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await fetch('/api/pi/app-studio/verification');
        const data = await response.json();
        setResult(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setLoading(false);
      }
    };

    verify();
    // Refresh every 30 seconds
    const interval = setInterval(verify, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">Verifying Pi App Studio integration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!result) return null;

  const isValid = result.validSetup && result.issues.length === 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pi App Studio Integration</h1>
        <p className="text-gray-600">
          Verification Dashboard for Triumph Synergy Deployment
        </p>
      </div>

      {/* Overall Status */}
      <div
        className={`p-6 rounded-lg border-2 ${
          isValid
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {isValid ? '✅ Valid Setup' : '❌ False Setup Detected'}
            </h2>
            <p className={isValid ? 'text-green-700' : 'text-red-700'}>
              {isValid
                ? 'Vercel deployment properly connected to Pi App Studio'
                : 'Vercel deployment NOT properly displaying/connecting to Pi App Studio'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {result.deploymentStatus === 'live' ? '🟢' : '🔴'}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {result.deploymentStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Current Domain Info */}
      {result.currentDomain && (
        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-bold">Current Domain</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Hostname
              </label>
              <div className="mt-1 font-mono">{result.currentDomain.hostname}</div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Network
              </label>
              <div className="mt-1 uppercase font-bold">
                {result.currentDomain.network}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Sandbox Mode
              </label>
              <div className="mt-1">
                {result.currentDomain.sandbox ? '🔒 Testnet' : '🌍 Mainnet'}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Response Time
              </label>
              <div className="mt-1">
                {result.currentDomain.responseTime}ms
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span>Deployment Accessible</span>
              <span>
                {result.currentDomain.accessible ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pi SDK Injected</span>
              <span>
                {result.currentDomain.sdkInjected ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pi App Studio Integration */}
      {result.piAppStudioIntegration && (
        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-bold">Pi App Studio Integration</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Primary Mainnet Domain</span>
              <span className="font-mono">
                {result.piAppStudioIntegration.primaryDomain}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Vercel Mainnet Connects to Mainnet</span>
              <span>
                {result.piAppStudioIntegration.vercelMainnetConnectsToMainnet
                  ? '✅'
                  : '❌'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Is True Mainnet</span>
              <span>
                {result.piAppStudioIntegration.isTrueMainnet ? '✅' : '❌'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pi SDK Version</span>
              <span className="font-mono">
                {result.piAppStudioIntegration.piSdkVersion}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>App ID</span>
              <span className="font-mono">
                {result.piAppStudioIntegration.appId}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {result.issues.length > 0 && (
        <div className="border border-red-300 rounded-lg p-6 bg-red-50">
          <h3 className="text-lg font-bold text-red-900 mb-4">Issues Found</h3>
          <ul className="space-y-2">
            {result.issues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">⚠️</span>
                <span className="text-red-700">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="border border-yellow-300 rounded-lg p-6 bg-yellow-50">
          <h3 className="text-lg font-bold text-yellow-900 mb-4">Warnings</h3>
          <ul className="space-y-2">
            {result.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-yellow-600 font-bold mt-1">⚠</span>
                <span className="text-yellow-700">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500 py-4">
        Last verified: {new Date(result.timestamp).toLocaleTimeString()}
        <br />
        (Auto-refreshes every 30 seconds)
      </div>
    </div>
  );
}
