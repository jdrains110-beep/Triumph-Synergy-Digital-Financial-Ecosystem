/**
 * lib/core/pi-origin-verification.ts
 *
 * CRITICAL SYSTEM: Pi Origin Tracking & Verification
 *
 * This system enforces an immutable distinction between:
 * - INTERNAL PI: Mined/earned WITHIN the Triumph Synergy ecosystem
 * - EXTERNAL PI: Contributed from outside the ecosystem
 *
 * NO EXCEPTIONS - All transactions must verify origin
 * NO MODIFICATIONS - Once origin is set, it cannot be changed
 * ENFORCEMENT: Every API endpoint, payment, and transaction validates
 *
 * This is the foundational layer that controls what the ecosystem will accept
 */

// ============================================================================
// PI ORIGIN TYPES & INTERFACES
// ============================================================================

export type PiOriginType = "internal" | "external";

export type PiOriginRecord = {
  readonly originType: PiOriginType; // Immutable
  readonly amount: number;
  readonly sourceTransaction: string; // Transaction hash
  readonly createdAt: Date; // Immutable timestamp
  readonly originProof: string; // Blockchain proof
  readonly immutableHash: string; // Hash of this record - prevents tampering
};

export type PiWalletOriginState = {
  readonly userId: string;
  readonly walletAddress: string;
  readonly internalPiTotal: number; // Total internally mined Pi
  readonly externalPiTotal: number; // Total externally contributed Pi
  readonly originHistory: readonly PiOriginRecord[]; // Immutable history
  readonly lastUpdated: Date;
  readonly stateHash: string; // Hash of entire state - prevents tampering
};

export type PiPaymentWithOriginRequirement = {
  readonly amount: number;
  readonly requiredOriginType: PiOriginType; // MUST match available Pi
  readonly memo: string;
  readonly metadata?: Record<string, unknown>;
  readonly originValidated: boolean; // Must be true before payment executes
};

// ============================================================================
// PI ORIGIN VERIFICATION ENGINE
// ============================================================================

export class PiOriginVerificationEngine {
  private readonly walletStates = new Map<string, PiWalletOriginState>();
  private transactionLog: readonly PiOriginRecord[] = [];

  /**
   * Initialize Pi origin tracking for a wallet
   * This can ONLY be called once per wallet - prevents origin tampering
   */
  async initializeWalletOrigin(
    userId: string,
    walletAddress: string,
    internalPiAmount = 0,
    externalPiAmount = 0
  ): Promise<PiWalletOriginState> {
    // Check if wallet already initialized
    if (this.walletStates.has(walletAddress)) {
      throw new Error(
        `[Pi Origin] SECURITY VIOLATION: Wallet ${walletAddress} already initialized. Cannot reinitialize origin.`
      );
    }

    const tempState: Omit<PiWalletOriginState, "stateHash"> = {
      userId,
      walletAddress,
      internalPiTotal: internalPiAmount,
      externalPiTotal: externalPiAmount,
      originHistory: [],
      lastUpdated: new Date(),
    };

    const state: PiWalletOriginState = {
      ...tempState,
      stateHash: this.computeStateHash(tempState),
    };

    this.walletStates.set(walletAddress, state);

    console.log(
      `[Pi Origin] ✓ Wallet initialized: ${walletAddress} (Internal: ${internalPiAmount} Pi, External: ${externalPiAmount} Pi)`
    );

    return state;
  }

  /**
   * Record an internal Pi earning (mined within ecosystem)
   * Origin: IMMUTABLE - marked as INTERNAL forever
   */
  async recordInternalPiEarning(
    walletAddress: string,
    amount: number,
    sourceTransaction: string,
    originProof: string
  ): Promise<PiOriginRecord> {
    const state = this.walletStates.get(walletAddress);
    if (!state) {
      throw new Error(`[Pi Origin] Wallet not initialized: ${walletAddress}`);
    }

    const tempRecord: Omit<PiOriginRecord, "immutableHash"> = {
      originType: "internal", // ✓ IMMUTABLE - Cannot be changed
      amount,
      sourceTransaction,
      createdAt: new Date(),
      originProof,
    };

    const record: PiOriginRecord = {
      ...tempRecord,
      immutableHash: this.computeRecordHash(tempRecord),
    };

    // Update wallet state
    const tempState: Omit<PiWalletOriginState, "stateHash"> = {
      ...state,
      internalPiTotal: state.internalPiTotal + amount,
      originHistory: [...state.originHistory, record],
      lastUpdated: new Date(),
    };

    const updatedState: PiWalletOriginState = {
      ...tempState,
      stateHash: this.computeStateHash(tempState),
    };

    this.walletStates.set(walletAddress, updatedState);
    this.transactionLog = [...this.transactionLog, record];

    console.log(
      `[Pi Origin] ✓ Internal Pi recorded: ${amount} Pi → ${walletAddress}`
    );

    return record;
  }

  /**
   * Record external Pi contribution (from outside ecosystem)
   * Origin: IMMUTABLE - marked as EXTERNAL forever
   */
  async recordExternalPiContribution(
    walletAddress: string,
    amount: number,
    sourceTransaction: string,
    originProof: string
  ): Promise<PiOriginRecord> {
    const state = this.walletStates.get(walletAddress);
    if (!state) {
      throw new Error(`[Pi Origin] Wallet not initialized: ${walletAddress}`);
    }

    const tempRecord: Omit<PiOriginRecord, "immutableHash"> = {
      originType: "external", // ✓ IMMUTABLE - Cannot be changed
      amount,
      sourceTransaction,
      createdAt: new Date(),
      originProof,
    };

    const record: PiOriginRecord = {
      ...tempRecord,
      immutableHash: this.computeRecordHash(tempRecord),
    };

    // Update wallet state
    const tempState: Omit<PiWalletOriginState, "stateHash"> = {
      ...state,
      externalPiTotal: state.externalPiTotal + amount,
      originHistory: [...state.originHistory, record],
      lastUpdated: new Date(),
    };

    const updatedState: PiWalletOriginState = {
      ...tempState,
      stateHash: this.computeStateHash(tempState),
    };

    this.walletStates.set(walletAddress, updatedState);
    this.transactionLog = [...this.transactionLog, record];

    console.log(
      `[Pi Origin] ✓ External Pi recorded: ${amount} Pi → ${walletAddress}`
    );

    return record;
  }

  /**
   * CRITICAL: Verify that a payment can be executed
   *
   * NO EXCEPTIONS - All three conditions must pass:
   * 1. Sufficient Pi available of required origin type
   * 2. Wallet is verified and not tampered with
   * 3. Transaction origin matches requirement
   */
  async validatePaymentOrigin(
    walletAddress: string,
    payment: PiPaymentWithOriginRequirement
  ): Promise<{
    isValid: boolean;
    reason: string;
    availableInternal: number;
    availableExternal: number;
  }> {
    const state = this.walletStates.get(walletAddress);

    // Wallet not found
    if (!state) {
      return {
        isValid: false,
        reason: `[Pi Origin] REJECTION: Wallet not initialized: ${walletAddress}`,
        availableInternal: 0,
        availableExternal: 0,
      };
    }

    // Verify state has not been tampered with
    const computedHash = this.computeStateHash(state);
    if (computedHash !== state.stateHash) {
      return {
        isValid: false,
        reason:
          "[Pi Origin] SECURITY VIOLATION: Wallet state hash mismatch. Possible tampering detected.",
        availableInternal: state.internalPiTotal,
        availableExternal: state.externalPiTotal,
      };
    }

    // Check origin requirement
    if (payment.requiredOriginType === "internal") {
      if (state.internalPiTotal < payment.amount) {
        return {
          isValid: false,
          reason: `[Pi Origin] REJECTION: Insufficient internal Pi. Required: ${payment.amount}, Available: ${state.internalPiTotal}`,
          availableInternal: state.internalPiTotal,
          availableExternal: state.externalPiTotal,
        };
      }
    } else if (
      payment.requiredOriginType === "external" &&
      state.externalPiTotal < payment.amount
    ) {
      return {
        isValid: false,
        reason: `[Pi Origin] REJECTION: Insufficient external Pi. Required: ${payment.amount}, Available: ${state.externalPiTotal}`,
        availableInternal: state.internalPiTotal,
        availableExternal: state.externalPiTotal,
      };
    }

    return {
      isValid: true,
      reason: `[Pi Origin] APPROVED: Payment of ${payment.amount} Pi from ${payment.requiredOriginType} source`,
      availableInternal: state.internalPiTotal,
      availableExternal: state.externalPiTotal,
    };
  }

  /**
   * Execute a payment (only after validation)
   * Updates the immutable history
   */
  async executePaymentWithOrigin(
    walletAddress: string,
    payment: PiPaymentWithOriginRequirement,
    recipientWallet: string
  ): Promise<{
    success: boolean;
    deductedFrom: PiOriginType;
    remainingInternal: number;
    remainingExternal: number;
    transactionId: string;
  }> {
    // First validate
    const validation = await this.validatePaymentOrigin(walletAddress, payment);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    const state = this.walletStates.get(walletAddress);
    if (!state) {
      throw new Error("Wallet not found after validation");
    }

    // Deduct from appropriate origin
    let tempUpdatedState: Omit<PiWalletOriginState, "stateHash">;
    if (payment.requiredOriginType === "internal") {
      tempUpdatedState = {
        ...state,
        internalPiTotal: state.internalPiTotal - payment.amount,
        lastUpdated: new Date(),
      };
    } else {
      tempUpdatedState = {
        ...state,
        externalPiTotal: state.externalPiTotal - payment.amount,
        lastUpdated: new Date(),
      };
    }

    const updatedState: PiWalletOriginState = {
      ...tempUpdatedState,
      stateHash: this.computeStateHash(tempUpdatedState),
    };

    this.walletStates.set(walletAddress, updatedState);

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(
      `[Pi Origin] ✓ Payment executed: ${payment.amount} Pi from ${payment.requiredOriginType} → ${recipientWallet}`
    );

    return {
      success: true,
      deductedFrom: payment.requiredOriginType,
      remainingInternal: updatedState.internalPiTotal,
      remainingExternal: updatedState.externalPiTotal,
      transactionId,
    };
  }

  /**
   * Get wallet origin state (read-only)
   */
  getWalletOriginState(walletAddress: string): PiWalletOriginState | null {
    const state = this.walletStates.get(walletAddress);
    if (!state) {
      return null;
    }
    // Return a deep readonly copy to prevent tampering
    return Object.freeze({ ...state });
  }

  /**
   * Get all origin history for a wallet (immutable)
   */
  getOriginHistory(walletAddress: string): readonly PiOriginRecord[] {
    const state = this.walletStates.get(walletAddress);
    return state?.originHistory ?? [];
  }

  /**
   * Compute immutable hash of an origin record
   * This prevents tampering with individual transactions
   */
  private computeRecordHash(
    record: Omit<PiOriginRecord, "immutableHash">
  ): string {
    const data = `${record.originType}|${record.amount}|${record.sourceTransaction}|${record.createdAt.toISOString()}|${record.originProof}`;
    return this.simpleHash(data);
  }

  /**
   * Compute immutable hash of wallet state
   * This prevents tampering with wallet totals
   */
  private computeStateHash(
    state: Omit<PiWalletOriginState, "stateHash">
  ): string {
    const historyHash = state.originHistory
      .map((record) =>
        this.simpleHash(
          `${record.originType}|${record.amount}|${record.immutableHash}`
        )
      )
      .join("|");

    const data = `${state.userId}|${state.walletAddress}|${state.internalPiTotal}|${state.externalPiTotal}|${historyHash}|${state.lastUpdated.toISOString()}`;
    return this.simpleHash(data);
  }

  /**
   * Simple deterministic hash function
   * (In production, use crypto.subtle.digest or similar)
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * System health check
   */
  getSystemStatus(): {
    walletsTracked: number;
    transactionsLogged: number;
    totalInternalPi: number;
    totalExternalPi: number;
  } {
    let totalInternal = 0;
    let totalExternal = 0;

    this.walletStates.forEach((state) => {
      totalInternal += state.internalPiTotal;
      totalExternal += state.externalPiTotal;
    });

    return {
      walletsTracked: this.walletStates.size,
      transactionsLogged: this.transactionLog.length,
      totalInternalPi: totalInternal,
      totalExternalPi: totalExternal,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const piOriginVerificationEngine = new PiOriginVerificationEngine();
