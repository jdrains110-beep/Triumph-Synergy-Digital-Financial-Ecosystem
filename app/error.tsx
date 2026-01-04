"use client";

import { useEffect, useState } from "react";

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
        const response = await fetch("/api/health");
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-4 dark:bg-red-950">
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-4xl text-red-600 dark:text-red-400">
            ⚠️ System Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || "An unexpected error occurred"}
          </p>
        </div>

        <div className="space-y-4 rounded-lg bg-white p-6 dark:bg-gray-900">
          <div>
            <h2 className="mb-2 font-semibold text-gray-900 text-lg dark:text-white">
              Error Details
            </h2>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-red-700 text-sm dark:bg-gray-800 dark:text-red-400">
              {error.message}
            </pre>
          </div>

          {Object.keys(diagnostics).length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold text-gray-900 text-lg dark:text-white">
                System Diagnostics
              </h2>
              <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm dark:bg-gray-800">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
              onClick={() => reset()}
              type="button"
            >
              Try Again
            </button>
            <button
              className="rounded-lg bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh Page
            </button>
          </div>
        </div>

        <div className="text-center text-gray-600 text-sm dark:text-gray-400">
          <p>If this problem persists, please contact support.</p>
          <p className="mt-2">
            <a className="text-blue-600 hover:underline" href="/api/health">
              Check system health
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
