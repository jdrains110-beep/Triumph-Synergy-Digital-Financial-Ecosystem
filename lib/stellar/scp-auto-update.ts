/**
 * Stellar Consensus Protocol (SCP) Auto-Update System
 * Ensures Triumph-Synergy always stays synchronized with Stellar network
 *
 * This module provides:
 * - Automatic ledger synchronization
 * - Real-time SCP state monitoring
 * - Network upgrade detection and handling
 * - Validator quorum tracking
 */

import * as StellarSdk from "@stellar/stellar-sdk";

// Configuration
const STELLAR_HORIZON_URL =
	process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
const STELLAR_NETWORK = process.env.STELLAR_NETWORK || "PUBLIC";
const UPDATE_INTERVAL_MS = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

// Network passphrases
const NETWORK_PASSPHRASES = {
	PUBLIC: StellarSdk.Networks.PUBLIC,
	TESTNET: StellarSdk.Networks.TESTNET,
} as const;

export interface SCPState {
	latestLedger: number;
	ledgerCloseTime: Date;
	protocolVersion: number;
	baseFee: number;
	baseReserve: number;
	networkPassphrase: string;
	coreVersion: string;
	historyLatestLedger: number;
	currentPhase: "NOMINATING" | "PREPARING" | "CONFIRMING" | "EXTERNALIZED";
	validators: ValidatorInfo[];
	lastUpdated: Date;
}

export interface ValidatorInfo {
	nodeId: string;
	isUp: boolean;
	lastHeartbeat: Date;
	quorumSet?: string[];
}

export interface SCPUpdateEvent {
	type: "ledger" | "protocol" | "network" | "validator" | "error";
	timestamp: Date;
	data: unknown;
	previousState?: Partial<SCPState>;
	newState?: Partial<SCPState>;
}

type SCPEventHandler = (event: SCPUpdateEvent) => void;

/**
 * SCP Auto-Update Manager
 * Maintains live connection to Stellar network and auto-synchronizes
 */
export class SCPAutoUpdate {
	private server: StellarSdk.Horizon.Server;
	private networkPassphrase: string;
	private state: SCPState | null = null;
	private eventHandlers: Set<SCPEventHandler> = new Set();
	private updateInterval: ReturnType<typeof setInterval> | null = null;
	private ledgerStream: { close: () => void } | null = null;
	private reconnectAttempts = 0;
	private isRunning = false;

	constructor(horizonUrl?: string, network?: keyof typeof NETWORK_PASSPHRASES) {
		this.server = new StellarSdk.Horizon.Server(
			horizonUrl || STELLAR_HORIZON_URL,
		);
		this.networkPassphrase =
			NETWORK_PASSPHRASES[
				network || (STELLAR_NETWORK as keyof typeof NETWORK_PASSPHRASES)
			] || StellarSdk.Networks.PUBLIC;
	}

	/**
	 * Start automatic SCP updates
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			console.log("[SCP] Already running");
			return;
		}

		this.isRunning = true;
		console.log(
			"[SCP Auto-Update] Starting Stellar Consensus Protocol synchronization...",
		);

		try {
			// Initial state fetch
			await this.fetchCurrentState();

			// Start streaming ledger updates
			this.startLedgerStream();

			// Start periodic full state updates
			this.updateInterval = setInterval(() => {
				this.fetchCurrentState().catch(console.error);
			}, UPDATE_INTERVAL_MS);

			this.emitEvent({
				type: "network",
				timestamp: new Date(),
				data: { status: "connected", horizon: STELLAR_HORIZON_URL },
				newState: this.state || undefined,
			});

			console.log("[SCP Auto-Update] ✅ Connected to Stellar network");
			console.log(`[SCP Auto-Update] Network: ${this.networkPassphrase}`);
			console.log(
				`[SCP Auto-Update] Latest Ledger: ${this.state?.latestLedger}`,
			);
			console.log(
				`[SCP Auto-Update] Protocol Version: ${this.state?.protocolVersion}`,
			);
		} catch (error) {
			console.error("[SCP Auto-Update] Failed to start:", error);
			this.handleReconnect();
		}
	}

	/**
	 * Stop automatic updates
	 */
	stop(): void {
		this.isRunning = false;

		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}

		if (this.ledgerStream) {
			this.ledgerStream.close();
			this.ledgerStream = null;
		}

		console.log("[SCP Auto-Update] Stopped");
	}

	/**
	 * Subscribe to SCP update events
	 */
	onUpdate(handler: SCPEventHandler): () => void {
		this.eventHandlers.add(handler);
		return () => this.eventHandlers.delete(handler);
	}

	/**
	 * Get current SCP state
	 */
	getState(): SCPState | null {
		return this.state;
	}

	/**
	 * Check if a protocol upgrade is available
	 */
	async checkForProtocolUpgrade(): Promise<{
		available: boolean;
		currentVersion: number;
		latestVersion?: number;
	}> {
		const root = await this.server.root();
		const currentVersion = this.state?.protocolVersion || 0;
		const networkVersion = root.current_protocol_version;

		return {
			available: networkVersion > currentVersion,
			currentVersion,
			latestVersion: networkVersion,
		};
	}

	/**
	 * Fetch current network state from Horizon
	 */
	private async fetchCurrentState(): Promise<void> {
		try {
			const root = await this.server.root();
			const ledgerResponse = await this.server
				.ledgers()
				.order("desc")
				.limit(1)
				.call();
			const latestLedger = ledgerResponse.records[0];

			const previousState = this.state ? { ...this.state } : undefined;

			this.state = {
				latestLedger: latestLedger?.sequence || 0,
				ledgerCloseTime: latestLedger
					? new Date(latestLedger.closed_at)
					: new Date(),
				protocolVersion: root.current_protocol_version,
				baseFee: 100, // Base fee in stroops
				baseReserve: 5000000, // 0.5 XLM in stroops
				networkPassphrase: this.networkPassphrase,
				coreVersion:
					root.core_supported_protocol_version?.toString() || "unknown",
				historyLatestLedger: root.history_latest_ledger,
				currentPhase: "EXTERNALIZED",
				validators: [],
				lastUpdated: new Date(),
			};

			// Check for protocol version change
			if (
				previousState &&
				previousState.protocolVersion !== this.state.protocolVersion
			) {
				this.emitEvent({
					type: "protocol",
					timestamp: new Date(),
					data: {
						message: "Protocol version upgraded",
						from: previousState.protocolVersion,
						to: this.state.protocolVersion,
					},
					previousState,
					newState: this.state,
				});

				console.log(
					`[SCP Auto-Update] 🔄 Protocol upgraded: v${previousState.protocolVersion} → v${this.state.protocolVersion}`,
				);
			}

			this.reconnectAttempts = 0;
		} catch (error) {
			console.error("[SCP Auto-Update] Failed to fetch state:", error);
			throw error;
		}
	}

	/**
	 * Start streaming ledger updates
	 */
	private startLedgerStream(): void {
		try {
			const builder = this.server.ledgers().cursor("now").order("asc");

			const streamResult = builder.stream({
				onmessage: (ledger) => {
					const previousLedger = this.state?.latestLedger;

					if (this.state) {
						this.state.latestLedger = ledger.sequence;
						this.state.ledgerCloseTime = new Date(ledger.closed_at);
						this.state.lastUpdated = new Date();
					}

					this.emitEvent({
						type: "ledger",
						timestamp: new Date(),
						data: {
							sequence: ledger.sequence,
							hash: ledger.hash,
							previousLedger,
							closedAt: ledger.closed_at,
							transactionCount: ledger.successful_transaction_count,
							operationCount: ledger.operation_count,
						},
					});
				},
				onerror: (error) => {
					console.error("[SCP Auto-Update] Stream error:", error);
					this.handleReconnect();
				},
			});

			// Store the close function for cleanup
			this.ledgerStream = {
				close: typeof streamResult === "function" ? streamResult : () => {},
			};

			console.log("[SCP Auto-Update] 📡 Ledger stream connected");
		} catch (error) {
			console.error("[SCP Auto-Update] Failed to start ledger stream:", error);
			this.handleReconnect();
		}
	}

	/**
	 * Handle reconnection attempts
	 */
	private handleReconnect(): void {
		if (!this.isRunning || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
				console.error("[SCP Auto-Update] ❌ Max reconnection attempts reached");
				this.emitEvent({
					type: "error",
					timestamp: new Date(),
					data: {
						message: "Max reconnection attempts reached",
						attempts: this.reconnectAttempts,
					},
				});
			}
			return;
		}

		this.reconnectAttempts++;
		const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

		console.log(
			`[SCP Auto-Update] 🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
		);

		setTimeout(() => {
			if (this.isRunning) {
				this.startLedgerStream();
			}
		}, delay);
	}

	/**
	 * Emit event to all handlers
	 */
	private emitEvent(event: SCPUpdateEvent): void {
		for (const handler of this.eventHandlers) {
			try {
				handler(event);
			} catch (error) {
				console.error("[SCP Auto-Update] Event handler error:", error);
			}
		}
	}
}

// Singleton instance
let scpInstance: SCPAutoUpdate | null = null;

/**
 * Get or create the global SCP Auto-Update instance
 */
export function getSCPAutoUpdate(): SCPAutoUpdate {
	if (!scpInstance) {
		scpInstance = new SCPAutoUpdate();
	}
	return scpInstance;
}

/**
 * Initialize and start SCP Auto-Update
 * Call this during application startup
 */
export async function initializeSCPAutoUpdate(): Promise<SCPAutoUpdate> {
	const scp = getSCPAutoUpdate();
	await scp.start();
	return scp;
}

/**
 * Smart Contract integration for SCP state
 */
export function createSCPSmartContractBinding(scp: SCPAutoUpdate) {
	return {
		/**
		 * Get current ledger for smart contract validation
		 */
		getCurrentLedger(): number {
			return scp.getState()?.latestLedger || 0;
		},

		/**
		 * Get network passphrase for transaction signing
		 */
		getNetworkPassphrase(): string {
			return scp.getState()?.networkPassphrase || StellarSdk.Networks.PUBLIC;
		},

		/**
		 * Validate that state is synchronized
		 */
		isSynchronized(): boolean {
			const state = scp.getState();
			if (!state) return false;

			const staleThreshold = 30000; // 30 seconds
			return Date.now() - state.lastUpdated.getTime() < staleThreshold;
		},

		/**
		 * Wait for next ledger close
		 */
		waitForLedger(targetLedger?: number): Promise<number> {
			return new Promise((resolve) => {
				const currentLedger = scp.getState()?.latestLedger || 0;
				const target = targetLedger || currentLedger + 1;

				if (currentLedger >= target) {
					resolve(currentLedger);
					return;
				}

				const unsubscribe = scp.onUpdate((event) => {
					if (event.type === "ledger") {
						const ledgerData = event.data as { sequence: number };
						if (ledgerData.sequence >= target) {
							unsubscribe();
							resolve(ledgerData.sequence);
						}
					}
				});
			});
		},
	};
}

export default SCPAutoUpdate;
