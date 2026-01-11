/**
 * Legal Contracts - Complete Reference Implementation
 * Shows how to integrate contracts into your app
 */

"use client";

import { CheckCircle2, FileText, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ContractSigningComponent } from "@/components/contracts/signing-component";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Contract = {
  id: string;
  type: string;
  title: string;
  version: string;
  content: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type ComplianceStatus = {
  esignActCompliant: boolean;
  uetaCompliant: boolean;
  hasAuditTrail: boolean;
  hasActiveConsent: boolean;
  [key: string]: any;
};

type AuditLogEntry = {
  id: string;
  action: string;
  timestamp: string | Date;
  userId: string;
  ipAddress: string;
  userAgent: string;
  details?: {
    deviceType?: string;
    city?: string;
    country?: string;
    browser?: string;
    platform?: string;
    [key: string]: any;
  };
  screenshot?: {
    hash: string;
    timestamp: string | Date;
    description: string;
  };
};

/**
 * Example: Contract Management Page
 */
export function ContractManagementPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/contracts", {
        headers: {
          "X-User-ID": "current-user-id", // Get from session
          "X-User-Email": "user@example.com", // Get from session
        },
      });
      const data = await response.json();
      setContracts(data.contracts || []);
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user's contracts
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleSelectContract = async (contractId: string) => {
    setSelectedContract(contractId);

    // Load compliance status
    try {
      const response = await fetch(`/api/contracts/${contractId}/compliance`);
      const data = await response.json();
      setCompliance(data.compliance);
    } catch (error) {
      console.error("Failed to load compliance:", error);
    }
  };

  const handleExportEvidence = async (contractId: string) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/export`, {
        method: "POST",
      });
      const data = await response.json();

      // Download evidence package
      const filename = `contract-evidence-${contractId}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch (error) {
      console.error("Failed to export evidence:", error);
    }
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="font-bold text-3xl">Contract Management</h1>
        <p className="mt-2 text-gray-600">
          Create, review, sign, and manage legally binding contracts
        </p>
      </div>

      <Tabs className="w-full" defaultValue="contracts">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">Your Contracts</TabsTrigger>
          <TabsTrigger value="sign">Sign Contract</TabsTrigger>
          <TabsTrigger value="evidence">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Your Contracts Tab */}
        <TabsContent className="space-y-4" value="contracts">
          {contracts.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No contracts yet. Create one to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <button
                  className="w-full text-left rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                  key={contract.id}
                  onClick={() => handleSelectContract(contract.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{contract.title}</h3>
                      <p className="text-gray-600 text-sm">
                        Version {contract.version} • {contract.type}
                      </p>
                      <p className="mt-1 text-gray-500 text-xs">
                        Status:{" "}
                        <span className="font-medium">{contract.status}</span>
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportEvidence(contract.id);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Export Evidence
                    </Button>
                  </div>

                  {selectedContract === contract.id && compliance && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={
                            compliance.esignActCompliant
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {compliance.esignActCompliant ? "✓" : "✗"} ESIGN
                          Compliant
                        </div>
                        <div
                          className={
                            compliance.uetaCompliant
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {compliance.uetaCompliant ? "✓" : "✗"} UETA Compliant
                        </div>
                        <div
                          className={
                            compliance.hasAuditTrail
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {compliance.hasAuditTrail ? "✓" : "✗"} Audit Trail
                        </div>
                        <div
                          className={
                            compliance.hasActiveConsent
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {compliance.hasActiveConsent ? "✓" : "✗"} Active
                          Consent
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sign Contract Tab */}
        <TabsContent className="space-y-4" value="sign">
          {selectedContract ? (
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  This contract is legally binding. Ensure you understand all
                  terms before signing.
                </AlertDescription>
              </Alert>

              <ContractSigningComponent
                contractContent={
                  contracts.find((c) => c.id === selectedContract)?.content ||
                  ""
                }
                contractId={selectedContract}
                contractTitle={
                  contracts.find((c) => c.id === selectedContract)?.title ||
                  "Contract"
                }
                onSignatureComplete={(signature) => {
                  alert("Contract signed successfully!");
                  console.log("Signature evidence:", signature);

                  // Reload contracts to update status
                  loadContracts();
                  setSelectedContract(null);
                }}
              />
            </div>
          ) : (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Select a contract from the "Your Contracts" tab to sign it.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent className="space-y-4" value="evidence">
          {selectedContract ? (
            <ContractAuditTrailViewer contractId={selectedContract} />
          ) : (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Select a contract to view its audit trail and signing evidence.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Audit Trail Viewer Component
 */
function ContractAuditTrailViewer({ contractId }: { contractId: string }) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditTrail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/audit-trail`);
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to load audit trail:", error);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    loadAuditTrail();
  }, [loadAuditTrail]);

  if (loading) {
    return <div className="py-8 text-center">Loading audit trail...</div>;
  }

  if (auditLogs.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          No audit events for this contract yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900">
          Complete audit trail with {auditLogs.length} events recorded. All
          actions timestamped and verified.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div
            className="space-y-2 rounded-lg border bg-gray-50 p-4"
            key={`${log.timestamp}-${log.action}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold capitalize">{log.action}</h4>
                <p className="text-gray-600 text-sm">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
              <span className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-xs">
                {log.details?.deviceType || "Unknown"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">IP Address:</span>
                <p className="font-mono text-xs">{log.ipAddress}</p>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <p className="text-xs">
                  {log.details?.city}, {log.details?.country}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Browser:</span>
                <p className="text-xs">{log.details?.browser}</p>
              </div>
              <div>
                <span className="text-gray-500">Platform:</span>
                <p className="text-xs">{log.details?.platform}</p>
              </div>
            </div>

            {log.screenshot && (
              <div className="border-t pt-2">
                <p className="font-semibold text-xs">Screenshot Evidence:</p>
                <p className="break-all font-mono text-gray-600 text-xs">
                  {log.screenshot.hash}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
        <p className="mb-2 font-semibold text-blue-900">
          Legal Evidence Summary
        </p>
        <ul className="ml-4 list-disc space-y-1 text-blue-800 text-xs">
          <li>All signing events timestamped with timezone</li>
          <li>Device fingerprints prevent unauthorized access</li>
          <li>Geographic location recorded for fraud detection</li>
          <li>IP addresses logged for audit compliance</li>
          <li>Screenshot evidence hashed with SHA-256</li>
          <li>Complete chain of custody maintained</li>
          <li>ESIGN Act & UETA compliant</li>
        </ul>
      </div>
    </div>
  );
}

export default ContractManagementPage;
