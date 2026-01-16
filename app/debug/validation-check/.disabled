"use client";

import { useEffect, useState } from "react";

export default function ValidationVerificationPage() {
  const [status, setStatus] = useState<{
    currentHost: string;
    isVercel: boolean;
    expectedKey: string;
    actualKey: string;
    keyMatch: boolean;
    loading: boolean;
    error?: string;
  }>({
    currentHost: "",
    isVercel: false,
    expectedKey: "",
    actualKey: "",
    keyMatch: false,
    loading: true,
  });

  useEffect(() => {
    const checkValidation = async () => {
      try {
        const host = window.location.host;
        const isVercel = host.includes("vercel.app");

        // Expected keys
        const testnetKey = "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3";
        const mainnetKey = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
        
        const expectedKey = isVercel ? testnetKey : mainnetKey;

        // Fetch actual key
        const response = await fetch("/validation-key.txt");
        const actualKey = (await response.text()).trim();

        setStatus({
          currentHost: host,
          isVercel,
          expectedKey,
          actualKey,
          keyMatch: actualKey === expectedKey,
          loading: false,
        });
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to check validation",
        }));
      }
    };

    checkValidation();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-gray-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="border-b-2 border-purple-500 pb-4">
          <h1 className="text-4xl font-bold">🔐 Pi Network Domain Verification</h1>
          <p className="mt-2 text-gray-400">Verify your domain validation keys are correctly configured</p>
        </div>

        {status.loading ? (
          <div className="rounded-lg bg-blue-900/20 border border-blue-500 p-6 text-center">
            <div className="text-lg">Checking validation key...</div>
          </div>
        ) : status.error ? (
          <div className="rounded-lg bg-red-900/30 border border-red-500 p-6">
            <div className="text-xl font-bold">❌ Error</div>
            <div className="mt-2">{status.error}</div>
          </div>
        ) : (
          <>
            {/* Current Configuration */}
            <div className={`rounded-lg border p-6 ${status.keyMatch ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
              <h2 className="text-2xl font-bold mb-4">
                {status.keyMatch ? '✅ Validation Key Correct' : '❌ Validation Key Mismatch'}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="font-semibold">Current Host:</span>
                  <span className="text-blue-400">{status.currentHost}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="font-semibold">Domain Type:</span>
                  <span className={status.isVercel ? "text-yellow-400" : "text-purple-400"}>
                    {status.isVercel ? "Testnet (Vercel)" : "Mainnet (Pi Net)"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="font-semibold">Key Match:</span>
                  <span className={status.keyMatch ? "text-green-400" : "text-red-400"}>
                    {status.keyMatch ? "✅ Match" : "❌ Mismatch"}
                  </span>
                </div>
              </div>
            </div>

            {/* Expected vs Actual */}
            <div className="rounded-lg bg-gray-800 border border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-4">Key Comparison</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Expected Key:</div>
                  <div className="font-mono text-xs bg-gray-900 p-3 rounded break-all text-green-400">
                    {status.expectedKey}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Actual Key (from /validation-key.txt):</div>
                  <div className={`font-mono text-xs bg-gray-900 p-3 rounded break-all ${status.keyMatch ? 'text-green-400' : 'text-red-400'}`}>
                    {status.actualKey}
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Guide */}
            <div className="rounded-lg bg-blue-900/20 border border-blue-500 p-6">
              <h2 className="text-xl font-bold mb-4">📖 Verification URLs</h2>
              <div className="space-y-3">
                <div className="bg-gray-900 p-4 rounded">
                  <div className="font-semibold text-yellow-400 mb-2">🔸 Testnet (Vercel)</div>
                  <div className="text-sm space-y-1">
                    <div>Domain: <code className="text-blue-300">https://triumph-synergy.vercel.app</code></div>
                    <div>Verification URL: <a href="https://triumph-synergy.vercel.app/validation-key.txt" target="_blank" className="text-blue-400 underline">https://triumph-synergy.vercel.app/validation-key.txt</a></div>
                    <div className="text-gray-400 text-xs mt-2">This domain should serve the TESTNET validation key</div>
                  </div>
                </div>
                <div className="bg-gray-900 p-4 rounded">
                  <div className="font-semibold text-purple-400 mb-2">🔸 Mainnet (Pi Net)</div>
                  <div className="text-sm space-y-1">
                    <div>Domain: <code className="text-blue-300">https://triumphsynergy0576.pinet.com</code></div>
                    <div>Verification URL: <a href="https://triumphsynergy0576.pinet.com/validation-key.txt" target="_blank" className="text-blue-400 underline">https://triumphsynergy0576.pinet.com/validation-key.txt</a></div>
                    <div className="text-gray-400 text-xs mt-2">This domain should serve the MAINNET validation key</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-lg bg-purple-900/20 border border-purple-500 p-6">
              <h2 className="text-xl font-bold mb-4">🚀 Next Steps</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Verify both URLs above return the correct validation keys</li>
                <li>Go to <a href="https://develop.pi" target="_blank" className="text-blue-400 underline">develop.pi</a> (testnet) and verify <strong>triumph-synergy.vercel.app</strong></li>
                <li>Go to <a href="https://developers.minepi.com" target="_blank" className="text-blue-400 underline">developers.minepi.com</a> (mainnet) and verify <strong>triumphsynergy0576.pinet.com</strong></li>
                <li>After verification is complete, re-enable the Vercel redirect in middleware.ts</li>
                <li>Test Pi Browser app access on both testnet and mainnet</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
