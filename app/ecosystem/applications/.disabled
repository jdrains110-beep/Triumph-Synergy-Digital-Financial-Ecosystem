/**
 * app/ecosystem/applications/page.tsx
 * Dashboard for managing integrated applications
 */

"use client";

import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Application = {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  categories: string[];
  enabled: boolean;
  features: string[];
};

type RegistryStatus = {
  total: number;
  enabled: number;
  disabled: number;
  applications: string[];
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [summary, setSummary] = useState<RegistryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/ecosystem/applications");

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await response.json();
      setApplications(data.data.applications);
      setSummary(data.data.summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load applications"
      );
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-bold text-4xl text-gray-900">
            Integrated Applications
          </h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor applications connected to Triumph Synergy
            ecosystem
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="text-center">
                <div className="font-bold text-3xl text-blue-600">
                  {summary.total}
                </div>
                <p className="text-gray-600 text-sm">Total Applications</p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-center">
                <div className="font-bold text-3xl text-green-600">
                  {summary.enabled}
                </div>
                <p className="text-gray-600 text-sm">Enabled</p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-center">
                <div className="font-bold text-3xl text-amber-600">
                  {summary.disabled}
                </div>
                <p className="text-gray-600 text-sm">Disabled</p>
              </div>
            </Card>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mb-6 flex justify-between">
          <div />
          <Button
            className="gap-2"
            disabled={loading}
            onClick={fetchApplications}
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {/* Applications List */}
        {!loading && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card
                className={`border-l-4 p-6 ${
                  app.enabled
                    ? "border-l-green-500 bg-green-50"
                    : "border-l-gray-300"
                }`}
                key={app.id}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {app.enabled && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      <h3 className="font-bold text-gray-900 text-xl">
                        {app.name}
                      </h3>
                      <span className="rounded bg-blue-100 px-3 py-1 font-medium text-blue-700 text-sm">
                        v{app.version}
                      </span>
                    </div>

                    <p className="mt-2 text-gray-600">{app.description}</p>

                    <div className="mt-4 space-y-2">
                      <p className="text-gray-700 text-sm">
                        <strong>Author:</strong> {app.author}
                      </p>
                      <p className="text-gray-700 text-sm">
                        <strong>Categories:</strong> {app.categories.join(", ")}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="mt-4">
                      <p className="mb-2 font-semibold text-gray-700 text-sm">
                        Features:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {app.features.map((feature) => (
                          <span
                            className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 text-xs"
                            key={feature}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="ml-4 flex flex-col items-center gap-2">
                    <div
                      className={`h-4 w-4 rounded-full ${
                        app.enabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="font-semibold text-gray-600 text-xs">
                      {app.enabled ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && applications.length === 0 && !error && (
          <Card className="border-amber-200 bg-amber-50 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
            <p className="mt-4 text-gray-700">No applications registered yet</p>
            <p className="mt-1 text-gray-600 text-sm">
              Applications will appear here when they are registered with the
              ecosystem
            </p>
          </Card>
        )}

        {/* Info Box */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 font-semibold text-blue-900">
            📚 Application Ecosystem Info
          </h3>
          <ul className="ml-4 list-disc space-y-1 text-blue-800 text-sm">
            <li>Each application integrates with Pi Payments automatically</li>
            <li>All payments are processed through official Pi SDK</li>
            <li>Consistent transaction tracking across the ecosystem</li>
            <li>Enable/disable apps to control access to ecosystem</li>
            <li>
              Reference:{" "}
              <a
                className="font-medium underline"
                href="https://minepi.com/blog/10-minutes-pi-payments"
                rel="noopener noreferrer"
                target="_blank"
              >
                minepi.com/blog/10-minutes-pi-payments
              </a>
            </li>
          </ul>
        </div>

        {/* API Reference */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-3 font-semibold text-gray-900">🔌 API Reference</h3>
          <div className="space-y-2 font-mono text-gray-700 text-sm">
            <div className="rounded border bg-white p-3">
              <strong>GET</strong> /api/ecosystem/applications
            </div>
            <div className="rounded border bg-white p-3">
              <strong>POST</strong> /api/ecosystem/applications
            </div>
            <div className="rounded border bg-white p-3">
              <strong>POST</strong> /api/ecosystem/payments
            </div>
            <div className="rounded border bg-white p-3">
              <strong>GET</strong> /api/ecosystem/payments?appId=xxx
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
