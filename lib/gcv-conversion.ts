/**
 * GCV Conversion Utilities
 * 
 * Provides consistent GCV (Global Currency Value) calculations and formatting
 * across all testnet and mainnet hubs.
 * 
 * GCV: 1 Pi = $314,159.00 USD
 */

export const GCV_PI_TO_USD = 314_159.00;
export const GCV_DISPLAY = "$314,159.00 per π";

/**
 * TriSyn to Pi conversion ratio
 * 1 TriSyn = 0.0001 Pi (in mainnet terms)
 * Testnet uses same ratio for consistency
 */
export const TRISYN_TO_PI = 0.0001;

/**
 * Convert TriSyn amount to Pi equivalent
 */
export function trisynToPi(trisynAmount: number): number {
  return trisynAmount * TRISYN_TO_PI;
}

/**
 * Convert Pi amount to USD using GCV
 */
export function piToUsd(piAmount: number): number {
  return piAmount * GCV_PI_TO_USD;
}

/**
 * Convert TriSyn amount directly to USD
 */
export function trisynToUsd(trisynAmount: number): number {
  const pi = trisynToPi(trisynAmount);
  return piToUsd(pi);
}

/**
 * Format Pi amount with symbol and decimals
 */
export function formatPi(
  piAmount: number,
  decimals: number = 6,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  const prefix = network === "testnet" ? "t" : "";
  const formatted = piAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${prefix}π ${formatted}`;
}

/**
 * Format USD amount with currency symbol
 */
export function formatUsd(usdAmount: number, decimals: number = 2): string {
  return usdAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format TriSyn amount with symbol
 */
export function formatTrisyn(trisynAmount: number, decimals: number = 2): string {
  const formatted = trisynAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${formatted} TriSyn`;
}

/**
 * Create a dual-display string showing both native currency and USD equivalent
 * Example: "450 TriSyn ($14,337,155.00 USD)"
 */
export function formatDualDisplay(
  amount: number,
  currency: "trisyn" | "pi",
  network: "mainnet" | "testnet" = "mainnet"
): {
  native: string;
  usd: string;
  combined: string;
  piAmount: number;
  usdAmount: number;
} {
  let piAmount = 0;
  let nativeDisplay = "";

  if (currency === "trisyn") {
    piAmount = trisynToPi(amount);
    nativeDisplay = formatTrisyn(amount);
  } else {
    piAmount = amount;
    nativeDisplay = formatPi(amount, 6, network);
  }

  const usdAmount = piToUsd(piAmount);
  const usdDisplay = formatUsd(usdAmount);
  const combined = `${nativeDisplay} (${usdDisplay} USD)`;

  return {
    native: nativeDisplay,
    usd: usdDisplay,
    combined,
    piAmount,
    usdAmount,
  };
}

/**
 * Price display object for products/services
 * Provides all necessary conversion information
 */
export interface PriceDisplay {
  native: string;           // "450 TriSyn" or "π 0.045"
  usd: string;              // "$14,337,155.00"
  combined: string;         // "450 TriSyn ($14,337,155.00 USD)"
  piAmount: number;         // 0.045
  usdAmount: number;        // 14337155.00
  percentOfMainnetGCV: number; // 45.5% (for "per unit" pricing)
}

/**
 * Create complete price display for a TriSyn amount
 */
export function createPriceDisplay(
  trisynAmount: number,
  network: "mainnet" | "testnet" = "mainnet"
): PriceDisplay {
  const piAmount = trisynToPi(trisynAmount);
  const usdAmount = piToUsd(piAmount);
  const percentOfGCV = (piAmount / 1) * 100; // Pi 1.0 = 100% of GCV

  return {
    native: formatTrisyn(trisynAmount),
    usd: formatUsd(usdAmount),
    combined: `${formatTrisyn(trisynAmount)} (${formatUsd(usdAmount)} USD)`,
    piAmount,
    usdAmount,
    percentOfMainnetGCV: percentOfGCV,
  };
}

/**
 * Create complete price display for a Pi amount
 */
export function createPiPriceDisplay(
  piAmount: number,
  network: "mainnet" | "testnet" = "mainnet"
): PriceDisplay {
  const usdAmount = piToUsd(piAmount);
  const percentOfGCV = piAmount * 100; // Pi 1.0 = 100% of GCV

  return {
    native: formatPi(piAmount, 6, network),
    usd: formatUsd(usdAmount),
    combined: `${formatPi(piAmount, 6, network)} (${formatUsd(usdAmount)} USD)`,
    piAmount,
    usdAmount,
    percentOfMainnetGCV: percentOfGCV,
  };
}

/**
 * Parse price string and return display object
 * Handles: "450 TriSyn", "0.045 Pi", "π 0.045", etc.
 */
export function parsePriceString(priceStr: string, network: "mainnet" | "testnet" = "mainnet"): PriceDisplay | null {
  const trisynMatch = priceStr.match(/^(\d+(?:\.\d+)?)\s*(?:TriSyn|trisyn)?$/);
  if (trisynMatch) {
    return createPriceDisplay(parseFloat(trisynMatch[1]), network);
  }

  const piMatch = priceStr.match(/^(?:π|tπ)?\s*(\d+(?:\.\d+)?)\s*(?:Pi|pi)?$/);
  if (piMatch) {
    return createPiPriceDisplay(parseFloat(piMatch[1]), network);
  }

  return null;
}

/**
 * Format a daily/monthly/annual rate with GCV
 * Example: "180 TriSyn/night" → "180 TriSyn/night ($57,348,620.00 USD/night)"
 */
export function formatRateDisplay(
  amount: number,
  timeframe: "hour" | "night" | "month" | "year" | "week",
  currency: "trisyn" | "pi" = "trisyn"
): string {
  const display = formatDualDisplay(amount, currency);
  const timeLabel = timeframe === "night" ? "/night" : `/${timeframe}`;
  return `${display.native}${timeLabel} (${display.usd} USD${timeLabel})`;
}

/**
 * Create a budget/price comparison showing multiple tier options
 */
export function createPriceComparison(
  options: Array<{ label: string; amount: number; currency: "trisyn" | "pi" }>
): Array<{
  label: string;
  display: PriceDisplay;
}> {
  return options.map((opt) => ({
    label: opt.label,
    display: formatDualDisplay(opt.amount, opt.currency),
  }));
}
