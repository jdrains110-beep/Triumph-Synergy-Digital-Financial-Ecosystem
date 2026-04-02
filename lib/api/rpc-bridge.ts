/**
 * RPC Bridge System - Triumph Synergy Digital Ecosystem
 *
 * Core bridge connecting:
 * - Pi Network Blockchain (mainnet/testnet via RPC)
 * - Horizon Data Layer (external data/structure)
 * - External World APIs & Services
 *
 * This module serves as the unified interface between the blockchain,
 * external data sources, and the wider digital ecosystem.
 *
 * Architecture:
 * ┌─────────────────────────────────────────┐
 * │   Triumph Synergy Digital Ecosystem     │
 * ├─────────────────────────────────────────┤
 * │        RPC Bridge (This Module)         │
 * ├─────────────────────────────────────────┤
 * │  Pi RPC  │  Horizon  │  External APIs  │
 * │  (Blockchain)│(Data) │  (World Bridge) │
 * └─────────────────────────────────────────┘
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type NetworkType = 'pi-mainnet' | 'pi-testnet' | 'horizon' | 'external';

export interface RPCBridgeConfig {
  piMainnetRpc: string;
  piTestnetRpc: string;
  horizonDataEndpoint: string;
  horizonApiKey?: string;
  externalApiEndpoint: string;
  timeout: number;
  retries: number;
  enableCaching: boolean;
  cacheTTL: number; // milliseconds
}

export interface BridgeRequest {
  network: NetworkType;
  method: string;
  params: Record<string, any>;
  timeout?: number;
}

export interface BridgeResponse<T = any> {
  success: boolean;
  network: NetworkType;
  method: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  cached?: boolean;
}

export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  chainId: 'pi-mainnet' | 'pi-testnet';
  timestamp: number;
}

export interface HorizonData {
  id: string;
  network: 'pi' | 'external';
  data: Record<string, any>;
  structure: Record<string, any>;
  timestamp: number;
}

// ============================================================================
// RPC Bridge Implementation
// ============================================================================

export class RPCBridge {
  private config: RPCBridgeConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private requestIdCounter = 0;

  constructor(config: Partial<RPCBridgeConfig> = {}) {
    this.config = {
      piMainnetRpc: config.piMainnetRpc || process.env.NEXT_PUBLIC_PI_RPC_MAINNET || 'https://rpc.minepi.com',
      piTestnetRpc: config.piTestnetRpc || process.env.NEXT_PUBLIC_PI_RPC_TESTNET || 'https://rpc.testnet.minepi.com',
      horizonDataEndpoint: config.horizonDataEndpoint || process.env.NEXT_PUBLIC_HORIZON_ENDPOINT || 'https://horizon.com/api/v1',
      horizonApiKey: config.horizonApiKey || process.env.HORIZON_API_KEY,
      externalApiEndpoint: config.externalApiEndpoint || process.env.NEXT_PUBLIC_EXTERNAL_API_ENDPOINT || 'https://api.triumph-synergy.pi',
      timeout: config.timeout || parseInt(process.env.NEXT_PUBLIC_PI_RPC_TIMEOUT || '30000'),
      retries: config.retries || parseInt(process.env.NEXT_PUBLIC_PI_RPC_RETRIES || '3'),
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes default
    };
  }

  /**
   * Route requests to appropriate network backend
   */
  async request<T = any>(bridgeRequest: BridgeRequest): Promise<BridgeResponse<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(bridgeRequest);

    // Check cache
    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.config.cacheTTL) {
        return {
          success: true,
          network: bridgeRequest.network,
          method: bridgeRequest.method,
          data: cached.data,
          timestamp: Date.now(),
          cached: true,
        };
      }
      this.cache.delete(cacheKey);
    }

    try {
      let result: any;

      switch (bridgeRequest.network) {
        case 'pi-mainnet':
          result = await this.requestPiNetwork(
            this.config.piMainnetRpc,
            bridgeRequest.method,
            bridgeRequest.params,
            bridgeRequest.timeout
          );
          break;

        case 'pi-testnet':
          result = await this.requestPiNetwork(
            this.config.piTestnetRpc,
            bridgeRequest.method,
            bridgeRequest.params,
            bridgeRequest.timeout
          );
          break;

        case 'horizon':
          result = await this.requestHorizon(bridgeRequest.method, bridgeRequest.params, bridgeRequest.timeout);
          break;

        case 'external':
          result = await this.requestExternal(bridgeRequest.method, bridgeRequest.params, bridgeRequest.timeout);
          break;

        default:
          throw new Error(`Unknown network: ${bridgeRequest.network}`);
      }

      // Cache successful result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return {
        success: true,
        network: bridgeRequest.network,
        method: bridgeRequest.method,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        network: bridgeRequest.network,
        method: bridgeRequest.method,
        error: {
          code: 'RPC_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Request Pi Network blockchain via RPC
   */
  private async requestPiNetwork(
    endpoint: string,
    method: string,
    params: Record<string, any>,
    timeout?: number
  ): Promise<any> {
    return await this.performRPCCall(endpoint, method, params, timeout);
  }

  /**
   * Request Horizon data layer
   * Bridge interface for accessing external data and structure
   */
  private async requestHorizon(
    method: string,
    params: Record<string, any>,
    timeout?: number
  ): Promise<HorizonData> {
    const timeoutMs = timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.horizonApiKey) {
        headers['Authorization'] = `Bearer ${this.config.horizonApiKey}`;
      }

      const response = await fetch(`${this.config.horizonDataEndpoint}/${method}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Horizon error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: `horizon-${Date.now()}-${Math.random()}`,
        network: 'pi',
        data: data.data || data,
        structure: data.structure || {},
        timestamp: Date.now(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Request external APIs (bridge to outside world)
   */
  private async requestExternal(
    method: string,
    params: Record<string, any>,
    timeout?: number
  ): Promise<any> {
    const timeoutMs = timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.externalApiEndpoint}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`External API error: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Perform JSON-RPC 2.0 call with retry logic
   */
  private async performRPCCall(
    endpoint: string,
    method: string,
    params: Record<string, any>,
    timeout?: number,
    attempt = 1
  ): Promise<any> {
    const timeoutMs = timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.requestIdCounter,
          method,
          params: [params],
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      if (attempt < this.config.retries) {
        // Exponential backoff
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.performRPCCall(endpoint, method, params, timeout, attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get current Pi blockchain status
   */
  async getPiBlockchainStatus(): Promise<BridgeResponse> {
    return this.request({
      network: 'pi-mainnet',
      method: 'eth_chainId',
      params: {},
    });
  }

  /**
   * Get Pi account balance
   */
  async getPiBalance(address: string): Promise<BridgeResponse> {
    return this.request({
      network: 'pi-mainnet',
      method: 'eth_getBalance',
      params: { account: address, block: 'latest' },
    });
  }

  /**
   * Get Horizon data structures
   */
  async getHorizonData(query: Record<string, any>): Promise<BridgeResponse<HorizonData>> {
    return this.request({
      network: 'horizon',
      method: 'query',
      params: query,
    });
  }

  /**
   * Send transaction through Pi Network
   */
  async sendPiTransaction(tx: {
    from: string;
    to: string;
    value: string;
    data?: string;
    gasLimit?: string;
  }): Promise<BridgeResponse> {
    return this.request({
      network: 'pi-mainnet',
      method: 'eth_sendTransaction',
      params: tx,
    });
  }

  /**
   * Bridge to external world - call external APIs
   */
  async bridgeExternalCall(method: string, params: Record<string, any>): Promise<BridgeResponse> {
    return this.request({
      network: 'external',
      method,
      params,
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: BridgeRequest): string {
    return `${request.network}:${request.method}:${JSON.stringify(request.params)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let bridgeInstance: RPCBridge | null = null;

export function initializeRPCBridge(config?: Partial<RPCBridgeConfig>): RPCBridge {
  if (!bridgeInstance) {
    bridgeInstance = new RPCBridge(config);
  }
  return bridgeInstance;
}

export function getRPCBridge(): RPCBridge {
  if (!bridgeInstance) {
    bridgeInstance = new RPCBridge();
  }
  return bridgeInstance;
}

export const rpcBridge = getRPCBridge();
