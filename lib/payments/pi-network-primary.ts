// lib/payments/pi-network-primary.ts
// Pi Network as PRIMARY Payment Method Configuration
// 95% of transaction volume target

import {
  Horizon,
  Keypair,
  Memo,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export type PiPaymentConfig = {
  enabled: boolean;
  isPrimary: boolean;
  internalMultiplier: number;
  externalMultiplier: number;
  minAmount: number;
  maxAmount: number;
  settlementNetwork: "stellar_mainnet" | "stellar_testnet";
};

// Primary payment configuration
export const piNetworkConfig: PiPaymentConfig = {
  enabled: true,
  isPrimary: true, // PRIMARY PAYMENT METHOD
  internalMultiplier: 1.5, // 50% bonus for internal Pi
  externalMultiplier: 1.0, // No bonus for external Pi
  minAmount: 10, // Minimum 10 Pi
  maxAmount: 100_000, // Maximum 100,000 Pi
  settlementNetwork:
    process.env.NODE_ENV === "production"
      ? "stellar_mainnet"
      : "stellar_testnet",
};

/**
 * Pi Network Payment Processor
 * Handles Pi payments and Stellar settlement
 */
export class PiNetworkPaymentProcessor {
  private readonly apiKey: string;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for internal API integration
  private readonly internalApiKey: string;
  private readonly horizon: Horizon.Server;
  private readonly stellar: {
    account: string;
    secret: string;
  };

  constructor() {
    this.apiKey = process.env.PI_API_KEY || "";
    this.internalApiKey = process.env.PI_INTERNAL_API_KEY || "";
    this.stellar = {
      account: process.env.STELLAR_PAYMENT_ACCOUNT || "",
      secret: process.env.STELLAR_PAYMENT_SECRET || "",
    };

    // Initialize Stellar Horizon connection
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
    this.horizon = new Horizon.Server(horizonUrl);
  }

  /**
   * Process a Pi payment
   * @param orderId - Order identifier
   * @param amount - Amount in Pi
   * @param source - 'internal' or 'external' Pi
   * @param userAddress - Pi wallet address
   * @returns Payment transaction details
   */
  async processPiPayment(
    orderId: string,
    amount: number,
    source: "internal" | "external",
    userAddress: string
  ): Promise<{
    success: boolean;
    paymentId: string;
    transactionHash?: string;
    amount: number;
    appliedValue: number;
    multiplier: number;
    stellarSettlement?: string;
    error?: string;
  }> {
    try {
      // Validate amount
      if (
        amount < piNetworkConfig.minAmount ||
        amount > piNetworkConfig.maxAmount
      ) {
        return {
          success: false,
          paymentId: "",
          amount,
          appliedValue: 0,
          multiplier: 1,
          error: `Amount must be between ${piNetworkConfig.minAmount} and ${piNetworkConfig.maxAmount} Pi`,
        };
      }

      // Calculate multiplier
      const multiplier =
        source === "internal"
          ? piNetworkConfig.internalMultiplier
          : piNetworkConfig.externalMultiplier;
      const appliedValue = amount * multiplier;

      // Create Pi payment on blockchain
      const piTransaction = await this.createPiTransaction(
        orderId,
        amount,
        userAddress
      );

      if (!piTransaction.success) {
        return {
          success: false,
          paymentId: "",
          amount,
          appliedValue: 0,
          multiplier,
          error: piTransaction.error,
        };
      }

      // Settle on Stellar network
      const stellarSettlement = await this.settlePiOnStellar(
        orderId,
        appliedValue,
        piTransaction.transactionHash || ""
      );

      const paymentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        success: true,
        paymentId,
        transactionHash: piTransaction.transactionHash,
        amount,
        appliedValue,
        multiplier,
        stellarSettlement: stellarSettlement.success
          ? stellarSettlement.hash
          : undefined,
      };
    } catch (error) {
      console.error("Pi payment processing error:", error);
      return {
        success: false,
        paymentId: "",
        amount,
        appliedValue: 0,
        multiplier: 1,
        error: "Pi payment processing failed",
      };
    }
  }

  /**
   * Create a Pi blockchain transaction
   * @private
   */
  private async createPiTransaction(
    orderId: string,
    amount: number,
    userAddress: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // In production: Call Pi Network mainnet API
      // For now: Return mock successful transaction

      const response = await fetch("https://api.minepi.com/v2/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          amount,
          description: `Order #${orderId}`,
          metadata: {
            orderId,
            userAddress,
            timestamp: new Date().toISOString(),
            source: "triumph-synergy",
          },
          user_uid: userAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Pi API error: ${response.status} ${error}`,
        };
      }

      const data = (await response.json()) as { txid: string };

      return {
        success: true,
        transactionHash: data.txid,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create Pi transaction: ${error}`,
      };
    }
  }

  /**
   * Settle Pi payment on Stellar network
   * @private
   */
  private async settlePiOnStellar(
    orderId: string,
    amount: number,
    piTxHash: string
  ): Promise<{
    success: boolean;
    hash?: string;
    error?: string;
  }> {
    try {
      // Get source account for transaction
      const sourceAccount = await this.horizon.loadAccount(
        this.stellar.account
      );

      // Create Stellar transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: "100",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      })
        .addMemo(Memo.text(`Pi:${orderId}:${piTxHash}`))
        .addOperation({
          source: sourceAccount.accountId(),
          type: "manageData",
          name: "pi_settlement",
          value: JSON.stringify({
            orderId,
            amount,
            piTxHash,
            timestamp: new Date().toISOString(),
          }),
        } as any)
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(Keypair.fromSecret(this.stellar.secret));

      // Submit to Stellar network
      const result = await this.horizon.submitTransaction(transaction);

      return {
        success: true,
        hash: result.hash,
      };
    } catch (error) {
      console.error("Stellar settlement error:", error);
      return {
        success: false,
        error: `Stellar settlement failed: ${error}`,
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<{
    id: string;
    status: "pending" | "confirmed" | "settled" | "failed";
    amount: number;
    appliedValue: number;
    createdAt: string;
    settledAt?: string;
  }> {
    // Query database for payment record
    // Return status with timestamps
    return {
      id: paymentId,
      status: "confirmed",
      amount: 0,
      appliedValue: 0,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Verify Pi payment on blockchain
   */
  async verifyPiPayment(transactionHash: string): Promise<{
    valid: boolean;
    confirmed: boolean;
    confirmations: number;
  }> {
    try {
      const response = await fetch(
        `https://api.minepi.com/v2/transactions/${transactionHash}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        return { valid: false, confirmed: false, confirmations: 0 };
      }

      const data = (await response.json()) as {
        status: string;
        confirmed_at?: string;
        confirmations?: number;
      };

      return {
        valid: true,
        confirmed: data.status === "confirmed",
        confirmations: data.confirmations || 0,
      };
    } catch (error) {
      console.error("Payment verification error:", error);
      return { valid: false, confirmed: false, confirmations: 0 };
    }
  }
}

/**
 * Stellar settlement utilities
 */
export class StellarSettlement {
  private readonly horizon: Horizon.Server;

  constructor() {
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
    this.horizon = new Horizon.Server(horizonUrl);
  }

  /**
   * Convert Pi value to Stellar XLM
   */
  async getPiToXlmRate(): Promise<number> {
    // In production: Get from price feed
    // For now: Return 1:1 rate (Pi to XLM)
    return 1.0;
  }

  /**
   * Monitor settlement completion
   */
  async monitorSettlement(
    txHash: string,
    maxWaitTime = 60_000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const tx = await this.horizon.transactions().transaction(txHash).call();

        if (tx.ledger_attr && tx.ledger_attr > 0) {
          console.log(`Settlement confirmed in ledger ${tx.ledger_attr}`);
          return true;
        }
      } catch (_error) {
        // Transaction not yet in ledger
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return false;
  }
}

export default PiNetworkPaymentProcessor;
