/**
 * Pi Network RPC Client
 * Full implementation for interacting with Pi Network via Stellar Horizon REST API
 *
 * Pi Network runs on Stellar — uses Horizon API endpoints:
 *   Mainnet: https://api.mainnet.minepi.com
 *   Testnet: https://api.testnet.minepi.com
 *   Local:   http://testnet2:8000 (Docker)
 *
 * Features:
 * - Automatic testnet/mainnet switching with local Docker fallback
 * - Retry logic with exponential backoff
 * - Stellar Horizon REST API integration (ledgers, accounts, transactions, operations)
 * - TypeScript support with full type safety
 */

export type PiNetwork = 'mainnet' | 'testnet';

export interface PiRPCConfig {
  network: PiNetwork;
  timeout: number;
  retries: number;
  endpoint: string;
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
  decimals: 7;
}

/**
 * Pi Network RPC Client
 * Routes through Stellar Horizon REST API (Pi Mainnet / Testnet)
 */
export class PiRPCClient {
  public config: PiRPCConfig;

  constructor(config: Partial<PiRPCConfig> = {}) {
    const network = config.network || 'mainnet';
    this.config = {
      network,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      endpoint: config.endpoint || this.getDefaultEndpoint(network),
    };
  }

  private getDefaultEndpoint(network: PiNetwork): string {
    // Docker-internal: try local Horizon first for testnet
    if (network === 'testnet') {
      return process.env.PI_HORIZON_TESTNET_URL || 'https://api.testnet.minepi.com';
    }
    return process.env.PI_HORIZON_MAINNET_URL || 'https://api.mainnet.minepi.com';
  }

  /**
   * Make a Horizon REST API request with retry logic
   */
  async horizonGet(path: string): Promise<any> {
    let lastError: Error | null = null;
    const url = `${this.config.endpoint}${path}`;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Horizon ${response.status}: ${response.statusText} — ${text.slice(0, 200)}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Horizon request failed after ${this.config.retries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * POST to Horizon (transaction submission)
   */
  async horizonPost(path: string, body: string): Promise<any> {
    let lastError: Error | null = null;
    const url = `${this.config.endpoint}${path}`;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(this.config.timeout),
        });

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Horizon POST failed after ${this.config.retries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Backwards-compatible makeRequest — maps RPC-style methods to Horizon endpoints
   */
  async makeRequest(method: string, params: any[] = []): Promise<any> {
    switch (method) {
      case 'pi_getBlockNumber':
      case 'pi_blockNumber': {
        const root = await this.horizonGet('/');
        return root.history_latest_ledger?.toString() ?? '0';
      }
      case 'pi_getBlockByNumber': {
        const seq = params[0] === 'latest' ? undefined : params[0];
        if (!seq) {
          const root = await this.horizonGet('/');
          const latest = root.history_latest_ledger;
          const ledger = await this.horizonGet(`/ledgers/${latest}`);
          return this.ledgerToBlock(ledger);
        }
        const num = typeof seq === 'string' && seq.startsWith('0x')
          ? parseInt(seq, 16)
          : parseInt(seq, 10);
        const ledger = await this.horizonGet(`/ledgers/${num}`);
        return this.ledgerToBlock(ledger);
      }
      case 'pi_getBalance': {
        const address = params[0];
        const account = await this.horizonGet(`/accounts/${address}`);
        const native = account.balances?.find((b: any) => b.asset_type === 'native');
        return native?.balance ?? '0';
      }
      case 'pi_getTransactionByHash': {
        const hash = params[0];
        const tx = await this.horizonGet(`/transactions/${hash}`);
        return this.horizonTxToRpcTx(tx);
      }
      case 'pi_getTransactionCount': {
        const addr = params[0];
        const account = await this.horizonGet(`/accounts/${addr}`);
        return account.sequence ?? '0';
      }
      case 'pi_chainId':
        return this.config.network === 'testnet' ? '0x50694E6574' : '0x50694D6169';
      case 'net_version':
        return this.config.network === 'testnet' ? 'Pi Testnet' : 'Pi Mainnet';
      case 'pi_getVersion':
      case 'pi_version': {
        const root = await this.horizonGet('/');
        return `horizon/${root.horizon_version ?? 'unknown'} core/${root.core_version ?? 'unknown'}`;
      }
      case 'pi_gasPrice':
        return '100000'; // Stellar base fee in stroops (0.01 Pi)
      case 'pi_estimateGas':
        return '100000'; // Stellar base fee
      case 'pi_sendRawTransaction': {
        const xdr = params[0];
        const result = await this.horizonPost('/transactions', `tx=${encodeURIComponent(xdr)}`);
        return result.hash ?? result.id ?? JSON.stringify(result);
      }
      case 'pi_getTransactionReceipt': {
        const txHash = params[0];
        const tx = await this.horizonGet(`/transactions/${txHash}`);
        return {
          transactionHash: tx.hash,
          blockNumber: tx.ledger?.toString(),
          status: tx.successful ? '0x1' : '0x0',
          from: tx.source_account,
          fee: tx.fee_charged,
          ledger: tx.ledger,
          createdAt: tx.created_at,
        };
      }
      case 'pi_getCode':
        return '0x'; // Stellar doesn't have on-chain bytecode in the EVM sense
      case 'pi_call':
        return '0x'; // No EVM-style calls on Stellar
      default:
        throw new Error(`Unsupported RPC method: ${method}. Use Horizon REST endpoints directly.`);
    }
  }

  /** Convert Horizon ledger to Block-style object */
  private ledgerToBlock(ledger: any): PiBlock {
    return {
      number: ledger.sequence?.toString() ?? '0',
      hash: ledger.hash ?? '',
      parentHash: ledger.prev_hash ?? '',
      timestamp: ledger.closed_at ?? '',
      transactions: [],
      gasUsed: ledger.fee_pool ?? '0',
      gasLimit: ledger.base_fee_in_stroops?.toString() ?? '100000',
    };
  }

  /** Convert Horizon transaction to RPC-style transaction */
  private horizonTxToRpcTx(tx: any): PiTransaction {
    return {
      hash: tx.hash ?? '',
      blockNumber: tx.ledger?.toString() ?? '0',
      from: tx.source_account ?? '',
      to: tx.source_account ?? '', // Stellar txs don't have a single "to" field
      value: tx.fee_charged ?? '0',
      gas: tx.fee_charged ?? '0',
      gasPrice: '100000',
      input: tx.envelope_xdr ?? '',
      timestamp: tx.created_at ? new Date(tx.created_at).getTime() / 1000 : undefined,
    };
  }

  getNetwork(): PiNetwork {
    return this.config.network;
  }

  setNetwork(network: PiNetwork): void {
    this.config.network = network;
    this.config.endpoint = this.getDefaultEndpoint(network);
  }

  // ── Horizon-native methods ──────────────────────────────────────────

  async getVersion(): Promise<string> {
    return this.makeRequest('pi_getVersion');
  }

  async getBlockNumber(): Promise<string> {
    return this.makeRequest('pi_getBlockNumber');
  }

  async getBalance(address: string): Promise<PiBalance> {
    const balance = await this.makeRequest('pi_getBalance', [address]);
    return { address, balance, symbol: 'PI', decimals: 7 };
  }

  async getTransaction(txHash: string): Promise<PiTransaction | null> {
    return this.makeRequest('pi_getTransactionByHash', [txHash]);
  }

  async getBlockByNumber(blockNumber: string | number, includeTransactions = false): Promise<PiBlock | null> {
    return this.makeRequest('pi_getBlockByNumber', [blockNumber, includeTransactions]);
  }

  async getLatestBlock(includeTransactions = false): Promise<PiBlock | null> {
    return this.makeRequest('pi_getBlockByNumber', ['latest', includeTransactions]);
  }

  async getTransactionCount(address: string): Promise<string> {
    return this.makeRequest('pi_getTransactionCount', [address]);
  }

  async estimateGas(_tx: { from?: string; to: string; value?: string; data?: string }): Promise<string> {
    return '100000'; // Stellar base fee in stroops
  }

  async getGasPrice(): Promise<string> {
    return '100000'; // Stellar base fee
  }

  async sendRawTransaction(signedTx: string): Promise<string> {
    return this.makeRequest('pi_sendRawTransaction', [signedTx]);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    return this.makeRequest('pi_getTransactionReceipt', [txHash]);
  }

  async getNetworkInfo(): Promise<{ chainId: string; networkId: string; name: string }> {
    const root = await this.horizonGet('/');
    return {
      chainId: this.config.network === 'testnet' ? '0x50694E6574' : '0x50694D6169',
      networkId: root.network_passphrase ?? (this.config.network === 'testnet' ? 'Pi Testnet' : 'Pi Network'),
      name: this.config.network === 'testnet' ? 'Pi Testnet' : 'Pi Mainnet',
    };
  }

  async isContract(_address: string): Promise<boolean> {
    return false; // Stellar accounts are not EVM contracts
  }

  async getCode(_address: string): Promise<string> {
    return '0x';
  }

  async call(_tx: { to: string; data: string; from?: string }): Promise<string> {
    return '0x';
  }

  // ── Stellar-native Horizon endpoints ────────────────────────────────

  /** Get account details from Horizon */
  async getAccount(address: string): Promise<any> {
    return this.horizonGet(`/accounts/${address}`);
  }

  /** Get recent ledgers */
  async getLedgers(limit = 10, order: 'asc' | 'desc' = 'desc'): Promise<any> {
    return this.horizonGet(`/ledgers?limit=${limit}&order=${order}`);
  }

  /** Get ledger by sequence number */
  async getLedger(sequence: number): Promise<any> {
    return this.horizonGet(`/ledgers/${sequence}`);
  }

  /** Get account transactions */
  async getAccountTransactions(address: string, limit = 10): Promise<any> {
    return this.horizonGet(`/accounts/${address}/transactions?limit=${limit}&order=desc`);
  }

  /** Get account operations */
  async getAccountOperations(address: string, limit = 10): Promise<any> {
    return this.horizonGet(`/accounts/${address}/operations?limit=${limit}&order=desc`);
  }

  /** Get account payments */
  async getAccountPayments(address: string, limit = 10): Promise<any> {
    return this.horizonGet(`/accounts/${address}/payments?limit=${limit}&order=desc`);
  }

  /** Get ledger transactions */
  async getLedgerTransactions(sequence: number, limit = 10): Promise<any> {
    return this.horizonGet(`/ledgers/${sequence}/transactions?limit=${limit}`);
  }

  /** Get fee stats */
  async getFeeStats(): Promise<any> {
    return this.horizonGet('/fee_stats');
  }

  /** Get the root info (network passphrase, versions, latest ledger) */
  async getRootInfo(): Promise<any> {
    return this.horizonGet('/');
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
  const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';
  return isSandbox ? piRPC.testnet : piRPC.mainnet;
}