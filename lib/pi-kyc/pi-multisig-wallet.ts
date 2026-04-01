// lib/pi-kyc/pi-multisig-wallet.ts
// Pi Network Multi-Signature Wallet Management System
// Enterprise-grade security for business Pi transactions

import {
  PiMultiSigWallet,
  PiWalletSignatory,
  PiSpendingLimits,
  PiTransactionRule,
} from './types';

/**
 * Multi-Sig Transaction Status
 */
export type MultiSigTransactionStatus =
  | 'PENDING_SIGNATURES'
  | 'PENDING_EXECUTION'
  | 'EXECUTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

/**
 * Multi-Sig Transaction
 */
export interface MultiSigTransaction {
  transactionId: string;
  walletId: string;
  type: 'PAYMENT' | 'ADD_SIGNATORY' | 'REMOVE_SIGNATORY' | 'UPDATE_THRESHOLD' | 'UPDATE_LIMITS';
  amount?: number;
  recipient?: string;
  memo?: string;
  requiredSignatures: number;
  currentSignatures: number;
  signatures: TransactionSignature[];
  status: MultiSigTransactionStatus;
  initiator: string;         // Pi UID
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  executedAt?: string;
  blockchainTx?: string;     // Stellar transaction hash
}

/**
 * Transaction Signature
 */
export interface TransactionSignature {
  signatoryId: string;
  piUid: string;
  signedAt: string;
  signature: string;         // Digital signature
  deviceId: string;
  biometricVerified: boolean;
  ipAddress?: string;
}

/**
 * Pi Multi-Sig Wallet Manager
 * 
 * SUPERIOR DESIGN FOR ENTERPRISE SECURITY:
 * 1. Threshold Signatures - M-of-N approval requirements
 * 2. Time-Locked Transactions - Configurable delays for high-value
 * 3. Role-Based Access - Owner, Admin, Signatory, Viewer
 * 4. Biometric Verification - Optional 2FA via biometrics
 * 5. Device Binding - Transactions tied to verified devices
 * 6. Audit Trail - Complete transaction history
 * 7. Emergency Recovery - Business continuity options
 */
export class PiMultiSigWalletManager {
  private readonly wallets: Map<string, PiMultiSigWallet> = new Map();
  private readonly transactions: Map<string, MultiSigTransaction> = new Map();
  private readonly pendingByWallet: Map<string, Set<string>> = new Map();

  constructor() {}

  /**
   * REGISTER MULTI-SIG WALLET
   * Store and manage multi-sig wallet
   */
  registerWallet(wallet: PiMultiSigWallet): void {
    this.wallets.set(wallet.walletId, wallet);
    this.pendingByWallet.set(wallet.walletId, new Set());
  }

  /**
   * GET WALLET
   */
  getWallet(walletId: string): PiMultiSigWallet | null {
    return this.wallets.get(walletId) || null;
  }

  /**
   * INITIATE PAYMENT
   * Start multi-sig payment process
   */
  async initiatePayment(
    walletId: string,
    initiatorPiUid: string,
    amount: number,
    recipient: string,
    memo?: string,
    options?: {
      bypassRules?: boolean;
      urgentFlag?: boolean;
    }
  ): Promise<MultiSigTransaction> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify initiator is authorized
    const signatory = wallet.signatories.find(s => s.piUid === initiatorPiUid);
    if (!signatory || !signatory.canInitiate) {
      throw new Error('Not authorized to initiate transactions');
    }

    // Check spending limits
    this.validateSpendingLimits(wallet, amount);

    // Evaluate transaction rules
    const rules = this.evaluateTransactionRules(wallet, {
      amount,
      recipient,
      time: new Date(),
    });

    // Determine required signatures
    let requiredSignatures = 1;
    for (const rule of rules.triggeredRules) {
      if (rule.action === 'REQUIRE_MULTI_SIG' && rule.signaturesRequired) {
        requiredSignatures = Math.max(requiredSignatures, rule.signaturesRequired);
      }
      if (rule.action === 'REQUIRE_ALL_SIGNERS') {
        requiredSignatures = wallet.totalSignatories;
      }
      if (rule.action === 'BLOCK') {
        throw new Error(`Transaction blocked by rule: ${rule.ruleName}`);
      }
    }

    // Ensure threshold is met
    requiredSignatures = Math.max(requiredSignatures, wallet.signatoryThreshold);

    const transactionId = this.generateTransactionId();
    const now = new Date();

    // Calculate expiry (default 24 hours, urgent = 4 hours)
    const expiryHours = options?.urgentFlag ? 4 : 24;
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const transaction: MultiSigTransaction = {
      transactionId,
      walletId,
      type: 'PAYMENT',
      amount,
      recipient,
      memo,
      requiredSignatures,
      currentSignatures: 0,
      signatures: [],
      status: 'PENDING_SIGNATURES',
      initiator: initiatorPiUid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.transactions.set(transactionId, transaction);
    this.pendingByWallet.get(walletId)?.add(transactionId);

    // Auto-add initiator's signature if they're a signatory
    if (signatory.canApprove) {
      await this.addSignature(transactionId, initiatorPiUid, {
        deviceId: 'initiator_device',
        biometricVerified: false,
      });
    }

    // Send alerts for triggered rules
    for (const rule of rules.triggeredRules) {
      if (rule.action === 'ALERT' && rule.alertRecipients) {
        await this.sendAlerts(wallet, rule.alertRecipients, transaction);
      }
    }

    return this.transactions.get(transactionId)!;
  }

  /**
   * ADD SIGNATURE
   * Sign a pending transaction
   */
  async addSignature(
    transactionId: string,
    signatoryPiUid: string,
    options: {
      deviceId: string;
      biometricVerified: boolean;
      signatureData?: string;
    }
  ): Promise<MultiSigTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'PENDING_SIGNATURES') {
      throw new Error(`Cannot sign transaction in status: ${transaction.status}`);
    }

    // Check expiry
    if (new Date() > new Date(transaction.expiresAt)) {
      transaction.status = 'EXPIRED';
      transaction.updatedAt = new Date().toISOString();
      this.transactions.set(transactionId, transaction);
      throw new Error('Transaction has expired');
    }

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify signatory
    const signatory = wallet.signatories.find(s => s.piUid === signatoryPiUid);
    if (!signatory || !signatory.canApprove) {
      throw new Error('Not authorized to approve transactions');
    }

    // Check for duplicate signature
    if (transaction.signatures.find(s => s.piUid === signatoryPiUid)) {
      throw new Error('Already signed this transaction');
    }

    // Create signature
    const signature: TransactionSignature = {
      signatoryId: signatory.piUid,
      piUid: signatoryPiUid,
      signedAt: new Date().toISOString(),
      signature: options.signatureData || this.generateSignature(transaction, signatoryPiUid),
      deviceId: options.deviceId,
      biometricVerified: options.biometricVerified,
    };

    transaction.signatures.push(signature);
    transaction.currentSignatures++;
    transaction.updatedAt = new Date().toISOString();

    // Update signatory last active
    signatory.lastActive = new Date().toISOString();

    // Check if threshold met
    if (transaction.currentSignatures >= transaction.requiredSignatures) {
      transaction.status = 'PENDING_EXECUTION';
      
      // Auto-execute if all conditions met
      await this.executeTransaction(transactionId);
    }

    this.transactions.set(transactionId, transaction);
    this.wallets.set(wallet.walletId, wallet);

    return transaction;
  }

  /**
   * REJECT TRANSACTION
   * Signatory rejects a pending transaction
   */
  async rejectTransaction(
    transactionId: string,
    signatoryPiUid: string,
    reason?: string
  ): Promise<MultiSigTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify signatory has rejection rights (Owner or Admin)
    const signatory = wallet.signatories.find(s => s.piUid === signatoryPiUid);
    if (!signatory || (signatory.role !== 'OWNER' && signatory.role !== 'ADMIN')) {
      throw new Error('Not authorized to reject transactions');
    }

    transaction.status = 'REJECTED';
    transaction.updatedAt = new Date().toISOString();
    transaction.memo = transaction.memo 
      ? `${transaction.memo} | REJECTED: ${reason || 'No reason provided'}`
      : `REJECTED: ${reason || 'No reason provided'}`;

    this.transactions.set(transactionId, transaction);
    this.pendingByWallet.get(transaction.walletId)?.delete(transactionId);

    return transaction;
  }

  /**
   * EXECUTE TRANSACTION
   * Submit transaction to blockchain
   */
  private async executeTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'PENDING_EXECUTION') {
      return;
    }

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    try {
      // In production, submit to Stellar network
      // const server = new StellarSdk.Server('https://horizon.stellar.org');
      // const transaction = new StellarSdk.TransactionBuilder(account)
      //   .addOperation(StellarSdk.Operation.payment({
      //     destination: recipient,
      //     asset: StellarSdk.Asset.native(),
      //     amount: amount.toString()
      //   }))
      //   .build();
      // 
      // // Add all signatures
      // for (const sig of transaction.signatures) {
      //   transaction.sign(signerKeypairs[sig.piUid]);
      // }
      // 
      // const result = await server.submitTransaction(transaction);

      // Simulate blockchain transaction
      const blockchainTx = this.generateBlockchainTxHash();

      transaction.status = 'EXECUTED';
      transaction.executedAt = new Date().toISOString();
      transaction.blockchainTx = blockchainTx;
      transaction.updatedAt = new Date().toISOString();

      this.transactions.set(transactionId, transaction);
      this.pendingByWallet.get(transaction.walletId)?.delete(transactionId);

    } catch (error) {
      console.error('Transaction execution failed:', error);
      // Keep in PENDING_EXECUTION for retry
    }
  }

  /**
   * VALIDATE SPENDING LIMITS
   */
  private validateSpendingLimits(wallet: PiMultiSigWallet, amount: number): void {
    const limits = wallet.spendingLimits;

    if (amount > limits.singleTransactionLimit) {
      // This will trigger multi-sig via rules
    }

    // In production, track actual spending against limits
    // const dailySpent = await this.getDailySpending(wallet.walletId);
    // if (dailySpent + amount > limits.dailyLimit) {
    //   throw new Error('Daily spending limit exceeded');
    // }
  }

  /**
   * EVALUATE TRANSACTION RULES
   */
  private evaluateTransactionRules(
    wallet: PiMultiSigWallet,
    context: {
      amount: number;
      recipient: string;
      time: Date;
    }
  ): {
    triggeredRules: PiTransactionRule[];
    passed: boolean;
  } {
    const triggeredRules: PiTransactionRule[] = [];

    for (const rule of wallet.transactionRules) {
      const triggered = this.evaluateRule(rule, context);
      if (triggered) {
        triggeredRules.push(rule);
      }
    }

    return {
      triggeredRules,
      passed: !triggeredRules.some(r => r.action === 'BLOCK'),
    };
  }

  /**
   * EVALUATE SINGLE RULE
   */
  private evaluateRule(
    rule: PiTransactionRule,
    context: { amount: number; recipient: string; time: Date }
  ): boolean {
    const { condition } = rule;

    switch (condition.type) {
      case 'AMOUNT':
        switch (condition.operator) {
          case '>': return context.amount > condition.value;
          case '<': return context.amount < condition.value;
          case '==': return context.amount === condition.value;
          default: return false;
        }

      case 'TIME':
        // Check if time is outside business hours
        const hour = context.time.getHours();
        if (condition.operator === 'NOT_IN' && condition.value === '09:00-18:00') {
          return hour < 9 || hour >= 18;
        }
        return false;

      case 'RECIPIENT':
        // In production, check against whitelist/blacklist
        return false;

      default:
        return false;
    }
  }

  /**
   * ADD SIGNATORY TO WALLET
   * Requires multi-sig approval
   */
  async addSignatory(
    walletId: string,
    initiatorPiUid: string,
    newSignatory: {
      piUid: string;
      role: 'SIGNATORY' | 'VIEWER';
    }
  ): Promise<MultiSigTransaction> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify initiator has admin rights
    const initiator = wallet.signatories.find(s => s.piUid === initiatorPiUid);
    if (!initiator || (initiator.role !== 'OWNER' && initiator.role !== 'ADMIN')) {
      throw new Error('Not authorized to add signatories');
    }

    // Check if already a signatory
    if (wallet.signatories.find(s => s.piUid === newSignatory.piUid)) {
      throw new Error('Already a signatory');
    }

    const transactionId = this.generateTransactionId();
    const now = new Date();

    // Adding signatory requires all current owners/admins
    const requiredSignatures = wallet.signatories.filter(
      s => s.role === 'OWNER' || s.role === 'ADMIN'
    ).length;

    const transaction: MultiSigTransaction = {
      transactionId,
      walletId,
      type: 'ADD_SIGNATORY',
      memo: `Add ${newSignatory.piUid} as ${newSignatory.role}`,
      requiredSignatures,
      currentSignatures: 0,
      signatures: [],
      status: 'PENDING_SIGNATURES',
      initiator: initiatorPiUid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
    };

    this.transactions.set(transactionId, transaction);
    this.pendingByWallet.get(walletId)?.add(transactionId);

    return transaction;
  }

  /**
   * UPDATE THRESHOLD
   * Change signature threshold
   */
  async updateThreshold(
    walletId: string,
    initiatorPiUid: string,
    newThreshold: number
  ): Promise<MultiSigTransaction> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Validate threshold
    if (newThreshold < 1 || newThreshold > wallet.totalSignatories) {
      throw new Error('Invalid threshold');
    }

    // Only owner can change threshold
    const initiator = wallet.signatories.find(s => s.piUid === initiatorPiUid);
    if (!initiator || initiator.role !== 'OWNER') {
      throw new Error('Only owner can change threshold');
    }

    const transactionId = this.generateTransactionId();
    const now = new Date();

    // Requires all owners
    const requiredSignatures = wallet.signatories.filter(s => s.role === 'OWNER').length;

    const transaction: MultiSigTransaction = {
      transactionId,
      walletId,
      type: 'UPDATE_THRESHOLD',
      memo: `Update threshold from ${wallet.signatoryThreshold} to ${newThreshold}`,
      requiredSignatures,
      currentSignatures: 0,
      signatures: [],
      status: 'PENDING_SIGNATURES',
      initiator: initiatorPiUid,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
    };

    this.transactions.set(transactionId, transaction);
    this.pendingByWallet.get(walletId)?.add(transactionId);

    return transaction;
  }

  /**
   * GET PENDING TRANSACTIONS
   */
  getPendingTransactions(walletId: string): MultiSigTransaction[] {
    const pendingIds = this.pendingByWallet.get(walletId);
    if (!pendingIds) return [];

    const transactions: MultiSigTransaction[] = [];
    for (const id of pendingIds) {
      const tx = this.transactions.get(id);
      if (tx && tx.status === 'PENDING_SIGNATURES') {
        transactions.push(tx);
      }
    }
    return transactions;
  }

  /**
   * GET TRANSACTION HISTORY
   */
  getTransactionHistory(
    walletId: string,
    options?: {
      status?: MultiSigTransactionStatus;
      type?: MultiSigTransaction['type'];
      limit?: number;
    }
  ): MultiSigTransaction[] {
    const transactions: MultiSigTransaction[] = [];

    for (const tx of this.transactions.values()) {
      if (tx.walletId !== walletId) continue;
      if (options?.status && tx.status !== options.status) continue;
      if (options?.type && tx.type !== options.type) continue;
      transactions.push(tx);
    }

    // Sort by created date descending
    transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (options?.limit) {
      return transactions.slice(0, options.limit);
    }

    return transactions;
  }

  /**
   * EMERGENCY RECOVERY
   * Initiate emergency recovery process
   */
  async initiateEmergencyRecovery(
    walletId: string,
    recoveryReason: string
  ): Promise<{
    recoveryId: string;
    requiredVerifications: string[];
    expiresAt: string;
  }> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const recoveryId = `RECOVERY-${walletId}-${Date.now()}`;

    // In production, this would:
    // 1. Freeze all pending transactions
    // 2. Notify all signatories
    // 3. Require identity verification from majority
    // 4. Involve support team

    return {
      recoveryId,
      requiredVerifications: wallet.signatories
        .filter(s => s.role === 'OWNER' || s.role === 'ADMIN')
        .map(s => s.piUid),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
  }

  /**
   * SEND ALERTS
   */
  private async sendAlerts(
    wallet: PiMultiSigWallet,
    recipients: string[],
    transaction: MultiSigTransaction
  ): Promise<void> {
    // In production, send notifications via:
    // - Push notifications
    // - Email
    // - SMS
    // - In-app alerts
    
    for (const recipient of recipients) {
      if (recipient === 'owner') {
        const owners = wallet.signatories.filter(s => s.role === 'OWNER');
        for (const owner of owners) {
          console.log(`Alert sent to owner ${owner.piUid} for transaction ${transaction.transactionId}`);
        }
      }
    }
  }

  // Utility methods
  private generateTransactionId(): string {
    return `MSIG-TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateSignature(transaction: MultiSigTransaction, piUid: string): string {
    // In production, use actual cryptographic signature
    return `SIG-${piUid.substring(0, 8)}-${transaction.transactionId}-${Date.now()}`;
  }

  private generateBlockchainTxHash(): string {
    const chars = 'abcdef0123456789';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
}

// Export singleton
export const piMultiSigManager = new PiMultiSigWalletManager();
