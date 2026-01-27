/**
 * Smart Contract Integration with Stellar SCP + Pi Coin SDK
 * 
 * This module provides the unified interface for:
 * - Smart contract payment processing with Pi Network
 * - Stellar blockchain verification and recording
 * - SCP auto-synchronization for transaction validation
 * - Escrow management for contract milestones
 */

import { getStellarPiCoinSDK, type SmartContractPayment, type EscrowState, type PiPaymentProof } from "./stellar-pi-coin-sdk";
import { getSCPAutoUpdate, initializeSCPAutoUpdate, type SCPState, type SCPUpdateEvent } from "./scp-auto-update";
import * as StellarSdk from "@stellar/stellar-sdk";

export interface SmartContractConfig {
  contractId: string;
  contractType: "service" | "purchase" | "lease" | "partnership";
  parties: {
    partyA: { name: string; stellarAccount: string; piUserId?: string };
    partyB: { name: string; stellarAccount: string; piUserId?: string };
  };
  paymentTerms: {
    totalAmount: number;
    currency: "PI" | "XLM" | "USDC";
    milestones?: { percentage: number; description: string; dueDate?: Date }[];
    escrowRequired: boolean;
  };
  conditions: string[];
  effectiveDate: Date;
  expirationDate?: Date;
}

export interface ContractExecutionResult {
  success: boolean;
  contractId: string;
  stellarTxHash?: string;
  escrowAccounts?: string[];
  scpLedger?: number;
  error?: string;
  timestamp: Date;
}

export interface ContractPaymentStatus {
  contractId: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  milestones: {
    id: number;
    amount: number;
    status: "pending" | "funded" | "released" | "refunded";
    piPaymentId?: string;
    stellarTxHash?: string;
  }[];
  lastUpdated: Date;
}

/**
 * Smart Contract Manager
 * Handles the full lifecycle of smart contracts with Pi + Stellar integration
 */
export class SmartContractManager {
  private piSdk = getStellarPiCoinSDK();
  private scp = getSCPAutoUpdate();
  private contracts: Map<string, SmartContractConfig> = new Map();
  private escrows: Map<string, EscrowState[]> = new Map();
  private initialized = false;

  /**
   * Initialize the smart contract manager
   * Must be called before using any contract operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("[SmartContractManager] Initializing...");

    // Start SCP auto-update
    await initializeSCPAutoUpdate();

    // Subscribe to SCP events for contract validation
    this.scp.onUpdate((event) => this.handleSCPUpdate(event));

    this.initialized = true;
    console.log("[SmartContractManager] ✅ Ready");
  }

  /**
   * Register a new smart contract
   */
  async registerContract(config: SmartContractConfig): Promise<ContractExecutionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const { contractId } = config;
    console.log(`[SmartContractManager] Registering contract: ${contractId}`);

    try {
      // Validate SCP is synchronized
      const scpState = this.scp.getState();
      if (!scpState) {
        return {
          success: false,
          contractId,
          error: "Stellar network not synchronized",
          timestamp: new Date(),
        };
      }

      // Store contract configuration
      this.contracts.set(contractId, config);

      // If escrow required, create escrow accounts for milestones
      const escrowAccounts: string[] = [];
      if (config.paymentTerms.escrowRequired && config.paymentTerms.milestones) {
        const milestoneAmounts = config.paymentTerms.milestones.map((m) => ({
          amount: (config.paymentTerms.totalAmount * m.percentage) / 100,
          description: m.description,
        }));

        // Create milestone payment channel
        const funderKeypair = StellarSdk.Keypair.random(); // In production, use actual keypair
        const channel = await this.piSdk.createMilestonePaymentChannel(
          contractId,
          milestoneAmounts,
          funderKeypair,
          config.parties.partyB.stellarAccount
        );

        escrowAccounts.push(...channel.milestoneAccounts);
        this.escrows.set(contractId, channel.milestoneAccounts.map((acc, i) => ({
          id: `${contractId}-M${i + 1}`,
          stellarEscrowAccount: acc,
          amount: milestoneAmounts[i].amount,
          status: "pending",
          createdAt: new Date(),
          parties: {
            depositor: config.parties.partyA.stellarAccount,
            beneficiary: config.parties.partyB.stellarAccount,
          },
        })));
      }

      console.log(`[SmartContractManager] ✅ Contract ${contractId} registered`);

      return {
        success: true,
        contractId,
        escrowAccounts,
        scpLedger: scpState.latestLedger,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[SmartContractManager] Contract registration failed:`, error);
      return {
        success: false,
        contractId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process a Pi payment for a contract milestone
   */
  async processMilestonePayment(
    contractId: string,
    milestoneIndex: number,
    piPaymentProof: PiPaymentProof
  ): Promise<ContractExecutionResult> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return {
        success: false,
        contractId,
        error: "Contract not found",
        timestamp: new Date(),
      };
    }

    const escrows = this.escrows.get(contractId);
    if (!escrows || !escrows[milestoneIndex]) {
      return {
        success: false,
        contractId,
        error: "Escrow not found for milestone",
        timestamp: new Date(),
      };
    }

    const escrow = escrows[milestoneIndex];

    try {
      // Verify Pi payment amount matches milestone
      const expectedAmount = contract.paymentTerms.milestones?.[milestoneIndex];
      if (expectedAmount) {
        const milestoneAmount = (contract.paymentTerms.totalAmount * expectedAmount.percentage) / 100;
        if (Math.abs(piPaymentProof.amount - milestoneAmount) > 0.001) {
          return {
            success: false,
            contractId,
            error: `Amount mismatch: expected ${milestoneAmount}, got ${piPaymentProof.amount}`,
            timestamp: new Date(),
          };
        }
      }

      // Fund escrow with verified Pi payment
      const funderKeypair = StellarSdk.Keypair.random(); // In production, use actual keypair
      const fundedEscrow = await this.piSdk.fundEscrowWithPi(
        escrow,
        piPaymentProof,
        funderKeypair
      );

      // Update escrow state
      escrows[milestoneIndex] = fundedEscrow;

      console.log(`[SmartContractManager] ✅ Milestone ${milestoneIndex + 1} funded for ${contractId}`);

      return {
        success: true,
        contractId,
        escrowAccounts: [fundedEscrow.stellarEscrowAccount],
        scpLedger: this.scp.getState()?.latestLedger,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[SmartContractManager] Milestone payment failed:`, error);
      return {
        success: false,
        contractId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Release milestone payment (requires both party approval)
   */
  async releaseMilestonePayment(
    contractId: string,
    milestoneIndex: number,
    partyASignature: StellarSdk.Keypair,
    partyBSignature: StellarSdk.Keypair
  ): Promise<ContractExecutionResult> {
    const escrows = this.escrows.get(contractId);
    if (!escrows || !escrows[milestoneIndex]) {
      return {
        success: false,
        contractId,
        error: "Escrow not found for milestone",
        timestamp: new Date(),
      };
    }

    const escrow = escrows[milestoneIndex];

    try {
      const result = await this.piSdk.releaseEscrow(
        escrow,
        partyASignature,
        partyBSignature
      );

      if (result.success) {
        escrows[milestoneIndex] = { ...escrow, status: "released" };
        console.log(`[SmartContractManager] ✅ Milestone ${milestoneIndex + 1} released for ${contractId}`);
      }

      return {
        success: result.success,
        contractId,
        stellarTxHash: result.stellarTxHash,
        scpLedger: result.ledger,
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[SmartContractManager] Milestone release failed:`, error);
      return {
        success: false,
        contractId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get contract payment status
   */
  getPaymentStatus(contractId: string): ContractPaymentStatus | null {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;

    const escrows = this.escrows.get(contractId) || [];
    
    const milestones = escrows.map((e, i) => ({
      id: i + 1,
      amount: e.amount,
      status: e.status as "pending" | "funded" | "released" | "refunded",
      piPaymentId: e.piPaymentId,
      stellarTxHash: undefined,
    }));

    const paidAmount = escrows
      .filter((e) => e.status === "released")
      .reduce((sum, e) => sum + e.amount, 0);

    const pendingAmount = escrows
      .filter((e) => e.status === "funded")
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      contractId,
      totalAmount: contract.paymentTerms.totalAmount,
      paidAmount,
      pendingAmount,
      milestones,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get current SCP synchronization state
   */
  getSCPState(): SCPState | null {
    return this.scp.getState();
  }

  /**
   * Handle SCP update events
   */
  private handleSCPUpdate(event: SCPUpdateEvent): void {
    if (event.type === "protocol") {
      console.log(`[SmartContractManager] Protocol update detected:`, event.data);
      // Handle protocol upgrades - may need to update contract validation logic
    }

    if (event.type === "error") {
      console.error(`[SmartContractManager] SCP error:`, event.data);
    }
  }
}

// Singleton instance
let managerInstance: SmartContractManager | null = null;

/**
 * Get or create the global Smart Contract Manager instance
 */
export function getSmartContractManager(): SmartContractManager {
  if (!managerInstance) {
    managerInstance = new SmartContractManager();
  }
  return managerInstance;
}

/**
 * Initialize smart contract system
 * Call during application startup
 */
export async function initializeSmartContractSystem(): Promise<SmartContractManager> {
  const manager = getSmartContractManager();
  await manager.initialize();
  return manager;
}

export default SmartContractManager;
