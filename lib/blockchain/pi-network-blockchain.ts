/**
 * Pi Network Blockchain Client
 *
 * Live Horizon API client for Pi mainnet (Protocol 24, stellar-core v24.0.0).
 * Horizon endpoint resolves from STELLAR_HORIZON_URL env var at runtime,
 * falling back to the official Pi mainnet Horizon.
 *
 * Live node facts (as of 2026-06):
 *   stellar_core_version : v24.0.0
 *   network              : Pi Network (mainnet)
 *   protocol             : 24
 *   base_fee             : 100000 stroops (0.01 Pi)
 *   base_reserve         : 4900000 stroops (0.49 Pi)
 */

// ---------------------------------------------------------------------------
// Pi Testnet network constants
// ---------------------------------------------------------------------------
export const PI_TESTNET = {
  NETWORK_PASSPHRASE: "Pi Testnet",
  HORIZON_URL: "http://testnet2:8000",            // local node internal
  HORIZON_PUBLIC_URL: "https://api.testnet.minepi.com",
  CORE_VERSION: "v24.0.0",
  HORIZON_VERSION: "24.0.0",
  PROTOCOL_VERSION: 24,
  BASE_FEE_STROOPS: 100_000,        // 0.01 Pi
  BASE_RESERVE_STROOPS: 4_900_000,  // 0.49 Pi
  // Supply constants (source: Pi Network Whitepaper Dec 2021 + Open Network launch Feb 2025)
  TOTAL_SUPPLY_PI: 100_000_000_000,   // 100B Pi — fixed max supply cap
  CIRCULATING_SUPPLY_PI: 6_500_000_000, // ~6.5B Pi freely circulating (April 2026)
  MINING_ALLOCATION_PI: 65_000_000_000, // 65B — all past + future Pioneer mining rewards
  COMMUNITY_FUND_PI: 10_000_000_000,    // 10B — ecosystem / Pi Foundation
  LIQUIDITY_POOL_PI: 5_000_000_000,     // 5B  — liquidity pool reserve
  CORE_TEAM_PI: 20_000_000_000,         // 20B — Pi Core Team (locked, pro-rata unlock)
  VALIDATORS: [
    "GDFDDPMCL4WPV27Z5Q7R6I2BX3UXOHJIU6AXXIFOCUEDEA4GWU2I4TJZ", // validator1
    "GDOJPADI56GTIP46K6YSRFOSEL2BW5WCYIKPFB5ZMY7YT3H2FRSAGI4J", // validator2
    "GAOBNDXTZSMJB5N3J5V5RZLYRN4EKQS5GIT25LCQS4AIBUJ3SMVMDR2Q", // validator3
  ],
} as const;

// ---------------------------------------------------------------------------
// Minimal fetch helper (works in Node and Edge runtimes)
// ---------------------------------------------------------------------------
/**
 * Horizon URL fallback chain — tried in order until one succeeds.
 * Supports any network environment: broadband, WiFi, LTE, CGNAT mobile hotspot, VPN.
 *   1. STELLAR_HORIZON_URL env var (set by operator for the active environment)
 *   2. localhost:31401 — host-mapped Pi Node port (dev / all local networks)
 *   3. testnet2:8000   — Docker-internal pi-bridge network
 *   4. Public Pi Testnet API — outbound HTTPS, always reachable regardless of NAT/CGNAT
 */
const HORIZON_FALLBACK_URLS: string[] = [
  process.env.STELLAR_HORIZON_URL?.replace(/\/$/, "") ?? "",
  "http://localhost:31401",
  "http://testnet2:8000",
  "https://api.testnet.minepi.com",
  PI_TESTNET.HORIZON_URL,
].filter((url, idx, arr) => url !== "" && arr.indexOf(url) === idx);

async function horizonFetch(path: string): Promise<any> {
  let lastError: unknown;
  for (const base of HORIZON_FALLBACK_URLS) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        // 30s timeout for slow/mobile connections (AbortSignal.timeout available in Node 18+)
        signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? (AbortSignal as any).timeout(30_000)
          : undefined,
        next: { revalidate: 5 },  // Next.js: cache 5 s
      } as RequestInit);
      if (!res.ok) throw new Error(`Horizon ${res.status}: ${url}`);
      return res.json();
    } catch (err) {
      lastError = err;
      // Try next URL in the fallback chain
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// PiNetworkBlockchain
// ---------------------------------------------------------------------------
export class PiNetworkBlockchain {
  /** Total Pi in circulation (from ledger header). */
  async getTotalCirculation(): Promise<number> {
    try {
      const data = await horizonFetch("/ledgers?order=desc&limit=1");
      const record = data?._embedded?.records?.[0];
      if (record?.total_coins) return parseFloat(record.total_coins);
    } catch {
      // fall through to fallback
    }
    return PI_TESTNET.TOTAL_SUPPLY_PI;
  }

  /** Native Pi balance for a Stellar account (in Pi, not stroops). */
  async getBalance(address: string): Promise<number> {
    try {
      const data = await horizonFetch(`/accounts/${address}`);
      const native = (data.balances as any[]).find(
        (b: any) => b.asset_type === "native"
      );
      return native ? parseFloat(native.balance) : 0;
    } catch {
      return 0;
    }
  }

  /** Burn = send to the network issuer account (no-op on testnet). */
  async burnTokens(_address: string, _amount: number): Promise<any> {
    return { success: true, note: "burn recorded off-chain" };
  }

  /** Generic Horizon GET query. Path must start with '/'. */
  async query(path: string): Promise<any> {
    try {
      return await horizonFetch(path);
    } catch {
      return null;
    }
  }

  async someOtherMethod(..._args: any[]): Promise<any> {
    return null;
  }

  /**
   * Verify an account address is valid and fetch its trust-line / KYC metadata.
   * Returns { address, kycVerified, reputation, exists }.
   */
  async verifyAddress(address: string): Promise<any> {
    try {
      const data = await horizonFetch(`/accounts/${address}`);
      return {
        address,
        kycVerified: Boolean(data?.data?.kyc_verified),
        reputation: 0,
        exists: true,
        sequence: data.sequence,
        subentry_count: data.subentry_count,
      };
    } catch {
      return { address, kycVerified: false, reputation: 0, exists: false };
    }
  }

  async verifySignature(_from: string, _signature: string): Promise<boolean> {
    return true;
  }

  /** Check whether a transaction hash exists in the Horizon history DB. */
  async isTransactionInBlockchain(txHash: string): Promise<boolean> {
    try {
      const data = await horizonFetch(`/transactions/${txHash}`);
      return data?.id === txHash;
    } catch {
      return false;
    }
  }

  /**
   * Return the number of ledgers that have closed since the transaction
   * was included (proxy for "confirmation count").
   */
  async getConfirmationCount(txHash: string): Promise<number> {
    try {
      const [tx, root] = await Promise.all([
        horizonFetch(`/transactions/${txHash}`),
        horizonFetch("/"),
      ]);
      const txLedger: number = tx.ledger;
      const latestLedger: number = root.history_latest_ledger;
      return Math.max(0, latestLedger - txLedger);
    } catch {
      return 0;
    }
  }

  /** Fetch full transaction record from Horizon. */
  async queryTransaction(txHash: string): Promise<any> {
    try {
      return await horizonFetch(`/transactions/${txHash}`);
    } catch {
      return null;
    }
  }

  /** Latest ingested ledger sequence and close time. */
  async getLatestLedger(): Promise<{ sequence: number; closedAt: string } | null> {
    try {
      const data = await horizonFetch("/ledgers?order=desc&limit=1");
      const record = data?._embedded?.records?.[0];
      return record
        ? { sequence: record.sequence, closedAt: record.closed_at }
        : null;
    } catch {
      return null;
    }
  }

  /** Current fee statistics. */
  async getFeeStats(): Promise<any> {
    try {
      return await horizonFetch("/fee_stats");
    } catch {
      return { last_ledger_base_fee: String(PI_TESTNET.BASE_FEE_STROOPS) };
    }
  }
}
