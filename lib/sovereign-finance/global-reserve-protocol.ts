/**
 * @fileoverview Global Reserve Protocol — Pi as the World Reserve Currency
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Pi Network is the sovereign base settlement layer.
 * All fiat currencies (USD, EUR, GBP, etc.) are DERIVATIVE instruments
 * whose value is expressed in Pi terms.
 *
 * This module defines the reserve protocol, Pi-denominated pricing,
 * and real-world utility conversion for every sector Triumph Synergy touches.
 */

import {
  PI_EXTERNAL_VALUE_USD,
  PI_INTERNAL_VALUE_USD,
  PI_VALUE_MULTIPLIER,
} from "./universal-gateway";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Sectors with real-world utility built through Triumph Synergy */
export const REAL_WORLD_UTILITY_SECTORS = [
  "banking",
  "real-estate",
  "commerce",
  "delivery",
  "travel",
  "education",
  "entertainment",
  "healthcare",
  "permits-licensing",
  "vehicles",
  "agriculture",
  "energy",
  "telecommunications",
  "insurance",
  "legal-judicial",
  "government-services",
  "supply-chain",
  "phygital-retail",
  "ubi-social-programs",
  "tokenized-assets",
] as const;

export type UtilitySector = (typeof REAL_WORLD_UTILITY_SECTORS)[number];

// ============================================================================
// TYPES
// ============================================================================

export type ReserveStatus =
  | "sovereign"    // Pi Network — the reserve itself
  | "pegged"       // Currency pegged/settled via Pi
  | "bridged"      // Connected through interoperability bridge
  | "unconnected"; // Not yet attached to the ecosystem

export interface CurrencyProfile {
  code: string;
  name: string;
  status: ReserveStatus;
  /** How many units of this currency = 1 Pi */
  piExchangeRate: number;
  /** 24h volume settled through Triumph Synergy (in Pi) */
  dailyVolumePi: number;
  /** Sectors where this currency is active via the gateway */
  activeSectors: UtilitySector[];
}

export interface RealWorldUtilityMetrics {
  sector: UtilitySector;
  /** Total Pi transacted in this sector (lifetime) */
  totalPiVolume: number;
  /** Number of active connectors using Pi for this sector */
  activeConnectors: number;
  /** Percentage of sector transactions settled in Pi */
  piPenetrationPct: number;
  /** Estimated fiat displacement (USD equivalent) */
  fiatDisplacedUsd: number;
}

export interface ReserveSnapshot {
  timestamp: Date;
  /** Total Pi in active circulation across all connectors */
  totalPiCirculating: number;
  /** Total fiat value attached to the ecosystem */
  totalFiatAttachedUsd: number;
  /** Number of registered gateway connectors */
  connectorCount: number;
  /** Sector-by-sector real-world utility */
  sectorMetrics: RealWorldUtilityMetrics[];
  /** Currency profiles */
  currencies: CurrencyProfile[];
  /** Dominance ratio: Pi-volume / total-global-digital-payments */
  globalDominanceRatio: number;
}

// ============================================================================
// GLOBAL RESERVE PROTOCOL
// ============================================================================

export class GlobalReserveProtocol {
  /**
   * Price anything in Pi.
   *
   * The world prices goods in USD → we express that same price in Pi,
   * making Pi the unit of account.
   */
  static priceInPi(
    fiatAmount: number,
    fiatCurrency: string = "USD",
    piType: "internal" | "external" = "external",
  ): number {
    const piRate =
      piType === "internal" ? PI_INTERNAL_VALUE_USD : PI_EXTERNAL_VALUE_USD;

    // Convert non-USD to USD first, then to Pi
    const usdAmount = this.toUsd(fiatAmount, fiatCurrency);
    return usdAmount / piRate;
  }

  /**
   * Convert Pi to any fiat currency.
   */
  static piToFiat(
    piAmount: number,
    fiatCurrency: string = "USD",
    piType: "internal" | "external" = "external",
  ): number {
    const piRate =
      piType === "internal" ? PI_INTERNAL_VALUE_USD : PI_EXTERNAL_VALUE_USD;
    const usd = piAmount * piRate;
    return this.fromUsd(usd, fiatCurrency);
  }

  /**
   * Build a full reserve snapshot — what the ecosystem looks like RIGHT NOW.
   */
  static buildSnapshot(params: {
    totalPiCirculating: number;
    connectorCount: number;
    sectorMetrics: RealWorldUtilityMetrics[];
    currencies: CurrencyProfile[];
  }): ReserveSnapshot {
    const totalFiatAttachedUsd =
      params.totalPiCirculating * PI_EXTERNAL_VALUE_USD;

    // Rough global digital payment volume ~$10 trillion/day
    const globalDominanceRatio =
      (totalFiatAttachedUsd / 10_000_000_000_000) * 100;

    return {
      timestamp: new Date(),
      totalPiCirculating: params.totalPiCirculating,
      totalFiatAttachedUsd,
      connectorCount: params.connectorCount,
      sectorMetrics: params.sectorMetrics,
      currencies: params.currencies,
      globalDominanceRatio,
    };
  }

  /**
   * Determine how much real-world utility Pi has in a given sector.
   */
  static sectorUtility(
    sector: UtilitySector,
    totalPiVolume: number,
    activeConnectors: number,
  ): RealWorldUtilityMetrics {
    // Pi penetration = proportion of sector volume handled by Pi
    // Starts at the connector count × average volume
    const estimatedSectorVolume = 1_000_000_000; // $1B baseline per sector
    const piVolumeUsd = totalPiVolume * PI_EXTERNAL_VALUE_USD;

    return {
      sector,
      totalPiVolume,
      activeConnectors,
      piPenetrationPct: Math.min(
        (piVolumeUsd / estimatedSectorVolume) * 100,
        100,
      ),
      fiatDisplacedUsd: piVolumeUsd,
    };
  }

  /**
   * Returns the default currency profiles — everything is expressed
   * relative to Pi (the sovereign base).
   */
  static defaultCurrencyProfiles(): CurrencyProfile[] {
    return [
      {
        code: "PI",
        name: "Pi Network",
        status: "sovereign",
        piExchangeRate: 1,
        dailyVolumePi: 0,
        activeSectors: [...REAL_WORLD_UTILITY_SECTORS],
      },
      {
        code: "USD",
        name: "United States Dollar",
        status: "pegged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "EUR",
        name: "Euro",
        status: "pegged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD * 0.92,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "GBP",
        name: "British Pound Sterling",
        status: "pegged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD * 0.79,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "JPY",
        name: "Japanese Yen",
        status: "bridged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD * 154.5,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "CNY",
        name: "Chinese Yuan",
        status: "bridged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD * 7.24,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "BTC",
        name: "Bitcoin",
        status: "bridged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD / 67_000,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "ETH",
        name: "Ethereum",
        status: "bridged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD / 3_200,
        dailyVolumePi: 0,
        activeSectors: [],
      },
      {
        code: "XLM",
        name: "Stellar Lumens",
        status: "pegged",
        piExchangeRate: PI_EXTERNAL_VALUE_USD / 0.12,
        dailyVolumePi: 0,
        activeSectors: [],
      },
    ];
  }

  // --- Internal helpers ---

  private static toUsd(amount: number, currency: string): number {
    const fiatToUsd: Record<string, number> = {
      USD: 1,
      EUR: 1.087,
      GBP: 1.266,
      JPY: 0.00647,
      CNY: 0.138,
      INR: 0.012,
      BRL: 0.195,
      AUD: 0.652,
      CAD: 0.735,
      CHF: 1.12,
    };
    return amount * (fiatToUsd[currency] ?? 1);
  }

  private static fromUsd(usd: number, currency: string): number {
    const usdToFiat: Record<string, number> = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 154.5,
      CNY: 7.24,
      INR: 83.3,
      BRL: 5.13,
      AUD: 1.534,
      CAD: 1.36,
      CHF: 0.893,
    };
    return usd * (usdToFiat[currency] ?? 1);
  }
}
