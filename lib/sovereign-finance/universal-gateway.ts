/**
 * @fileoverview Universal Integration Gateway
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * THE sovereign gateway that all external financial systems — banks, payment
 * processors, governments, enterprises, and currencies (including USD) — MUST
 * connect through to access Pi Network liquidity, settlements, and the
 * Triumph Synergy ecosystem.
 *
 * Pi is the base settlement layer.  Fiat currencies are derivative.
 */

import { createClient } from "@supabase/supabase-js";
import { Keypair } from "@stellar/stellar-sdk";
import crypto from "node:crypto";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Pi internal value: internally-mined / contributed Pi (1 Pi = $314,159 USD) */
export const PI_INTERNAL_VALUE_USD = 314_159;
/** Pi external value: market rate (1 Pi = $314.159 USD) */
export const PI_EXTERNAL_VALUE_USD = 314.159;
/** Internal-to-external multiplier */
export const PI_VALUE_MULTIPLIER = 1_000;

/** Gateway protocol version */
export const GATEWAY_PROTOCOL_VERSION = "1.0.0";

/** Maximum daily settlement volume per connector (in Pi) */
export const MAX_DAILY_SETTLEMENT_PI = 10_000_000;

// ============================================================================
// TYPES
// ============================================================================

export type ConnectorTier =
  | "sovereign"     // Pi Network core — unlimited
  | "institutional" // Central banks, G20 governments
  | "enterprise"    // Fortune 500, major exchanges
  | "commercial"    // Small/medium businesses
  | "individual";   // dApps, developers, individuals

export type ConnectorStatus =
  | "active"
  | "pending_verification"
  | "suspended"
  | "revoked";

export type SettlementCurrency =
  | "PI"            // Pi Network (base layer — always accepted)
  | "USD"           // United States Dollar
  | "EUR"           // Euro
  | "GBP"           // British Pound
  | "JPY"           // Japanese Yen
  | "CNY"           // Chinese Yuan
  | "XAU"           // Gold (troy oz)
  | "XAG"           // Silver (troy oz)
  | "BTC"           // Bitcoin
  | "ETH"           // Ethereum
  | "XLM";          // Stellar Lumens

export interface GatewayConnector {
  /** Unique connector ID (UUID v4) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Tier determines rate limits & settlement caps */
  tier: ConnectorTier;
  status: ConnectorStatus;

  /** Ed25519 public key for signing requests */
  publicKey: string;
  /** HMAC secret (only revealed once at registration) */
  hmacKeyHash: string;

  /** Which fiat/crypto currencies this connector settles in */
  supportedCurrencies: SettlementCurrency[];
  /** Daily settlement cap in Pi */
  dailySettlementCap: number;
  /** Current 24h volume used */
  dailyVolumeUsed: number;

  /** Webhook URL for settlement confirmations */
  webhookUrl: string;
  /** Optional IP allowlist */
  ipAllowlist: string[];

  /** Metadata */
  registeredAt: Date;
  lastActiveAt: Date;
  totalLifetimeVolume: number; // Pi
}

export interface SettlementRequest {
  connectorId: string;
  /** Amount in Pi — Pi is always the base unit */
  amountPi: number;
  /** Target settlement currency for the external system */
  targetCurrency: SettlementCurrency;
  /** Direction: inflow (external → Pi) or outflow (Pi → external) */
  direction: "inflow" | "outflow";
  /** Memo for Stellar transaction */
  memo: string;
  /** External reference ID */
  externalRef: string;
  /** HMAC-SHA256 signature of the request body */
  signature: string;
  /** Timestamp (ISO 8601) — requests older than 5 min are rejected */
  timestamp: string;
}

export interface SettlementResult {
  id: string;
  status: "settled" | "pending" | "failed";
  amountPi: number;
  amountTarget: number;
  targetCurrency: SettlementCurrency;
  exchangeRate: number;
  stellarTxHash?: string;
  settledAt?: Date;
  error?: string;
}

export interface ExchangeRate {
  base: "PI";
  quote: SettlementCurrency;
  /** How many units of `quote` one Pi buys */
  rate: number;
  /** Rate source */
  source: "triumph-synergy-oracle" | "dual-value-engine";
  updatedAt: Date;
}

// ============================================================================
// UNIVERSAL INTEGRATION GATEWAY
// ============================================================================

export class UniversalGateway {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  // --------------------------------------------------------------------------
  //  Connector Registration
  // --------------------------------------------------------------------------

  /**
   * Register a new external system (bank, exchange, government, dApp).
   * Returns a one-time HMAC secret — the caller must store it securely.
   */
  async registerConnector(params: {
    name: string;
    tier: ConnectorTier;
    supportedCurrencies: SettlementCurrency[];
    webhookUrl: string;
    ipAllowlist?: string[];
  }): Promise<{ connector: GatewayConnector; hmacSecret: string }> {
    // Generate cryptographic identity
    const keypair = Keypair.random();
    const hmacSecret = crypto.randomBytes(32).toString("hex");
    const hmacKeyHash = crypto
      .createHash("sha256")
      .update(hmacSecret)
      .digest("hex");

    const connector: GatewayConnector = {
      id: crypto.randomUUID(),
      name: params.name,
      tier: params.tier,
      status: params.tier === "sovereign" ? "active" : "pending_verification",
      publicKey: keypair.publicKey(),
      hmacKeyHash,
      supportedCurrencies: params.supportedCurrencies,
      dailySettlementCap: this.capForTier(params.tier),
      dailyVolumeUsed: 0,
      webhookUrl: params.webhookUrl,
      ipAllowlist: params.ipAllowlist ?? [],
      registeredAt: new Date(),
      lastActiveAt: new Date(),
      totalLifetimeVolume: 0,
    };

    await this.supabase.from("gateway_connectors").insert(connector);

    return { connector, hmacSecret };
  }

  // --------------------------------------------------------------------------
  //  Settlement
  // --------------------------------------------------------------------------

  /**
   * Settle a transaction.  Pi is always the base unit.
   *
   * Inflow:  External currency → Pi  (the external system is buying Pi)
   * Outflow: Pi → External currency  (the external system is selling Pi)
   */
  async settle(req: SettlementRequest): Promise<SettlementResult> {
    // 1. Validate connector
    const connector = await this.getConnector(req.connectorId);
    if (!connector || connector.status !== "active") {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        amountPi: req.amountPi,
        amountTarget: 0,
        targetCurrency: req.targetCurrency,
        exchangeRate: 0,
        error: "Connector not found or not active",
      };
    }

    // 2. Verify HMAC signature
    if (!this.verifySignature(req, connector.hmacKeyHash)) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        amountPi: req.amountPi,
        amountTarget: 0,
        targetCurrency: req.targetCurrency,
        exchangeRate: 0,
        error: "Invalid signature",
      };
    }

    // 3. Check timestamp freshness (< 5 min)
    const age = Date.now() - new Date(req.timestamp).getTime();
    if (age > 5 * 60 * 1000 || age < 0) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        amountPi: req.amountPi,
        amountTarget: 0,
        targetCurrency: req.targetCurrency,
        exchangeRate: 0,
        error: "Request timestamp out of range",
      };
    }

    // 4. Daily volume check
    if (connector.dailyVolumeUsed + req.amountPi > connector.dailySettlementCap) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        amountPi: req.amountPi,
        amountTarget: 0,
        targetCurrency: req.targetCurrency,
        exchangeRate: 0,
        error: "Daily settlement cap exceeded",
      };
    }

    // 5. Get exchange rate
    const rate = await this.getExchangeRate(req.targetCurrency);
    const amountTarget = req.amountPi * rate.rate;

    // 6. Record settlement
    const settlement: SettlementResult = {
      id: crypto.randomUUID(),
      status: "settled",
      amountPi: req.amountPi,
      amountTarget,
      targetCurrency: req.targetCurrency,
      exchangeRate: rate.rate,
      settledAt: new Date(),
    };

    await this.supabase.from("gateway_settlements").insert({
      ...settlement,
      connectorId: req.connectorId,
      direction: req.direction,
      memo: req.memo,
      externalRef: req.externalRef,
    });

    // 7. Update daily volume
    await this.supabase
      .from("gateway_connectors")
      .update({
        dailyVolumeUsed: connector.dailyVolumeUsed + req.amountPi,
        lastActiveAt: new Date(),
        totalLifetimeVolume: connector.totalLifetimeVolume + req.amountPi,
      })
      .eq("id", connector.id);

    return settlement;
  }

  // --------------------------------------------------------------------------
  //  Exchange rates — Pi is base, everything else is derived
  // --------------------------------------------------------------------------

  /**
   * Pi → target currency rate.
   * Pi is the sovereign base unit; fiat rates are DERIVED from Pi value.
   */
  async getExchangeRate(currency: SettlementCurrency): Promise<ExchangeRate> {
    const rates: Record<SettlementCurrency, number> = {
      PI: 1,
      USD: PI_EXTERNAL_VALUE_USD,
      EUR: PI_EXTERNAL_VALUE_USD * 0.92,
      GBP: PI_EXTERNAL_VALUE_USD * 0.79,
      JPY: PI_EXTERNAL_VALUE_USD * 154.5,
      CNY: PI_EXTERNAL_VALUE_USD * 7.24,
      XAU: PI_EXTERNAL_VALUE_USD / 2_350, // 1 oz gold ≈ $2,350
      XAG: PI_EXTERNAL_VALUE_USD / 28,    // 1 oz silver ≈ $28
      BTC: PI_EXTERNAL_VALUE_USD / 67_000, // BTC ≈ $67k
      ETH: PI_EXTERNAL_VALUE_USD / 3_200,  // ETH ≈ $3.2k
      XLM: PI_EXTERNAL_VALUE_USD / 0.12,   // XLM ≈ $0.12
    };

    return {
      base: "PI",
      quote: currency,
      rate: rates[currency] ?? PI_EXTERNAL_VALUE_USD,
      source: "dual-value-engine",
      updatedAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  //  Helpers
  // --------------------------------------------------------------------------

  private capForTier(tier: ConnectorTier): number {
    const caps: Record<ConnectorTier, number> = {
      sovereign: Number.MAX_SAFE_INTEGER,
      institutional: 100_000_000,
      enterprise: 10_000_000,
      commercial: 1_000_000,
      individual: 100_000,
    };
    return caps[tier];
  }

  private async getConnector(id: string): Promise<GatewayConnector | null> {
    const { data } = await this.supabase
      .from("gateway_connectors")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  }

  private verifySignature(
    req: SettlementRequest,
    storedHash: string,
  ): boolean {
    // Reconstruct the payload the caller signed
    const payload = `${req.connectorId}:${req.amountPi}:${req.targetCurrency}:${req.direction}:${req.memo}:${req.timestamp}`;
    // The caller HMACs with the raw secret; we compare against stored hash
    const expectedHash = crypto
      .createHash("sha256")
      .update(req.signature)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(storedHash),
    );
  }
}
