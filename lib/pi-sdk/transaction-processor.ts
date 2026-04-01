/**
 * lib/pi-sdk/transaction-processor.ts
 * User-to-app transaction processing with server-side approval
 */

import { piSdkVerifier } from "./pi-sdk-verifier";

export type UserTransaction = {
  transactionId: string;
  userId: string;
  amount: number;
  memo: string;
  timestamp: number;
  status: "pending" | "approved" | "confirmed" | "failed" | "rejected";
  serverApprovalId?: string;
  blockchainHash?: string;
  metadata?: Record<string, unknown>;
};

export type ServerApprovalRequest = {
  transactionId: string;
  userId: string;
  amount: number;
  memo: string;
  userSignature?: string;
  timestamp: number;
};

export type ServerApprovalResponse = {
  approved: boolean;
  approvalId: string;
  reason?: string;
  timestamp: number;
  expiresAt: number;
};

export type BlockchainSettlement = {
  transactionId: string;
  blockchainHash: string;
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  settledAt: number;
};

/**
 * Transaction Processor
 * Handles user-to-app payment transactions
 */
export class TransactionProcessor {
  private readonly maxTransactionAmount: number = 100_000; // 100k Pi
  private readonly minTransactionAmount: number = 1; // 1 Pi
  private readonly approvalTimeout: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Request server approval for a transaction
   */
  async requestServerApproval(
    request: ServerApprovalRequest
  ): Promise<ServerApprovalResponse> {
    try {
      // Validate request
      const validation = this.validateApprovalRequest(request);
      if (!validation.valid) {
        return {
          approved: false,
          approvalId: "",
          reason: validation.error,
          timestamp: Date.now(),
          expiresAt: Date.now(),
        };
      }

      // Generate approval ID
      const approvalId = this.generateApprovalId(request.transactionId);

      // Check amount limits
      if (
        request.amount < this.minTransactionAmount ||
        request.amount > this.maxTransactionAmount
      ) {
        return {
          approved: false,
          approvalId,
          reason: `Amount must be between ${this.minTransactionAmount} and ${this.maxTransactionAmount}`,
          timestamp: Date.now(),
          expiresAt: Date.now(),
        };
      }

      // Verify user signature if provided
      if (request.userSignature) {
        const isValid = await this.verifyUserSignature(
          request.transactionId,
          request.userSignature
        );

        if (!isValid) {
          return {
            approved: false,
            approvalId,
            reason: "User signature verification failed",
            timestamp: Date.now(),
            expiresAt: Date.now(),
          };
        }
      }

      // Check fraud patterns
      const isFraudulent = await this.checkFraudPatterns(request);
      if (isFraudulent) {
        console.warn(
          `[TransactionProcessor] Potential fraud detected for user ${request.userId}`
        );
        return {
          approved: false,
          approvalId,
          reason: "Transaction flagged for review",
          timestamp: Date.now(),
          expiresAt: Date.now(),
        };
      }

      // Approve transaction
      console.log(
        `[TransactionProcessor] ✅ Approved transaction: ${approvalId}`
      );

      return {
        approved: true,
        approvalId,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.approvalTimeout,
      };
    } catch (error) {
      console.error("[TransactionProcessor] Approval error:", error);
      return {
        approved: false,
        approvalId: "",
        reason: "Server error during approval",
        timestamp: Date.now(),
        expiresAt: Date.now(),
      };
    }
  }

  /**
   * Process transaction after server approval
   */
  async processTransaction(
    transaction: UserTransaction,
    approvalId: string
  ): Promise<{
    success: boolean;
    blockchainHash?: string;
    error?: string;
  }> {
    try {
      // Verify approval
      const isApprovalValid = await this.verifyApprovalId(approvalId);
      if (!isApprovalValid) {
        return {
          success: false,
          error: "Invalid or expired approval",
        };
      }

      // Verify transaction with Pi SDK
      const verification = await piSdkVerifier.verifyTransaction(
        transaction.transactionId
      );

      if (!verification.valid) {
        return {
          success: false,
          error: "Transaction verification failed",
        };
      }

      // Settle on blockchain (Stellar)
      const settlement = await this.settleOnBlockchain(transaction);

      if (!settlement.blockchainHash) {
        return {
          success: false,
          error: "Blockchain settlement failed",
        };
      }

      console.log(
        `[TransactionProcessor] ✅ Transaction settled: ${settlement.blockchainHash}`
      );

      return {
        success: true,
        blockchainHash: settlement.blockchainHash,
      };
    } catch (error) {
      console.error("[TransactionProcessor] Process error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      };
    }
  }

  /**
   * Settle transaction on blockchain
   */
  private async settleOnBlockchain(
    transaction: UserTransaction
  ): Promise<BlockchainSettlement> {
    try {
      // In production: Create Stellar transaction
      // For now: Generate mock blockchain hash

      const blockchainHash = this.generateBlockchainHash(
        transaction.transactionId
      );

      console.log(
        `[TransactionProcessor] Broadcasting to blockchain: ${blockchainHash}`
      );

      return {
        transactionId: transaction.transactionId,
        blockchainHash,
        status: "confirmed",
        confirmations: 1,
        settledAt: Date.now(),
      };
    } catch (error) {
      console.error("[TransactionProcessor] Settlement error:", error);
      return {
        transactionId: transaction.transactionId,
        blockchainHash: "",
        status: "failed",
        confirmations: 0,
        settledAt: Date.now(),
      };
    }
  }

  /**
   * Validate approval request
   */
  private validateApprovalRequest(request: ServerApprovalRequest): {
    valid: boolean;
    error?: string;
  } {
    if (!request.transactionId) {
      return { valid: false, error: "Missing transaction ID" };
    }

    if (!request.userId) {
      return { valid: false, error: "Missing user ID" };
    }

    if (request.amount <= 0) {
      return { valid: false, error: "Invalid amount" };
    }

    if (!request.memo) {
      return { valid: false, error: "Missing memo" };
    }

    // Check timestamp is recent
    const now = Date.now();
    const timeDiff = Math.abs(now - request.timestamp);
    if (timeDiff > 5 * 60 * 1000) {
      return { valid: false, error: "Request timestamp too old" };
    }

    return { valid: true };
  }

  /**
   * Verify user signature
   */
  private async verifyUserSignature(
    transactionId: string,
    signature: string
  ): Promise<boolean> {
    try {
      // In production: Verify cryptographic signature
      // For now: Basic validation
      return signature.length > 0 && transactionId.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check for fraudulent patterns
   */
  private async checkFraudPatterns(
    request: ServerApprovalRequest
  ): Promise<boolean> {
    // Pattern detection logic
    // Example: Multiple large transactions in short time
    // For now: Return false (no fraud)
    return false;
  }

  /**
   * Verify approval ID
   */
  private async verifyApprovalId(approvalId: string): Promise<boolean> {
    // In production: Check against approval database
    // For now: Basic validation
    return approvalId.length > 0 && approvalId.startsWith("approval_");
  }

  /**
   * Generate approval ID
   */
  private generateApprovalId(transactionId: string): string {
    const timestamp = Date.now();
    return `approval_${transactionId.substring(0, 8)}_${timestamp}`;
  }

  /**
   * Generate blockchain hash
   */
  private generateBlockchainHash(transactionId: string): string {
    // In production: Return actual Stellar transaction hash
    // For now: Generate mock hash
    return `0x${transactionId.substring(0, 56)}${Date.now().toString(16).substring(0, 8)}`;
  }
}

/**
 * Create singleton instance
 */
export const transactionProcessor = new TransactionProcessor();
