/**
 * Stellar Pi Coin SDK Integration
 * Bridges Pi Network payments with Stellar blockchain smart contracts
 * 
 * This SDK provides:
 * - Pi Coin ↔ Stellar asset bridging
 * - Smart contract payment validation
 * - Cross-chain transaction verification
 * - Atomic swap capabilities
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import { getSCPAutoUpdate, createSCPSmartContractBinding } from "./scp-auto-update";

// Pi Coin asset configuration on Stellar
const PI_COIN_ASSET_CODE = "PI";
const PI_COIN_ISSUER = process.env.PI_COIN_STELLAR_ISSUER || "";
const STELLAR_HORIZON_URL = process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";

export interface PiCoinConfig {
  assetCode: string;
  issuer: string;
  decimals: number;
  minTransfer: string;
  maxTransfer: string;
}

export interface PiPaymentProof {
  piPaymentId: string;
  piTxHash?: string;
  amount: number;
  memo: string;
  userId: string;
  timestamp: Date;
  verified: boolean;
}

export interface StellarPaymentResult {
  success: boolean;
  stellarTxHash?: string;
  ledger?: number;
  error?: string;
}

export interface SmartContractPayment {
  contractId: string;
  paymentType: "escrow" | "direct" | "milestone" | "subscription";
  amount: number;
  currency: "PI" | "XLM" | "USDC";
  sender: string;
  recipient: string;
  conditions?: PaymentCondition[];
  metadata?: Record<string, unknown>;
}

export interface PaymentCondition {
  type: "time" | "approval" | "milestone" | "signature";
  value: string | number;
  met: boolean;
}

export interface EscrowState {
  id: string;
  stellarEscrowAccount: string;
  piPaymentId?: string;
  amount: number;
  status: "pending" | "funded" | "released" | "refunded" | "disputed";
  createdAt: Date;
  expiresAt?: Date;
  parties: {
    depositor: string;
    beneficiary: string;
    arbiter?: string;
  };
}

/**
 * Stellar Pi Coin SDK
 * Main interface for Pi Network ↔ Stellar integration
 */
export class StellarPiCoinSDK {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;
  private piAsset: StellarSdk.Asset | null = null;
  private scpBinding: ReturnType<typeof createSCPSmartContractBinding>;

  constructor(config?: { horizonUrl?: string; network?: "PUBLIC" | "TESTNET" }) {
    this.server = new StellarSdk.Horizon.Server(config?.horizonUrl || STELLAR_HORIZON_URL);
    this.networkPassphrase = config?.network === "TESTNET" 
      ? StellarSdk.Networks.TESTNET 
      : StellarSdk.Networks.PUBLIC;
    
    // Initialize SCP binding for smart contract integration
    this.scpBinding = createSCPSmartContractBinding(getSCPAutoUpdate());

    // Initialize Pi asset if issuer is configured
    if (PI_COIN_ISSUER) {
      this.piAsset = new StellarSdk.Asset(PI_COIN_ASSET_CODE, PI_COIN_ISSUER);
    }
  }

  /**
   * Get Pi Coin asset configuration
   */
  getPiCoinConfig(): PiCoinConfig {
    return {
      assetCode: PI_COIN_ASSET_CODE,
      issuer: PI_COIN_ISSUER,
      decimals: 7, // Stellar standard
      minTransfer: "0.0000001",
      maxTransfer: "922337203685.4775807", // Stellar max
    };
  }

  /**
   * Verify a Pi Network payment and record it on Stellar
   */
  async verifyAndRecordPiPayment(
    piPaymentProof: PiPaymentProof,
    stellarDestination: string,
    signerKeypair: StellarSdk.Keypair
  ): Promise<StellarPaymentResult> {
    try {
      // Ensure SCP is synchronized
      if (!this.scpBinding.isSynchronized()) {
        return {
          success: false,
          error: "Stellar network not synchronized. Please wait and retry.",
        };
      }

      if (!piPaymentProof.verified) {
        return {
          success: false,
          error: "Pi payment not verified by Pi Network",
        };
      }

      // Load source account
      const sourceAccount = await this.server.loadAccount(signerKeypair.publicKey());

      // Build transaction with Pi payment memo
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: stellarDestination,
            asset: this.piAsset || StellarSdk.Asset.native(),
            amount: piPaymentProof.amount.toFixed(7),
          })
        )
        .addMemo(StellarSdk.Memo.text(`PI:${piPaymentProof.piPaymentId.slice(0, 20)}`))
        .setTimeout(180)
        .build();

      // Sign and submit
      transaction.sign(signerKeypair);
      const result = await this.server.submitTransaction(transaction);

      return {
        success: true,
        stellarTxHash: result.hash,
        ledger: result.ledger,
      };
    } catch (error) {
      console.error("[StellarPiCoinSDK] Payment failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create an escrow account for smart contract payments
   */
  async createEscrowForContract(
    contractPayment: SmartContractPayment,
    funderKeypair: StellarSdk.Keypair
  ): Promise<EscrowState> {
    // Generate escrow keypair
    const escrowKeypair = StellarSdk.Keypair.random();

    try {
      // Load funder account
      const funderAccount = await this.server.loadAccount(funderKeypair.publicKey());

      // Create escrow account with initial funding
      const createAccountTx = new StellarSdk.TransactionBuilder(funderAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.createAccount({
            destination: escrowKeypair.publicKey(),
            startingBalance: "2", // Minimum for account + trustline
          })
        )
        .addMemo(StellarSdk.Memo.text(`ESC:${contractPayment.contractId.slice(0, 18)}`))
        .setTimeout(180)
        .build();

      createAccountTx.sign(funderKeypair);
      await this.server.submitTransaction(createAccountTx);

      // If using Pi asset, add trustline
      if (this.piAsset && contractPayment.currency === "PI") {
        const escrowAccount = await this.server.loadAccount(escrowKeypair.publicKey());
        
        const trustlineTx = new StellarSdk.TransactionBuilder(escrowAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(
            StellarSdk.Operation.changeTrust({
              asset: this.piAsset,
            })
          )
          .setTimeout(180)
          .build();

        trustlineTx.sign(escrowKeypair);
        await this.server.submitTransaction(trustlineTx);
      }

      // Set up multi-sig for escrow release
      const escrowAccount = await this.server.loadAccount(escrowKeypair.publicKey());
      
      const multiSigTx = new StellarSdk.TransactionBuilder(escrowAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.setOptions({
            masterWeight: 0, // Escrow keypair can't sign alone
            lowThreshold: 2,
            medThreshold: 2,
            highThreshold: 2,
            signer: {
              ed25519PublicKey: contractPayment.sender,
              weight: 1,
            },
          })
        )
        .addOperation(
          StellarSdk.Operation.setOptions({
            signer: {
              ed25519PublicKey: contractPayment.recipient,
              weight: 1,
            },
          })
        )
        .setTimeout(180)
        .build();

      multiSigTx.sign(escrowKeypair);
      await this.server.submitTransaction(multiSigTx);

      return {
        id: contractPayment.contractId,
        stellarEscrowAccount: escrowKeypair.publicKey(),
        amount: contractPayment.amount,
        status: "pending",
        createdAt: new Date(),
        parties: {
          depositor: contractPayment.sender,
          beneficiary: contractPayment.recipient,
        },
      };
    } catch (error) {
      console.error("[StellarPiCoinSDK] Escrow creation failed:", error);
      throw error;
    }
  }

  /**
   * Fund escrow with Pi payment verification
   */
  async fundEscrowWithPi(
    escrowState: EscrowState,
    piPaymentProof: PiPaymentProof,
    depositorKeypair: StellarSdk.Keypair
  ): Promise<EscrowState> {
    if (!piPaymentProof.verified) {
      throw new Error("Pi payment must be verified before funding escrow");
    }

    if (piPaymentProof.amount !== escrowState.amount) {
      throw new Error(`Amount mismatch: expected ${escrowState.amount}, got ${piPaymentProof.amount}`);
    }

    try {
      const depositorAccount = await this.server.loadAccount(depositorKeypair.publicKey());
      const asset = this.piAsset || StellarSdk.Asset.native();

      const fundTx = new StellarSdk.TransactionBuilder(depositorAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: escrowState.stellarEscrowAccount,
            asset,
            amount: escrowState.amount.toFixed(7),
          })
        )
        .addMemo(StellarSdk.Memo.text(`FUND:${piPaymentProof.piPaymentId.slice(0, 17)}`))
        .setTimeout(180)
        .build();

      fundTx.sign(depositorKeypair);
      await this.server.submitTransaction(fundTx);

      return {
        ...escrowState,
        piPaymentId: piPaymentProof.piPaymentId,
        status: "funded",
      };
    } catch (error) {
      console.error("[StellarPiCoinSDK] Escrow funding failed:", error);
      throw error;
    }
  }

  /**
   * Release escrow funds (requires both party signatures)
   */
  async releaseEscrow(
    escrowState: EscrowState,
    senderSignature: StellarSdk.Keypair,
    recipientSignature: StellarSdk.Keypair
  ): Promise<StellarPaymentResult> {
    if (escrowState.status !== "funded") {
      return {
        success: false,
        error: `Cannot release escrow in '${escrowState.status}' status`,
      };
    }

    try {
      const escrowAccount = await this.server.loadAccount(escrowState.stellarEscrowAccount);
      const asset = this.piAsset || StellarSdk.Asset.native();

      // Get escrow balance
      const balance = escrowAccount.balances.find(
        (b) => b.asset_type === "native" || 
              (b.asset_type === "credit_alphanum4" && b.asset_code === PI_COIN_ASSET_CODE)
      );

      if (!balance) {
        return { success: false, error: "No balance found in escrow" };
      }

      const releaseAmount = this.piAsset 
        ? (balance as StellarSdk.Horizon.HorizonApi.BalanceLineAsset).balance
        : (balance as StellarSdk.Horizon.HorizonApi.BalanceLineNative).balance;

      // Build release transaction
      const releaseTx = new StellarSdk.TransactionBuilder(escrowAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: escrowState.parties.beneficiary,
            asset,
            amount: (Number.parseFloat(releaseAmount) - 0.5).toFixed(7), // Keep reserve
          })
        )
        .addMemo(StellarSdk.Memo.text("RELEASE"))
        .setTimeout(180)
        .build();

      // Both parties must sign
      releaseTx.sign(senderSignature);
      releaseTx.sign(recipientSignature);

      const result = await this.server.submitTransaction(releaseTx);

      return {
        success: true,
        stellarTxHash: result.hash,
        ledger: result.ledger,
      };
    } catch (error) {
      console.error("[StellarPiCoinSDK] Escrow release failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Query Pi Coin balance on Stellar
   */
  async getPiCoinBalance(accountId: string): Promise<string> {
    try {
      const account = await this.server.loadAccount(accountId);
      
      if (this.piAsset) {
        const piBalance = account.balances.find(
          (b) => b.asset_type === "credit_alphanum4" && 
                 b.asset_code === PI_COIN_ASSET_CODE &&
                 (b as StellarSdk.Horizon.HorizonApi.BalanceLineAsset).asset_issuer === PI_COIN_ISSUER
        ) as StellarSdk.Horizon.HorizonApi.BalanceLineAsset | undefined;
        
        return piBalance?.balance || "0";
      }

      // Fallback to native balance
      const nativeBalance = account.balances.find(
        (b) => b.asset_type === "native"
      ) as StellarSdk.Horizon.HorizonApi.BalanceLineNative;
      
      return nativeBalance?.balance || "0";
    } catch (error) {
      console.error("[StellarPiCoinSDK] Balance query failed:", error);
      return "0";
    }
  }

  /**
   * Create payment channel for smart contract milestones
   */
  async createMilestonePaymentChannel(
    contractId: string,
    milestones: { amount: number; description: string }[],
    funderKeypair: StellarSdk.Keypair,
    recipientPublicKey: string
  ): Promise<{
    channelId: string;
    milestoneAccounts: string[];
    totalAmount: number;
  }> {
    const milestoneAccounts: string[] = [];
    const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);

    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      const escrow = await this.createEscrowForContract(
        {
          contractId: `${contractId}-M${i + 1}`,
          paymentType: "milestone",
          amount: milestone.amount,
          currency: "PI",
          sender: funderKeypair.publicKey(),
          recipient: recipientPublicKey,
          metadata: { milestone: i + 1, description: milestone.description },
        },
        funderKeypair
      );
      milestoneAccounts.push(escrow.stellarEscrowAccount);
    }

    return {
      channelId: contractId,
      milestoneAccounts,
      totalAmount,
    };
  }

  /**
   * Get current SCP state for smart contract validation
   */
  getSCPState() {
    return {
      currentLedger: this.scpBinding.getCurrentLedger(),
      networkPassphrase: this.scpBinding.getNetworkPassphrase(),
      isSynchronized: this.scpBinding.isSynchronized(),
    };
  }

  /**
   * Wait for transaction confirmation on specific ledger
   */
  async waitForConfirmation(targetLedger?: number): Promise<number> {
    return this.scpBinding.waitForLedger(targetLedger);
  }
}

// Singleton instance
let sdkInstance: StellarPiCoinSDK | null = null;

/**
 * Get or create the global Stellar Pi Coin SDK instance
 */
export function getStellarPiCoinSDK(): StellarPiCoinSDK {
  if (!sdkInstance) {
    sdkInstance = new StellarPiCoinSDK();
  }
  return sdkInstance;
}

export default StellarPiCoinSDK;
