/**
 * Pi Network RPC Client
 * Full implementation for interacting with Pi Network RPC endpoints
 *
 * Supports both testnet (rpc.testnet.minepi.com) and mainnet (rpc.minepi.com)
 *
 * Features:
 * - Automatic testnet/mainnet switching
 * - Retry logic with exponential backoff
 * - Request/response validation
 * - Error handling and logging
 * - TypeScript support with full type safety
 */

export type PiNetwork = 'mainnet' | 'testnet';

export interface PiRPCConfig {
  network: PiNetwork;
  timeout: number;
  retries: number;
  endpoint?: string;
}

export interface PiRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params: any[];
  id: number;
}

export interface PiRPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

export interface PiTransaction {
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  timestamp?: number;
}

export interface PiBlock {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  transactions: PiTransaction[];
  gasUsed: string;
  gasLimit: string;
}

export interface PiBalance {
  address: string;
  balance: string;
  symbol: 'PI';
  decimals: 18;
}

/**
 * Pi Network RPC Client
 * Handles all RPC communications with Pi Network blockchain
 */
export class PiRPCClient {
  public config: PiRPCConfig;
  private requestId = 0;

  constructor(config: Partial<PiRPCConfig> = {}) {
    this.config = {
      network: config.network || 'mainnet',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      endpoint: config.endpoint || this.getDefaultEndpoint(config.network || 'mainnet'),
    };
  }

  private getDefaultEndpoint(network: PiNetwork): string {
    return network === 'testnet'
      ? 'https://rpc.testnet.minepi.com'
      : 'https://rpc.minepi.com';
  }

  /**
   * Make a raw RPC request
   */
  async makeRequest(method: string, params: any[] = []): Promise<any> {
    const request: PiRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(this.config.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: PiRPCResponse = await response.json();

        if (data.error) {
          throw new Error(`RPC Error ${data.error.code}: ${data.error.message}`);
        }

        return data.result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`RPC request failed after ${this.config.retries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Get current network
   */
  getNetwork(): PiNetwork {
    return this.config.network;
  }

  /**
   * Switch network
   */
  setNetwork(network: PiNetwork): void {
    this.config.network = network;
    this.config.endpoint = this.getDefaultEndpoint(network);
  }

  /**
   * Get client version
   */
  async getVersion(): Promise<string> {
    return this.makeRequest('pi_getVersion');
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<string> {
    return this.makeRequest('pi_getBlockNumber');
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<PiBalance> {
    const balance = await this.makeRequest('pi_getBalance', [address, 'latest']);

    return {
      address,
      balance,
      symbol: 'PI',
      decimals: 18,
    };
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<PiTransaction | null> {
    return this.makeRequest('pi_getTransactionByHash', [txHash]);
  }

  /**
   * Get block by number
   */
  async getBlockByNumber(blockNumber: string | number, includeTransactions = false): Promise<PiBlock | null> {
    const blockNum = typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber;
    return this.makeRequest('pi_getBlockByNumber', [blockNum, includeTransactions]);
  }

  /**
   * Get latest block
   */
  async getLatestBlock(includeTransactions = false): Promise<PiBlock | null> {
    return this.makeRequest('pi_getBlockByNumber', ['latest', includeTransactions]);
  }

  /**
   * Get transaction count for an address
   */
  async getTransactionCount(address: string): Promise<string> {
    return this.makeRequest('pi_getTransactionCount', [address, 'latest']);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: {
    from?: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<string> {
    return this.makeRequest('pi_estimateGas', [tx]);
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<string> {
    return this.makeRequest('pi_gasPrice');
  }

  /**
   * Send raw transaction
   */
  async sendRawTransaction(signedTx: string): Promise<string> {
    return this.makeRequest('pi_sendRawTransaction', [signedTx]);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    return this.makeRequest('pi_getTransactionReceipt', [txHash]);
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    chainId: string;
    networkId: string;
    name: string;
  }> {
    const [chainId, networkId] = await Promise.all([
      this.makeRequest('pi_chainId'),
      this.makeRequest('net_version'),
    ]);

    return {
      chainId,
      networkId,
      name: this.config.network === 'testnet' ? 'Pi Testnet' : 'Pi Mainnet',
    };
  }

  /**
   * Check if address is contract
   */
  async isContract(address: string): Promise<boolean> {
    const code = await this.makeRequest('pi_getCode', [address, 'latest']);
    return code !== '0x';
  }

  /**
   * Get contract code
   */
  async getCode(address: string): Promise<string> {
    return this.makeRequest('pi_getCode', [address, 'latest']);
  }

  /**
   * Call contract method (read-only)
   */
  async call(tx: {
    to: string;
    data: string;
    from?: string;
  }): Promise<string> {
    return this.makeRequest('pi_call', [tx, 'latest']);
  }
}

/**
 * Default RPC clients for mainnet and testnet
 */
export const piRPC = {
  mainnet: new PiRPCClient({ network: 'mainnet' }),
  testnet: new PiRPCClient({ network: 'testnet' }),
};

/**
 * Get RPC client for current environment
 */
export function getPiRPCClient(network?: PiNetwork): PiRPCClient {
  if (network) {
    return network === 'testnet' ? piRPC.testnet : piRPC.mainnet;
  }

  // Auto-detect based on environment
  const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';
  return isSandbox ? piRPC.testnet : piRPC.mainnet;
}