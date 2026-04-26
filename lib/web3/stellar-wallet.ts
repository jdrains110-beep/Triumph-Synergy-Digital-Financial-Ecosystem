/**
 * @fileoverview Stellar Wallet — Real Pi Network / Stellar wallet operations
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Replaces the stub WalletManager with real Stellar keypair generation,
 * transaction signing, and on-chain submission via Horizon.
 */

import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_MAINNET = "https://api.mainnet.minepi.com";
const HORIZON_TESTNET = "http://localhost:31401";

export type WalletState = {
  publicKey: string;
  network: "mainnet" | "testnet";
  balance: string;
  sequence: string;
  isActive: boolean;
};

type NetworkConfig = {
  horizon: string;
  networkPassphrase: string;
};

function getNetworkConfig(network: "mainnet" | "testnet"): NetworkConfig {
  if (network === "mainnet") {
    return {
      horizon: HORIZON_MAINNET,
      networkPassphrase: "Pi Mainnet",
    };
  }
  return {
    horizon: HORIZON_TESTNET,
    networkPassphrase: "Pi Testnet",
  };
}

export class StellarWallet {
  private keypair: StellarSdk.Keypair | null = null;
  private network: "mainnet" | "testnet";
  private server: StellarSdk.Horizon.Server;

  constructor(network: "mainnet" | "testnet" = "testnet") {
    this.network = network;
    const config = getNetworkConfig(network);
    this.server = new StellarSdk.Horizon.Server(config.horizon);
  }

  /**
   * Generate a new Stellar keypair (client-side wallet creation)
   * The secret key never leaves the client.
   */
  generateKeypair(): { publicKey: string; secret: string } {
    this.keypair = StellarSdk.Keypair.random();
    return {
      publicKey: this.keypair.publicKey(),
      secret: this.keypair.secret(),
    };
  }

  /**
   * Restore wallet from existing secret key
   */
  restoreFromSecret(secret: string): string {
    this.keypair = StellarSdk.Keypair.fromSecret(secret);
    return this.keypair.publicKey();
  }

  /**
   * Restore wallet from Pi SDK auth (public key only — signing happens via Pi SDK)
   */
  restoreFromPublicKey(publicKey: string): void {
    this.keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
  }

  /**
   * Get wallet state from the blockchain
   */
  async getWalletState(): Promise<WalletState> {
    if (!this.keypair) throw new Error("Wallet not initialized");

    try {
      const account = await this.server.loadAccount(this.keypair.publicKey());
      const piBalance = account.balances.find(
        (b: any) => b.asset_type === "native"
      );

      return {
        publicKey: this.keypair.publicKey(),
        network: this.network,
        balance: piBalance?.balance ?? "0",
        sequence: account.sequenceNumber(),
        isActive: true,
      };
    } catch (e: any) {
      if (e?.response?.status === 404) {
        return {
          publicKey: this.keypair.publicKey(),
          network: this.network,
          balance: "0",
          sequence: "0",
          isActive: false,
        };
      }
      throw e;
    }
  }

  /**
   * Sign arbitrary data (for authentication challenges / DID proofs)
   */
  signMessage(message: string): string {
    if (!this.keypair?.canSign()) {
      throw new Error("Wallet has no signing capability (public key only)");
    }
    const messageBuffer = Buffer.from(message, "utf-8");
    const signature = this.keypair.sign(messageBuffer);
    return signature.toString("base64");
  }

  /**
   * Verify a signature against a public key
   */
  static verifySignature(
    publicKey: string,
    message: string,
    signatureBase64: string
  ): boolean {
    const kp = StellarSdk.Keypair.fromPublicKey(publicKey);
    const messageBuffer = Buffer.from(message, "utf-8");
    const sigBuffer = Buffer.from(signatureBase64, "base64");
    return kp.verify(messageBuffer, sigBuffer);
  }

  /**
   * Build and sign a Pi payment transaction
   */
  async buildPaymentTx(
    destination: string,
    amount: string,
    memo?: string
  ): Promise<string> {
    if (!this.keypair?.canSign()) {
      throw new Error("Cannot sign — use Pi SDK for custodial wallets");
    }

    const config = getNetworkConfig(this.network);
    const account = await this.server.loadAccount(this.keypair.publicKey());

    const txBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset: StellarSdk.Asset.native(),
          amount,
        })
      )
      .setTimeout(180);

    if (memo) {
      txBuilder.addMemo(StellarSdk.Memo.text(memo));
    }

    const tx = txBuilder.build();
    tx.sign(this.keypair);

    return tx.toXDR();
  }

  /**
   * Submit a signed transaction to the network
   */
  async submitTransaction(xdr: string): Promise<{
    hash: string;
    ledger: number;
    success: boolean;
  }> {
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      xdr,
      getNetworkConfig(this.network).networkPassphrase
    );

    const result = await this.server.submitTransaction(
      tx as StellarSdk.Transaction
    );
    return {
      hash: (result as any).hash,
      ledger: (result as any).ledger,
      success: true,
    };
  }

  /**
   * Stream real-time payment events for this wallet
   */
  streamPayments(
    callback: (payment: any) => void
  ): () => void {
    if (!this.keypair) throw new Error("Wallet not initialized");

    const close = this.server
      .payments()
      .forAccount(this.keypair.publicKey())
      .cursor("now")
      .stream({
        onmessage: callback,
      });

    return close as unknown as () => void;
  }

  get publicKey(): string | null {
    return this.keypair?.publicKey() ?? null;
  }
}
