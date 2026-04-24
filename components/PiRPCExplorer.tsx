"use client";

import { useState, useEffect } from 'react';
import { getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

interface PiRPCExplorerProps {
  className?: string;
}

export const PiRPCExplorer: React.FC<PiRPCExplorerProps> = ({ className = "" }) => {
  const [network, setNetwork] = useState<PiNetwork>('mainnet');
  const [method, setMethod] = useState('pi_getBlockNumber');
  const [params, setParams] = useState('[]');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const client = getPiRPCClient(network);

  useEffect(() => {
    loadNetworkInfo();
  }, [network]);

  const loadNetworkInfo = async () => {
    try {
      const info = await client.getNetworkInfo();
      setNetworkInfo(info);
    } catch (err) {
      console.error('Failed to load network info:', err);
    }
  };

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let parsedParams: any[] = [];
      if (params.trim()) {
        parsedParams = JSON.parse(params);
      }

      const response = await client.makeRequest(method, parsedParams);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const commonMethods = [
    { value: 'pi_getBlockNumber', label: 'Get Block Number' },
    { value: 'pi_getBalance', label: 'Get Balance', params: '["0x..."]' },
    { value: 'pi_getTransactionByHash', label: 'Get Transaction', params: '["0x..."]' },
    { value: 'pi_getBlockByNumber', label: 'Get Block', params: '["latest", false]' },
    { value: 'pi_gasPrice', label: 'Get Gas Price' },
    { value: 'net_version', label: 'Network Version' },
    { value: 'pi_chainId', label: 'Chain ID' },
  ];

  const selectMethod = (selectedMethod: string, defaultParams?: string) => {
    setMethod(selectedMethod);
    if (defaultParams) {
      setParams(defaultParams);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Pi Network RPC Explorer</h2>

      {/* Network Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Network
        </label>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as PiNetwork)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="mainnet">Mainnet (rpc.minepi.com)</option>
          <option value="testnet">Testnet (rpc.testnet.minepi.com)</option>
        </select>
      </div>

      {/* Network Info */}
      {networkInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold text-gray-800 mb-2">Network Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Chain ID:</span> {networkInfo.chainId}
            </div>
            <div>
              <span className="font-medium">Network ID:</span> {networkInfo.networkId}
            </div>
            <div>
              <span className="font-medium">Name:</span> {networkInfo.name}
            </div>
            <div>
              <span className="font-medium">Block:</span> {networkInfo.blockNumber || 'Loading...'}
            </div>
          </div>
        </div>
      )}

      {/* Method Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Common Methods
        </label>
        <div className="grid grid-cols-2 gap-2">
          {commonMethods.map((m) => (
            <button
              key={m.value}
              onClick={() => selectMethod(m.value, m.params)}
              className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Method Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          RPC Method
        </label>
        <input
          type="text"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="pi_getBlockNumber"
        />
      </div>

      {/* Parameters Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parameters (JSON array)
        </label>
        <textarea
          value={params}
          onChange={(e) => setParams(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          rows={3}
          placeholder='[]'
        />
      </div>

      {/* Execute Button */}
      <button
        onClick={executeQuery}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {loading ? 'Executing...' : 'Execute RPC Call'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* Result Display */}
      {result !== null && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">Result</h3>
          <pre className="text-green-700 text-sm whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};