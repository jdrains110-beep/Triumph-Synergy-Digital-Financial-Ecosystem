/**
 * Docker Node Bridge
 *
 * Runtime bridge between the Triumph Synergy tokenization platform and
 * the Pi Network node running in Docker Desktop (container: testnet2).
 *
 * Provides:
 * - Live connectivity to Pi Node's Horizon API (port 8000)
 * - Stellar-core status and info queries (port 11626)
 * - Supervisor service health monitoring
 * - Automatic reconnection and failover
 * - Transaction submission through the local node
 * - Ledger state synchronization for tokenization ops
 * - Event-driven health status for the tokenization engine
 *
 * Architecture:
 *   Tokenization Engine → Docker Node Bridge → testnet2:8000 (Horizon)
 *                                            → testnet2:11626 (stellar-core)
 *
 * When running inside Docker (triumph-app), uses pi-bridge network.
 * When running locally (dev), uses localhost port mappings.
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type NodeConnectionMode = "docker-network" | "localhost" | "remote";

export type NodeHealth = {
  connected: boolean;
  mode: NodeConnectionMode;
  horizon: HorizonStatus | null;
  stellarCore: StellarCoreStatus | null;
  lastChecked: Date;
  uptime: number;
  errors: string[];
};

export type HorizonStatus = {
  version: string;
  coreLatestLedger: number;
  historyLatestLedger: number;
  ingestLatestLedger: number;
  historyElderLedger: number;
  networkPassphrase: string;
  protocolVersion: number;
  currentProtocolVersion: number;
};

export type StellarCoreStatus = {
  state: string;
  build: string;
  network: string;
  protocolVersion: number;
  ledgerNum: number;
  ledgerAge: number;
  authenticatedPeers: number;
  pendingPeers: number;
  quorumPhase: string;
  quorumAgree: number;
  quorumDisagree: number;
  quorumMissing: number;
};

export type PeerInfo = {
  address: string;
  version: string;
  ledger: number;
  direction: "inbound" | "outbound";
};

export type TransactionSubmission = {
  hash: string;
  ledger: number;
  envelopeXdr: string;
  resultXdr: string;
  resultMetaXdr: string;
};

export interface DockerNodeBridgeConfig {
  /** Container name or host for Pi Node (default: testnet2 / localhost) */
  piNodeHost: string;
  /** Horizon API port (default: 8000) */
  horizonPort: number;
  /** Stellar-core HTTP port (default: 11626) */
  corePort: number;
  /** P2P port for peer connectivity (default: 31402) */
  peerPort: number;
  /** Health check interval in ms (default: 30000) */
  healthCheckInterval: number;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeout: number;
  /** Max retry attempts for failed requests (default: 3) */
  maxRetries: number;
  /** Whether to auto-reconnect on failure (default: true) */
  autoReconnect: boolean;
}

// ============================================================================
// Docker Node Bridge
// ============================================================================

const DEFAULT_CONFIG: DockerNodeBridgeConfig = {
  piNodeHost: process.env.PI_NODE_HOST || "localhost",
  horizonPort: Number.parseInt(process.env.PI_NODE_API_PORT || "8000", 10),
  corePort: 11626,
  peerPort: Number.parseInt(process.env.PI_NODE_PORT || "31402", 10),
  healthCheckInterval: 30_000,
  connectionTimeout: 10_000,
  maxRetries: 3,
  autoReconnect: true,
};

export class DockerNodeBridge extends EventEmitter {
  private config: DockerNodeBridgeConfig;
  private mode: NodeConnectionMode;
  private connected = false;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: Date;
  private lastHealth: NodeHealth | null = null;
  private errorLog: string[] = [];

  constructor(config?: Partial<DockerNodeBridgeConfig>) {
    super();
    this.setMaxListeners(50);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();

    // Detect mode: Docker network (pi-bridge) or localhost
    if (process.env.DOCKER_BUILD === "true" || process.env.PI_NODE_HOST === "testnet2") {
      this.mode = "docker-network";
    } else if (this.config.piNodeHost === "localhost" || this.config.piNodeHost === "127.0.0.1") {
      this.mode = "localhost";
    } else {
      this.mode = "remote";
    }
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Initialize the bridge — verify connectivity and start health monitoring
   */
  async connect(): Promise<boolean> {
    try {
      const horizonOk = await this.checkHorizon();
      const coreOk = await this.checkStellarCore();

      this.connected = horizonOk || coreOk;

      if (this.connected) {
        this.emit("connected", { mode: this.mode });

        if (this.config.autoReconnect && !this.healthCheckTimer) {
          this.healthCheckTimer = setInterval(
            () => this.performHealthCheck(),
            this.config.healthCheckInterval
          );
        }
      } else {
        this.logError("Failed to connect to Pi Node — neither Horizon nor stellar-core responded");
        this.emit("disconnected", { reason: "initial-connect-failed" });
      }

      return this.connected;
    } catch (error) {
      this.logError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      this.connected = false;
      return false;
    }
  }

  /**
   * Disconnect and stop health monitoring
   */
  disconnect(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.connected = false;
    this.emit("disconnected", { reason: "manual" });
  }

  /**
   * Check if bridge is connected and healthy
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the current connection mode
   */
  getMode(): NodeConnectionMode {
    return this.mode;
  }

  // ==========================================================================
  // Horizon API (port 8000)
  // ==========================================================================

  /**
   * Get Horizon root info — version, ledger state, network
   */
  async getHorizonInfo(): Promise<HorizonStatus> {
    const data = await this.fetchHorizon<Record<string, unknown>>("/");
    return {
      version: String(data.horizon_version || ""),
      coreLatestLedger: Number(data.core_latest_ledger || 0),
      historyLatestLedger: Number(data.history_latest_ledger || 0),
      ingestLatestLedger: Number(data.ingest_latest_ledger || 0),
      historyElderLedger: Number(data.history_elder_ledger || 0),
      networkPassphrase: String(data.network_passphrase || ""),
      protocolVersion: Number(data.protocol_version || 0),
      currentProtocolVersion: Number(data.current_protocol_version || 0),
    };
  }

  /**
   * Query a Stellar account through the local Horizon instance
   */
  async getAccount(accountId: string): Promise<Record<string, unknown>> {
    return this.fetchHorizon(`/accounts/${encodeURIComponent(accountId)}`);
  }

  /**
   * Get transaction details by hash
   */
  async getTransaction(txHash: string): Promise<Record<string, unknown>> {
    return this.fetchHorizon(`/transactions/${encodeURIComponent(txHash)}`);
  }

  /**
   * Get recent transactions for an account
   */
  async getAccountTransactions(
    accountId: string,
    limit = 10
  ): Promise<Record<string, unknown>> {
    return this.fetchHorizon(
      `/accounts/${encodeURIComponent(accountId)}/transactions?limit=${limit}&order=desc`
    );
  }

  /**
   * Get ledger details
   */
  async getLedger(sequence: number): Promise<Record<string, unknown>> {
    return this.fetchHorizon(`/ledgers/${sequence}`);
  }

  /**
   * Get latest ledger
   */
  async getLatestLedger(): Promise<number> {
    const info = await this.getHorizonInfo();
    return info.coreLatestLedger;
  }

  /**
   * Submit a signed transaction XDR to the local Horizon instance
   */
  async submitTransaction(txXdr: string): Promise<TransactionSubmission> {
    const url = this.buildHorizonUrl("/transactions");
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.connectionTimeout
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(txXdr)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Transaction submission failed (${response.status}): ${errorBody}`);
      }

      const data = await response.json() as Record<string, unknown>;
      return {
        hash: String(data.hash || ""),
        ledger: Number(data.ledger || 0),
        envelopeXdr: String(data.envelope_xdr || ""),
        resultXdr: String(data.result_xdr || ""),
        resultMetaXdr: String(data.result_meta_xdr || ""),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Check if an account exists on the local node
   */
  async accountExists(accountId: string): Promise<boolean> {
    try {
      await this.getAccount(accountId);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Stellar-Core API (port 11626)
  // ==========================================================================

  /**
   * Get stellar-core /info — state, ledger, peers, quorum
   */
  async getStellarCoreInfo(): Promise<StellarCoreStatus> {
    const data = await this.fetchCore<{ info: Record<string, unknown> }>("/info");
    const info = data.info || {};
    const peers = (info.peers || {}) as Record<string, number>;
    const quorum = (info.quorum || {}) as Record<string, unknown>;
    const qset = (quorum.qset || quorum[Object.keys(quorum)[0]] || {}) as Record<string, unknown>;
    const ledger = (info.ledger || {}) as Record<string, unknown>;

    return {
      state: String(info.state || "unknown"),
      build: String(info.build || ""),
      network: String(info.network || ""),
      protocolVersion: Number(info.protocol_version || 0),
      ledgerNum: Number(ledger.num || info.ledger || 0),
      ledgerAge: Number(ledger.age || 0),
      authenticatedPeers: Number(peers.authenticated_count || 0),
      pendingPeers: Number(peers.pending_count || 0),
      quorumPhase: String(qset.phase || ""),
      quorumAgree: Number(qset.agree || 0),
      quorumDisagree: Number(qset.disagree || 0),
      quorumMissing: Number(qset.missing || 0),
    };
  }

  /**
   * Get authenticated peers — inbound and outbound
   */
  async getPeers(): Promise<{ inbound: PeerInfo[]; outbound: PeerInfo[] }> {
    const data = await this.fetchCore<{
      authenticated_peers: {
        inbound: Array<Record<string, unknown>>;
        outbound: Array<Record<string, unknown>>;
      };
    }>("/peers");

    const mapPeer = (
      p: Record<string, unknown>,
      direction: "inbound" | "outbound"
    ): PeerInfo => ({
      address: String(p.address || ""),
      version: String(p.ver || ""),
      ledger: Number(p.ledger || 0),
      direction,
    });

    return {
      inbound: (data.authenticated_peers?.inbound || []).map((p) =>
        mapPeer(p, "inbound")
      ),
      outbound: (data.authenticated_peers?.outbound || []).map((p) =>
        mapPeer(p, "outbound")
      ),
    };
  }

  /**
   * Get stellar-core quorum info
   */
  async getQuorum(): Promise<Record<string, unknown>> {
    return this.fetchCore("/quorum");
  }

  /**
   * Trigger stellar-core maintenance (compact DB, etc.)
   */
  async triggerMaintenance(): Promise<Record<string, unknown>> {
    return this.fetchCore("/maintenance?queue=true");
  }

  // ==========================================================================
  // Health Monitoring
  // ==========================================================================

  /**
   * Comprehensive health check — Horizon + stellar-core + node sync
   */
  async getHealth(): Promise<NodeHealth> {
    let horizon: HorizonStatus | null = null;
    let stellarCore: StellarCoreStatus | null = null;
    const errors: string[] = [];

    try {
      horizon = await this.getHorizonInfo();
    } catch (e) {
      errors.push(`Horizon: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      stellarCore = await this.getStellarCoreInfo();
    } catch (e) {
      errors.push(`Stellar-core: ${e instanceof Error ? e.message : String(e)}`);
    }

    const connected = horizon !== null || stellarCore !== null;
    this.connected = connected;

    const health: NodeHealth = {
      connected,
      mode: this.mode,
      horizon,
      stellarCore,
      lastChecked: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      errors,
    };

    this.lastHealth = health;
    return health;
  }

  /**
   * Get the last cached health status (no network call)
   */
  getLastHealth(): NodeHealth | null {
    return this.lastHealth;
  }

  /**
   * Check if the node is synced (stellar-core state = "Synced!")
   */
  async isSynced(): Promise<boolean> {
    try {
      const core = await this.getStellarCoreInfo();
      return core.state.includes("Synced");
    } catch {
      return false;
    }
  }

  /**
   * Get the current ingestion gap (core latest - ingest latest)
   */
  async getIngestionGap(): Promise<number> {
    try {
      const horizon = await this.getHorizonInfo();
      return horizon.coreLatestLedger - horizon.ingestLatestLedger;
    } catch {
      return -1;
    }
  }

  /**
   * Wait until the node is synced (with timeout)
   */
  async waitForSync(timeoutMs = 120_000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isSynced()) return true;
      await new Promise((r) => setTimeout(r, 5000));
    }
    return false;
  }

  // ==========================================================================
  // Tokenization-Specific Methods
  // ==========================================================================

  /**
   * Verify a tokenization transaction exists on the local node
   */
  async verifyTokenizationTx(txHash: string): Promise<{
    exists: boolean;
    successful: boolean;
    ledger: number;
    createdAt: string;
    memoType: string;
    memo: string;
    operationCount: number;
  }> {
    try {
      const tx = await this.getTransaction(txHash) as Record<string, unknown>;
      return {
        exists: true,
        successful: Boolean(tx.successful),
        ledger: Number(tx.ledger_attr || tx.ledger || 0),
        createdAt: String(tx.created_at || ""),
        memoType: String(tx.memo_type || ""),
        memo: String(tx.memo || ""),
        operationCount: Number(tx.operation_count || 0),
      };
    } catch {
      return {
        exists: false,
        successful: false,
        ledger: 0,
        createdAt: "",
        memoType: "",
        memo: "",
        operationCount: 0,
      };
    }
  }

  /**
   * Get the data entries (manageData) for a tokenization account
   * Used to verify on-chain tokenization bindings
   */
  async getTokenizationData(
    accountId: string
  ): Promise<Record<string, string>> {
    try {
      const account = await this.getAccount(accountId) as Record<string, unknown>;
      const dataAttr = (account.data_attr || account.data || {}) as Record<string, string>;

      // Filter for tokenization-specific keys (ts:*)
      const tokenData: Record<string, string> = {};
      for (const [key, value] of Object.entries(dataAttr)) {
        if (key.startsWith("ts:")) {
          try {
            tokenData[key] = Buffer.from(value, "base64").toString("utf-8");
          } catch {
            tokenData[key] = value;
          }
        }
      }
      return tokenData;
    } catch {
      return {};
    }
  }

  /**
   * Get comprehensive node status for the tokenization dashboard
   */
  async getDashboardStatus(): Promise<{
    node: NodeHealth;
    peers: { inbound: PeerInfo[]; outbound: PeerInfo[] };
    readyForTokenization: boolean;
    blockchainSynced: boolean;
    horizonOperational: boolean;
    latestLedger: number;
    ingestionGap: number;
    networkPassphrase: string;
  }> {
    const node = await this.getHealth();
    let peers = { inbound: [] as PeerInfo[], outbound: [] as PeerInfo[] };

    try {
      peers = await this.getPeers();
    } catch {
      // Peers endpoint may not be accessible
    }

    const horizonOk = node.horizon !== null;
    const coreOk =
      node.stellarCore !== null && node.stellarCore.state.includes("Synced");
    const gap = node.horizon
      ? node.horizon.coreLatestLedger - node.horizon.ingestLatestLedger
      : -1;

    return {
      node,
      peers,
      readyForTokenization: horizonOk && coreOk && gap <= 5,
      blockchainSynced: coreOk,
      horizonOperational: horizonOk,
      latestLedger: node.horizon?.coreLatestLedger || 0,
      ingestionGap: gap,
      networkPassphrase:
        node.horizon?.networkPassphrase || node.stellarCore?.network || "",
    };
  }

  // ==========================================================================
  // Internal HTTP Helpers
  // ==========================================================================

  private buildHorizonUrl(path: string): string {
    const host =
      this.mode === "docker-network"
        ? this.config.piNodeHost
        : "localhost";
    const port =
      this.mode === "docker-network"
        ? this.config.horizonPort
        : (process.env.PI_NODE_API_PORT || "31401");
    return `http://${host}:${port}${path}`;
  }

  private buildCoreUrl(path: string): string {
    const host =
      this.mode === "docker-network"
        ? this.config.piNodeHost
        : "localhost";
    return `http://${host}:${this.config.corePort}${path}`;
  }

  private async fetchHorizon<T>(path: string): Promise<T> {
    return this.fetchWithRetry<T>(this.buildHorizonUrl(path));
  }

  private async fetchCore<T>(path: string): Promise<T> {
    return this.fetchWithRetry<T>(this.buildCoreUrl(path));
  }

  private async fetchWithRetry<T>(
    url: string,
    attempt = 1
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.connectionTimeout
    );

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise((r) =>
          setTimeout(r, Math.pow(2, attempt - 1) * 1000)
        );
        return this.fetchWithRetry<T>(url, attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async checkHorizon(): Promise<boolean> {
    try {
      await this.getHorizonInfo();
      return true;
    } catch {
      return false;
    }
  }

  private async checkStellarCore(): Promise<boolean> {
    try {
      await this.getStellarCoreInfo();
      return true;
    } catch {
      return false;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealth();
      if (!health.connected && this.connected) {
        this.connected = false;
        this.emit("disconnected", { reason: "health-check-failed" });
      } else if (health.connected && !this.connected) {
        this.connected = true;
        this.emit("reconnected", { mode: this.mode });
      }
      this.emit("health", health);
    } catch (error) {
      this.logError(
        `Health check error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private logError(message: string): void {
    this.errorLog.push(`[${new Date().toISOString()}] ${message}`);
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const dockerNodeBridge = new DockerNodeBridge();
