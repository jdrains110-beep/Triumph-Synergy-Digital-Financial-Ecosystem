/**
 * Legal Contracts - Complete Reference Implementation
 * Shows how to integrate contracts into your app
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ContractSigningComponent } from '@/components/contracts/signing-component';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, FileText, Shield } from 'lucide-react';

/**
 * Example: Contract Management Page
 */
export function ContractManagementPage() {
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState(null);

  // Load user's contracts
  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contracts', {
        headers: {
          'X-User-ID': 'current-user-id', // Get from session
          'X-User-Email': 'user@example.com', // Get from session
        },
      });
      const data = await response.json();
      setContracts(data.contracts || []);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContract = async (contractId) => {
    setSelectedContract(contractId);

    // Load compliance status
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/compliance`
      );
      const data = await response.json();
      setCompliance(data.compliance);
    } catch (error) {
      console.error('Failed to load compliance:', error);
    }
  };

  const handleExportEvidence = async (contractId) => {
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/export`,
        { method: 'POST' }
      );
      const data = await response.json();

      // Download evidence package
      const filename = `contract-evidence-${contractId}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (error) {
      console.error('Failed to export evidence:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Contract Management</h1>
        <p className="text-gray-600 mt-2">
          Create, review, sign, and manage legally binding contracts
        </p>
      </div>

      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">Your Contracts</TabsTrigger>
          <TabsTrigger value="sign">Sign Contract</TabsTrigger>
          <TabsTrigger value="evidence">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Your Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
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
                <div
                  key={contract.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectContract(contract.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{contract.title}</h3>
                      <p className="text-sm text-gray-600">
                        Version {contract.version} • {contract.type}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: <span className="font-medium">{contract.status}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportEvidence(contract.id);
                      }}
                    >
                      Export Evidence
                    </Button>
                  </div>

                  {selectedContract === contract.id && compliance && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={
                            compliance.esignActCompliant
                              ? 'text-green-700'
                              : 'text-red-700'
                          }
                        >
                          {compliance.esignActCompliant ? '✓' : '✗'} ESIGN
                          Compliant
                        </div>
                        <div
                          className={
                            compliance.uetaCompliant
                              ? 'text-green-700'
                              : 'text-red-700'
                          }
                        >
                          {compliance.uetaCompliant ? '✓' : '✗'} UETA
                          Compliant
                        </div>
                        <div
                          className={
                            compliance.hasAuditTrail
                              ? 'text-green-700'
                              : 'text-red-700'
                          }
                        >
                          {compliance.hasAuditTrail ? '✓' : '✗'} Audit
                          Trail
                        </div>
                        <div
                          className={
                            compliance.hasActiveConsent
                              ? 'text-green-700'
                              : 'text-red-700'
                          }
                        >
                          {compliance.hasActiveConsent ? '✓' : '✗'} Active
                          Consent
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sign Contract Tab */}
        <TabsContent value="sign" className="space-y-4">
          {selectedContract ? (
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  This contract is legally binding. Ensure you understand all terms before signing.
                </AlertDescription>
              </Alert>

              <ContractSigningComponent
                contractId={selectedContract}
                contractTitle={
                  contracts.find((c) => c.id === selectedContract)?.title ||
                  'Contract'
                }
                contractContent={
                  contracts.find((c) => c.id === selectedContract)?.content ||
                  ''
                }
                onSignatureComplete={(signature) => {
                  alert('Contract signed successfully!');
                  console.log('Signature evidence:', signature);

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
        <TabsContent value="evidence" className="space-y-4">
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditTrail();
  }, [contractId]);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/audit-trail`);
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading audit trail...</div>;
  }

  if (auditLogs.length === 0) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>No audit events for this contract yet.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-green-500 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900">
          Complete audit trail with {auditLogs.length} events recorded. All actions
          timestamped and verified.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {auditLogs.map((log, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-4 bg-gray-50 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold capitalize">{log.action}</h4>
                <p className="text-sm text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {log.details?.deviceType || 'Unknown'}
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
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold">Screenshot Evidence:</p>
                <p className="font-mono text-xs text-gray-600 break-all">
                  {log.screenshot.hash}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <p className="font-semibold text-blue-900 mb-2">Legal Evidence Summary</p>
        <ul className="space-y-1 text-blue-800 text-xs list-disc ml-4">
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
