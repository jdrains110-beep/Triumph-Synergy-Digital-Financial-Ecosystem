/**
 * lib/pi-sdk/pi-sdk-verifier.ts
 * Server-side Pi SDK payment verification
 */

import crypto from "crypto";

export interface PiPaymentPayload {
  txid: string;
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  signature?: string;
}

/**
 * Verify Pi SDK payment signature and integrity
 * Used to validate payments from the Pi SDK before processing
 */
export class PiSdkVerifier {
  private readonly piApiKey: string;
  private readonly apiSecret: string;

  constructor() {
    this.piApiKey = process.env.PI_API_KEY || "";
    this.apiSecret = process.env.PI_API_SECRET || "";

    if (!this.piApiKey) {
      console.warn(
        "[PiSdkVerifier] PI_API_KEY not set - verification may fail"
      );
    }
  }

  /**
   * Verify payment transaction from Pi SDK
   */
  async verifyTransaction(
    transactionId: string
  ): Promise<{
    valid: boolean;
    confirmed: boolean;
    amount?: number;
    memo?: string;
    error?: string;
  }> {
    try {
      // In production, verify with Pi API
      // https://pi-docs.minepi.com/docs/pi-server-sdk/payment-verification
      
      if (!transactionId) {
        return {
          valid: false,
          confirmed: false,
          error: "Transaction ID required",
        };
      }

      // Verify transaction hash format
      const isValidHash = this.isValidTransactionHash(transactionId);
      if (!isValidHash) {
        return {
          valid: false,
          confirmed: false,
          error: "Invalid transaction hash format",
        };
      }

      // Check transaction status with Pi API (mock for now)
      const verification = await this.checkTransactionWithPiApi(transactionId);

      return {
        valid: verification.valid,
        confirmed: verification.confirmed,
        amount: verification.amount,
        memo: verification.memo,
      };
    } catch (error) {
      console.error("[PiSdkVerifier] Verification error:", error);
      return {
        valid: false,
        confirmed: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  /**
   * Validate transaction hash format
   */
  private isValidTransactionHash(hash: string): boolean {
    // Pi transactions are typically 64 character hex strings or txid format
    // This is a basic validation - adjust based on actual Pi transaction format
    return /^[a-f0-9]{64}$|^tx_[a-zA-Z0-9]+$/.test(hash);
  }

  /**
   * Check transaction status with Pi API
   */
  private async checkTransactionWithPiApi(
    transactionId: string
  ): Promise<{
    valid: boolean;
    confirmed: boolean;
    amount?: number;
    memo?: string;
  }> {
    try {
      // In production environment:
      if (process.env.NODE_ENV === "production" && this.piApiKey) {
        const response = await fetch(
          `https://api.minepi.com/v2/payments/${transactionId}`,
          {
            headers: {
              Authorization: `Bearer ${this.piApiKey}`,
            },
          }
        );

        if (!response.ok) {
          return {
            valid: false,
            confirmed: false,
          };
        }

        const data = await response.json() as any;
        return {
          valid: data.state === "COMPLETED" || data.state === "CONFIRMED",
          confirmed: data.state === "COMPLETED",
          amount: data.amount,
          memo: data.memo,
        };
      }

      // Development/sandbox mode - accept transaction as valid
      console.log("[PiSdkVerifier] Running in sandbox mode - accepting transaction");
      return {
        valid: true,
        confirmed: true,
        amount: 100, // Mock amount
        memo: "Sandbox transaction",
      };
    } catch (error) {
      console.error("[PiSdkVerifier] Pi API check error:", error);
      return {
        valid: false,
        confirmed: false,
      };
    }
  }

  /**
   * Generate payment signature for server-side verification
   */
  generateSignature(payload: PiPaymentPayload): string {
    const payloadString = JSON.stringify({
      txid: payload.txid,
      amount: payload.amount,
      timestamp: payload.timestamp,
    });

    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(payloadString)
      .digest("hex");
  }

  /**
   * Verify payment signature from client
   */
  verifySignature(payload: PiPaymentPayload): boolean {
    if (!payload.signature) {
      return false;
    }

    const expectedSignature = this.generateSignature(payload);
    return crypto.timingSafeEqual(
      Buffer.from(payload.signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Validate payment integrity
   */
  validatePaymentIntegrity(payload: PiPaymentPayload): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!payload.txid) errors.push("Missing transaction ID");
    if (payload.amount <= 0) errors.push("Invalid amount");
    if (!payload.memo) errors.push("Missing memo");

    // Check timestamp is recent (within 5 minutes)
    const now = Date.now();
    const payloadTime = payload.timestamp;
    const timeDiff = Math.abs(now - payloadTime);

    if (timeDiff > 5 * 60 * 1000) {
      errors.push("Payment timestamp too old or in future");
    }

    // Validate amount range
    if (payload.amount > 1_000_000) {
      errors.push("Amount exceeds maximum limit");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create singleton instance
 */
export const piSdkVerifier = new PiSdkVerifier();
