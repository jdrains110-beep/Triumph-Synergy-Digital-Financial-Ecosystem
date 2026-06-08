/**
 * GCV Calculator — TypeScript mirror of `docker/sovereign-nano-saib/saib/gcv_engine.py`.
 *
 * One source of truth for the Pi → USD math + the 30-year sustainability
 * pacing across the whole Triumph Synergy app (testnet AND mainnet), the
 * real-estate flow, the chat assistant, the tokenization router, and the
 * hyper-mesh cortex enforcement boundary.
 *
 *   1 Pi = $314,159 USD  (π × 100,000)
 */

// ── Constants — keep in lock-step with gcv_engine.py ────────────────────────
const _env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const GCV_PEG_USD = 314159;
export const PI_NANO = 1e-8; // 8 decimal places
export const SUSTAINABILITY_HORIZON_YEARS = Number(
  _env.GCV_SUSTAINABILITY_YEARS ?? 30,
);
export const SUSTAINABILITY_PER_TX_PCT = Number(
  _env.GCV_PER_TX_MAX_PCT ?? 0.005,
);
export const SUSTAINABILITY_DAILY_PCT = Number(
  _env.GCV_DAILY_MAX_PCT ?? 0.01,
);
const SECONDS_PER_YEAR = 31_557_600;

export type Network = "mainnet" | "testnet";

// ── Conversion ──────────────────────────────────────────────────────────────
export function piToUsd(pi: number | string): number {
  return Number(pi) * GCV_PEG_USD;
}

export function usdToPi(usd: number | string): number {
  return Math.floor((Number(usd) / GCV_PEG_USD) / PI_NANO) * PI_NANO;
}

export function formatUsd(usd: number): string {
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatPi(pi: number): string {
  return `π${pi.toLocaleString("en-US", { maximumFractionDigits: 8 })}`;
}

// ── Transaction verifier (mirror of GCVMathEngine.verify_transaction) ──────
export interface GcvVerifyResult {
  is_valid: boolean;
  required_pi: number;
  offered_pi: number;
  gcv_value_delivered: string;
  item_usd_value: string;
  surplus_deficit: string;
  gcv_peg: string;
}

export function verifyTransaction(
  itemUsdValue: number | string,
  offeredPi: number | string,
): GcvVerifyResult {
  const usd = Number(itemUsdValue);
  const pi = Number(offeredPi);
  const delivered = pi * GCV_PEG_USD;
  const required = usdToPi(usd);
  return {
    is_valid: delivered >= usd,
    required_pi: required,
    offered_pi: pi,
    gcv_value_delivered: formatUsd(delivered),
    item_usd_value: formatUsd(usd),
    surplus_deficit: formatUsd(delivered - usd),
    gcv_peg: formatUsd(GCV_PEG_USD),
  };
}

// ── 30-Year sustainability budget ──────────────────────────────────────────
export interface GcvBudget {
  principal_pi: number;
  principal_usd: string;
  horizon_years: number;
  per_year_pi: number;
  per_year_usd: string;
  per_month_pi: number;
  per_day_pi: number;
  per_tx_max_pi: number;
  per_tx_max_usd: string;
  daily_cap_pi: number;
  per_tx_max_pct: number;
  daily_max_pct: number;
}

export function computeBudget(
  totalPi: number | string,
  horizonYears: number = SUSTAINABILITY_HORIZON_YEARS,
): GcvBudget {
  const principal = Number(totalPi);
  const perYear = principal / Math.max(1, horizonYears);
  const perMonth = perYear / 12;
  const perDay = perYear / 365.25;
  const perTx = perYear * SUSTAINABILITY_PER_TX_PCT;
  const dailyCap = perYear * SUSTAINABILITY_DAILY_PCT;
  return {
    principal_pi: principal,
    principal_usd: formatUsd(piToUsd(principal)),
    horizon_years: horizonYears,
    per_year_pi: perYear,
    per_year_usd: formatUsd(piToUsd(perYear)),
    per_month_pi: perMonth,
    per_day_pi: perDay,
    per_tx_max_pi: perTx,
    per_tx_max_usd: formatUsd(piToUsd(perTx)),
    daily_cap_pi: dailyCap,
    per_tx_max_pct: SUSTAINABILITY_PER_TX_PCT,
    daily_max_pct: SUSTAINABILITY_DAILY_PCT,
  };
}

// ── Pace check — is the wallet on track to last `horizon_years`? ───────────
export type PaceStatus =
  | "on_pace"
  | "savings"
  | "over_pace"
  | "burning"
  | "exhausted";

export interface GcvPace {
  status: PaceStatus;
  principal_pi: number;
  spent_pi: number;
  remaining_pi: number;
  expected_spend_pi: number;
  delta_pi: number;
  pct_of_expected: number;
  horizon_years: number;
  projected_lifetime_yrs: number;
  meets_30yr_vision: boolean;
}

export function checkPace(
  totalPi: number | string,
  spentPi: number | string,
  ageSeconds: number,
  horizonYears: number = SUSTAINABILITY_HORIZON_YEARS,
): GcvPace {
  const principal = Number(totalPi);
  const spent = Number(spentPi);
  const ageYrs = Math.max(0.0001, ageSeconds / SECONDS_PER_YEAR);
  const expected = (principal / horizonYears) * ageYrs;
  const delta = spent - expected;
  const pctUsed = expected === 0 ? 0 : (spent / expected) * 100;
  let status: PaceStatus;
  if (spent > principal) status = "exhausted";
  else if (delta > expected) status = "burning";
  else if (delta > 0) status = "over_pace";
  else if (delta < -expected) status = "savings";
  else status = "on_pace";
  const remaining = principal - spent;
  let projectedYrs = horizonYears;
  if (spent > 0 && ageSeconds > 0) {
    const burnPerSec = spent / ageSeconds;
    projectedYrs = remaining / burnPerSec / SECONDS_PER_YEAR;
  }
  return {
    status,
    principal_pi: principal,
    spent_pi: spent,
    remaining_pi: remaining,
    expected_spend_pi: expected,
    delta_pi: delta,
    pct_of_expected: pctUsed,
    horizon_years: horizonYears,
    projected_lifetime_yrs: projectedYrs,
    meets_30yr_vision: projectedYrs >= horizonYears,
  };
}

// ── Per-transaction gate — used by chat, real-estate, tokenization ─────────
export interface GcvTxCheck {
  approved: boolean;
  reasons: string[];
  offered_pi: number;
  offered_usd: string;
  per_tx_max_pi: number;
  daily_cap_pi: number;
  spent_today_after: number;
  principal_left: number;
  recommendation: "approve" | "split-into-smaller-installments";
}

export function checkTransaction(opts: {
  totalPi: number | string;
  spentPi?: number | string;
  spentTodayPi?: number | string;
  offeredPi: number | string;
  horizonYears?: number;
}): GcvTxCheck {
  const total = Number(opts.totalPi);
  const spent = Number(opts.spentPi ?? 0);
  const spentToday = Number(opts.spentTodayPi ?? 0);
  const offered = Number(opts.offeredPi);
  const budget = computeBudget(total, opts.horizonYears);
  const reasons: string[] = [];
  if (offered > budget.per_tx_max_pi) {
    reasons.push(
      `single-tx ${offered} Pi exceeds per-tx cap ${budget.per_tx_max_pi} Pi`,
    );
  }
  if (spentToday + offered > budget.daily_cap_pi) {
    reasons.push(
      `daily total ${spentToday + offered} Pi would exceed daily cap ${budget.daily_cap_pi} Pi`,
    );
  }
  const principalLeft = total - spent;
  if (offered > principalLeft) {
    reasons.push(
      `offered ${offered} Pi exceeds remaining principal ${principalLeft} Pi`,
    );
  }
  const approved = reasons.length === 0;
  return {
    approved,
    reasons,
    offered_pi: offered,
    offered_usd: formatUsd(piToUsd(offered)),
    per_tx_max_pi: budget.per_tx_max_pi,
    daily_cap_pi: budget.daily_cap_pi,
    spent_today_after: approved ? spentToday + offered : spentToday,
    principal_left: principalLeft,
    recommendation: approved ? "approve" : "split-into-smaller-installments",
  };
}

// ── Network-aware helpers (testnet + mainnet share the same peg) ───────────
export function quoteForNetwork(
  network: Network,
  itemUsdValue: number | string,
): { network: Network; required_pi: number; gcv_peg_usd: number; note: string } {
  return {
    network,
    required_pi: usdToPi(itemUsdValue),
    gcv_peg_usd: GCV_PEG_USD,
    note:
      network === "testnet"
        ? "Pi GCV is identical on testnet and mainnet — only ledger settlement differs."
        : "Pi GCV anchored at $314,159 per Pi — settlement on Pi mainnet (Horizon).",
  };
}
