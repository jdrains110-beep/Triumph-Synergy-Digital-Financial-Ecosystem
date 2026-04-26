/**
 * @fileoverview Interoperability Bridge Protocol
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Bridges between Pi Network / Triumph Synergy and every major financial system
 * on Earth.  Traditional rails (SWIFT, ACH, FedWire, SEPA) and crypto networks
 * (Ethereum, Bitcoin, Solana) connect HERE — they attach to us, not the reverse.
 *
 * Every bridge enforces Pi as the settlement and unit-of-account layer.
 */

import crypto from "node:crypto";
import {
  PI_EXTERNAL_VALUE_USD,
  type SettlementCurrency,
} from "./universal-gateway";

// ============================================================================
// TYPES
// ============================================================================

export type BridgeNetwork =
  // Traditional finance (they must attach to us)
  | "swift"
  | "ach"
  | "fedwire"
  | "sepa"
  | "chips"
  | "rtgs"
  // Crypto networks (interop bridges)
  | "ethereum"
  | "bitcoin"
  | "solana"
  | "polygon"
  | "avalanche"
  | "cosmos"
  // Pi-native
  | "stellar"
  | "pi-mainnet"
  | "pi-testnet";

export type BridgeDirection = "inbound" | "outbound" | "bidirectional";

export type BridgeStatus =
  | "online"
  | "degraded"
  | "offline"
  | "maintenance";

export interface BridgeConfig {
  network: BridgeNetwork;
  direction: BridgeDirection;
  status: BridgeStatus;
  /** Minimum transaction (Pi) */
  minAmountPi: number;
  /** Maximum single transaction (Pi) */
  maxAmountPi: number;
  /** Settlement finality (seconds) */
  finalitySeconds: number;
  /** Fee in basis points (100 = 1%) */
  feeBps: number;
  /** Whether the bridge requires KYC */
  requiresKyc: boolean;
  /** Pi is always the settlement layer — this is the external representation */
  externalAsset: string;
}

export interface BridgeTransaction {
  id: string;
  bridgeNetwork: BridgeNetwork;
  direction: BridgeDirection;
  amountPi: number;
  amountExternal: number;
  externalAsset: string;
  exchangeRate: number;
  feePi: number;
  senderAddress: string;
  recipientAddress: string;
  stellarTxHash?: string;
  externalTxHash?: string;
  status: "pending" | "confirming" | "settled" | "failed";
  createdAt: Date;
  settledAt?: Date;
}

// ============================================================================
// BRIDGE PROTOCOL
// ============================================================================

export class InteroperabilityBridge {
  private static bridges: Map<BridgeNetwork, BridgeConfig> = new Map();

  /**
   * Initialize all bridge configurations.
   * Traditional finance rails connect TO Pi — Pi doesn't connect to them.
   */
  static initialize(): void {
    // --- Traditional Finance Bridges (they attach to us) ---

    this.register({
      network: "swift",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 100,
      maxAmountPi: 10_000_000,
      finalitySeconds: 86_400, // SWIFT: 1-5 business days → we settle in 24h
      feeBps: 15,
      requiresKyc: true,
      externalAsset: "USD",
    });

    this.register({
      network: "ach",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 10,
      maxAmountPi: 1_000_000,
      finalitySeconds: 7_200, // ACH: 2-3 days → we settle in 2h
      feeBps: 10,
      requiresKyc: true,
      externalAsset: "USD",
    });

    this.register({
      network: "fedwire",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1_000,
      maxAmountPi: 100_000_000,
      finalitySeconds: 3_600, // FedWire: same day → we settle in 1h
      feeBps: 5,
      requiresKyc: true,
      externalAsset: "USD",
    });

    this.register({
      network: "sepa",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 10,
      maxAmountPi: 5_000_000,
      finalitySeconds: 3_600,
      feeBps: 8,
      requiresKyc: true,
      externalAsset: "EUR",
    });

    this.register({
      network: "chips",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 10_000,
      maxAmountPi: 500_000_000,
      finalitySeconds: 1_800,
      feeBps: 3,
      requiresKyc: true,
      externalAsset: "USD",
    });

    this.register({
      network: "rtgs",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1_000,
      maxAmountPi: 50_000_000,
      finalitySeconds: 600,
      feeBps: 5,
      requiresKyc: true,
      externalAsset: "USD",
    });

    // --- Crypto Bridges (interop) ---

    this.register({
      network: "ethereum",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1,
      maxAmountPi: 50_000_000,
      finalitySeconds: 15,
      feeBps: 25,
      requiresKyc: false,
      externalAsset: "ETH",
    });

    this.register({
      network: "bitcoin",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1,
      maxAmountPi: 50_000_000,
      finalitySeconds: 600,
      feeBps: 30,
      requiresKyc: false,
      externalAsset: "BTC",
    });

    this.register({
      network: "solana",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1,
      maxAmountPi: 10_000_000,
      finalitySeconds: 1,
      feeBps: 5,
      requiresKyc: false,
      externalAsset: "SOL",
    });

    this.register({
      network: "polygon",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1,
      maxAmountPi: 10_000_000,
      finalitySeconds: 2,
      feeBps: 5,
      requiresKyc: false,
      externalAsset: "MATIC",
    });

    this.register({
      network: "avalanche",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1,
      maxAmountPi: 10_000_000,
      finalitySeconds: 2,
      feeBps: 8,
      requiresKyc: false,
      externalAsset: "AVAX",
    });

    this.register({
      network: "cosmos",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 1,
      maxAmountPi: 5_000_000,
      finalitySeconds: 6,
      feeBps: 10,
      requiresKyc: false,
      externalAsset: "ATOM",
    });

    // --- Pi-Native (sovereign layer) ---

    this.register({
      network: "stellar",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 0.01,
      maxAmountPi: Number.MAX_SAFE_INTEGER,
      finalitySeconds: 5,
      feeBps: 0, // No fee on native Stellar
      requiresKyc: false,
      externalAsset: "XLM",
    });

    this.register({
      network: "pi-mainnet",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 0.01,
      maxAmountPi: Number.MAX_SAFE_INTEGER,
      finalitySeconds: 5,
      feeBps: 0, // No fee on Pi Network
      requiresKyc: false,
      externalAsset: "PI",
    });

    this.register({
      network: "pi-testnet",
      direction: "bidirectional",
      status: "online",
      minAmountPi: 0.01,
      maxAmountPi: Number.MAX_SAFE_INTEGER,
      finalitySeconds: 5,
      feeBps: 0,
      requiresKyc: false,
      externalAsset: "PI_TEST",
    });
  }

  /**
   * Initiate a bridge transaction — convert between Pi and any external network.
   */
  static async bridgeTransaction(params: {
    network: BridgeNetwork;
    direction: BridgeDirection;
    amountPi: number;
    senderAddress: string;
    recipientAddress: string;
  }): Promise<BridgeTransaction> {
    const bridge = this.bridges.get(params.network);
    if (!bridge) {
      throw new Error(`Bridge not configured: ${params.network}`);
    }

    if (bridge.status !== "online") {
      throw new Error(`Bridge ${params.network} is ${bridge.status}`);
    }

    if (
      params.amountPi < bridge.minAmountPi ||
      params.amountPi > bridge.maxAmountPi
    ) {
      throw new Error(
        `Amount ${params.amountPi} Pi outside range [${bridge.minAmountPi}, ${bridge.maxAmountPi}]`,
      );
    }

    const feePi = (params.amountPi * bridge.feeBps) / 10_000;
    const netAmountPi = params.amountPi - feePi;

    // Convert Pi → external at current rate
    const exchangeRate = this.rateForAsset(bridge.externalAsset);
    const amountExternal = netAmountPi * exchangeRate;

    const tx: BridgeTransaction = {
      id: crypto.randomUUID(),
      bridgeNetwork: params.network,
      direction: params.direction,
      amountPi: params.amountPi,
      amountExternal,
      externalAsset: bridge.externalAsset,
      exchangeRate,
      feePi,
      senderAddress: params.senderAddress,
      recipientAddress: params.recipientAddress,
      status: "pending",
      createdAt: new Date(),
    };

    return tx;
  }

  /**
   * List all bridges and their current status.
   */
  static listBridges(): BridgeConfig[] {
    return Array.from(this.bridges.values());
  }

  /**
   * Get a specific bridge configuration.
   */
  static getBridge(network: BridgeNetwork): BridgeConfig | undefined {
    return this.bridges.get(network);
  }

  /**
   * Health check — returns networks that are NOT online.
   */
  static healthCheck(): { network: BridgeNetwork; status: BridgeStatus }[] {
    return this.listBridges()
      .filter((b) => b.status !== "online")
      .map((b) => ({ network: b.network, status: b.status }));
  }

  // --- Internal ---

  private static register(config: BridgeConfig): void {
    this.bridges.set(config.network, config);
  }

  private static rateForAsset(asset: string): number {
    // Pi → external asset rate (how many units of the asset per Pi)
    const rates: Record<string, number> = {
      USD: PI_EXTERNAL_VALUE_USD,
      EUR: PI_EXTERNAL_VALUE_USD * 0.92,
      GBP: PI_EXTERNAL_VALUE_USD * 0.79,
      JPY: PI_EXTERNAL_VALUE_USD * 154.5,
      PI: 1,
      PI_TEST: 1,
      XLM: PI_EXTERNAL_VALUE_USD / 0.12,
      ETH: PI_EXTERNAL_VALUE_USD / 3_200,
      BTC: PI_EXTERNAL_VALUE_USD / 67_000,
      SOL: PI_EXTERNAL_VALUE_USD / 145,
      MATIC: PI_EXTERNAL_VALUE_USD / 0.72,
      AVAX: PI_EXTERNAL_VALUE_USD / 35,
      ATOM: PI_EXTERNAL_VALUE_USD / 9,
    };
    return rates[asset] ?? PI_EXTERNAL_VALUE_USD;
  }
}

// Auto-initialize on import
InteroperabilityBridge.initialize();
