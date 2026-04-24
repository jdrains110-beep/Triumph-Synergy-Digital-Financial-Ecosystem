/**
 * @fileoverview On-Chain Verifier — Verify transactions and state on-chain (never trust, always verify)
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Core Web3 principle: all critical state is verified against the blockchain,
 * not a centralized database. This replaces Web2 "trust-the-server" patterns.
 */

import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URLS = {
  mainnet: "https://api.mainnet.minepi.com",
  testnet: "http://localhost:31401",
} as const;

export class OnChainVerifier {
  private server: StellarSdk.Horizon.Server;
  private network: "mainnet" | "testnet";

  constructor(network: "mainnet" | "testnet" = "testnet") {
    this.network = network;
    this.server = new StellarSdk.Horizon.Server(HORIZON_URLS[network]);
  }

  /**
   * Verify a transaction actually exists on-chain and matches expected parameters
   */
  async verifyTransaction(txHash: string, expected?: {
    source?: string;
    destination?: string;
    amount?: string;
  }): Promise<{
    verified: boolean;
    ledger: number;
    timestamp: string;
    source: string;
    operations: any[];
  }> {
    const tx = await this.server.transactions().transaction(txHash).call();
    const ops = await this.server.operations().forTransaction(txHash).call();

    let verified = true;

    if (expected?.source && tx.source_account !== expected.source) {
      verified = false;
    }

    if (expected?.destination || expected?.amount) {
      const paymentOp = ops.records.find(
        (op: any) => op.type === "payment" || op.type === "create_account"
      );
      if (paymentOp) {
        if (expected.destination && (paymentOp as any).to !== expected.destination) {
          verified = false;
        }
        if (expected.amount && (paymentOp as any).amount !== expected.amount) {
          verified = false;
        }
      } else {
        verified = false;
      }
    }

    return {
      verified,
      ledger: tx.ledger_attr as number,
      timestamp: tx.created_at,
      source: tx.source_account,
      operations: ops.records,
    };
  }

  /**
   * Verify an account exists and has a minimum balance
   */
  async verifyAccount(
    publicKey: string,
    minBalance?: string
  ): Promise<{
    exists: boolean;
    balance: string;
    meetsMinimum: boolean;
    sequenceNumber: string;
  }> {
    try {
      const account = await this.server.loadAccount(publicKey);
      const piBalance =
        account.balances.find((b: any) => b.asset_type === "native")?.balance ??
        "0";

      return {
        exists: true,
        balance: piBalance,
        meetsMinimum: minBalance
          ? Number.parseFloat(piBalance) >= Number.parseFloat(minBalance)
          : true,
        sequenceNumber: account.sequenceNumber(),
      };
    } catch (e: any) {
      if (e?.response?.status === 404) {
        return {
          exists: false,
          balance: "0",
          meetsMinimum: false,
          sequenceNumber: "0",
        };
      }
      throw e;
    }
  }

  /**
   * Verify a payment was received by a specific account
   */
  async verifyPaymentReceived(
    account: string,
    fromAccount: string,
    amount: string,
    sinceTimestamp?: string
  ): Promise<{ found: boolean; txHash?: string; ledger?: number }> {
    const payments = await this.server
      .payments()
      .forAccount(account)
      .order("desc")
      .limit(50)
      .call();

    for (const payment of payments.records) {
      const p = payment as any;
      if (
        p.type === "payment" &&
        p.from === fromAccount &&
        p.amount === amount
      ) {
        if (sinceTimestamp && new Date(p.created_at) < new Date(sinceTimestamp)) {
          continue;
        }
        return {
          found: true,
          txHash: p.transaction_hash,
          ledger: p.ledger_attr,
        };
      }
    }

    return { found: false };
  }

  /**
   * Stream real-time ledger updates (live blockchain feed)
   */
  streamLedgers(
    callback: (ledger: any) => void,
    cursor: string = "now"
  ): () => void {
    const close = this.server
      .ledgers()
      .cursor(cursor)
      .stream({
        onmessage: callback,
      });

    return close as unknown as () => void;
  }

  /**
   * Get the latest ledger sequence number (blockchain height)
   */
  async getLatestLedger(): Promise<{
    sequence: number;
    closedAt: string;
    txCount: number;
  }> {
    const ledgers = await this.server.ledgers().order("desc").limit(1).call();
    const latest = ledgers.records[0];

    return {
      sequence: latest.sequence,
      closedAt: latest.closed_at,
      txCount: latest.successful_transaction_count,
    };
  }
}
