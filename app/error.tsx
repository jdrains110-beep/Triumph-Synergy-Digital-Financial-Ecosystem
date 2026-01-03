'use client';

import { useEffect, useState } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Diagnostic',
};

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({});

  useEffect(() => {
    // Attempt to gather diagnostics
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setDiagnostics((prev) => ({
          ...prev,
          health: data,
          healthStatus: response.status,
        }));
      } catch (e) {
        setDiagnostics((prev) => ({
          ...prev,
          healthError: (e as Error).message,
        }));
      }
    };

    checkHealth();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-red-50 dark:bg-red-950 p-4">
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400">⚠️ System Error</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Error Details
            </h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto text-red-700 dark:text-red-400">
              {error.message}
            </pre>
          </div>

          {Object.keys(diagnostics).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                System Diagnostics
              </h2>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex gap-4 justify-center pt-4">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>If this problem persists, please contact support.</p>
          <p className="mt-2">
            <a href="/api/health" className="text-blue-600 hover:underline">
              Check system health
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
