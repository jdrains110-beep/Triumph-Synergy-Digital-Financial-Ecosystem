// lib/p2p/p2p-payment-service.ts
// P2P Payment Service - Pi Network Blockchain Backbone
// Direct peer-to-peer transfers powered by Pi blockchain

import { PiNetworkBlockchain } from '@/lib/blockchain/pi-network-blockchain';
import { WalletManager } from '@/lib/wallet/wallet-manager';

export interface P2PPayment {
  id: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'settled' | 'failed';
  createdAt: Date;
  confirmedAt?: Date;
  settlementTime?: number;
}

export interface P2PPeer {
  address: string;
  name?: string;
  reputation: number;
  totalTransactions: number;
  averageTransactionAmount: number;
  isOnline: boolean;
  lastSeen: Date;
  verifiedOnBlockchain: boolean;
  kycVerified: boolean;
}

/**
 * P2P Payment Service
 * Handles peer-to-peer payments through Pi Network blockchain
 * 
 * Key Features:
 * ✅ Direct peer-to-peer transfers
 * ✅ Blockchain-verified settlements
 * ✅ Zero intermediaries
 * ✅ Immutable transaction records
 * ✅ P2P peer discovery
 * ✅ Reputation-based trust
 */
export class P2PPaymentService {
  private blockchain: PiNetworkBlockchain;
  private walletManager: WalletManager;
  private peerCache: Map<string, P2PPeer> = new Map();

  constructor(
    blockchain: PiNetworkBlockchain,
    walletManager: WalletManager
  ) {
    this.blockchain = blockchain;
    this.walletManager = walletManager;
  }

  /**
   * Send payment directly to peer
   * Blockchain-verified, P2P settlement, zero intermediaries
   * 
   * @param senderAddress - Sender's Pi wallet address
   * @param recipientAddress - Recipient's Pi wallet address
   * @param amount - Amount in Pi
   * @returns Payment confirmation with transaction hash
   */
  async sendP2PPayment(
    senderAddress: string,
    recipientAddress: string,
    amount: number
  ): Promise<P2PPayment> {
    const paymentId = `p2p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Verify sender on blockchain
      console.log(`[P2P] Verifying sender ${senderAddress}...`);
      const senderVerification = await this.blockchain.verifyAddress(
        senderAddress
      );

      if (!senderVerification.valid) {
        throw new Error('Sender not verified on blockchain');
      }

      if (!senderVerification.kycVerified) {
        throw new Error('Sender KYC not verified');
      }

      // Step 2: Verify recipient on blockchain
      console.log(`[P2P] Verifying recipient ${recipientAddress}...`);
      const recipientVerification = await this.blockchain.verifyAddress(
        recipientAddress
      );

      if (!recipientVerification.valid) {
        throw new Error('Recipient not verified on blockchain');
      }

      // Step 3: Check sender balance
      console.log(`[P2P] Checking balance for ${senderAddress}...`);
      const balance = await this.blockchain.getBalance(senderAddress);

      if (balance < amount) {
        throw new Error(
          `Insufficient balance. Have: ${balance}, Need: ${amount}`
        );
      }

      // Step 4: Create transaction on blockchain
      console.log(`[P2P] Creating transaction: ${amount} Pi...`);
      const transaction = await this.blockchain.createTransaction({
        from: senderAddress,
        to: recipientAddress,
        amount,
        type: 'p2p_transfer',
        metadata: {
          paymentId,
          timestamp: new Date().toISOString()
        }
      });

      // Step 5: Sign transaction with sender's private key
      console.log(`[P2P] Signing transaction...`);
      const signedTx = await this.walletManager.signTransaction(
        senderAddress,
        transaction
      );

      // Step 6: Broadcast to P2P network
      console.log(`[P2P] Broadcasting to P2P network...`);
      const broadcastStartTime = Date.now();
      await this.blockchain.broadcastTransaction(signedTx);

      // Step 7: Wait for blockchain consensus (30 second timeout)
      console.log(`[P2P] Waiting for blockchain consensus...`);
      const consensusAchieved = await this.blockchain.waitForConsensus(
        signedTx.hash,
        30000
      );

      if (!consensusAchieved) {
        throw new Error('Blockchain consensus timeout');
      }

      // Step 8: Verify transaction on blockchain
      console.log(`[P2P] Verifying transaction on blockchain...`);
      const verification = await this.blockchain.verifyTransaction(
        signedTx.hash
      );

      if (!verification.valid || !verification.confirmed) {
        throw new Error('Transaction verification failed');
      }

      const settlementTime = Date.now() - broadcastStartTime;

      console.log(
        `[P2P] ✅ Payment settled in ${settlementTime}ms (${verification.confirmations} confirmations)`
      );

      // Step 9: Store payment record in database
      await this.storePaymentRecord({
        id: paymentId,
        senderAddress,
        recipientAddress,
        amount,
        transactionHash: signedTx.hash,
        status: 'settled',
        createdAt: new Date(),
        confirmedAt: new Date(),
        settlementTime
      });

      return {
        id: paymentId,
        senderAddress,
        recipientAddress,
        amount,
        transactionHash: signedTx.hash,
        status: 'settled',
        createdAt: new Date(),
        confirmedAt: new Date(),
        settlementTime
      };
    } catch (error) {
      console.error(`[P2P] Payment failed: ${error}`);

      // Store failed payment record
      await this.storePaymentRecord({
        id: paymentId,
        senderAddress,
        recipientAddress,
        amount,
        status: 'failed',
        createdAt: new Date()
      });

      throw error;
    }
  }

  /**
   * Request payment from peer
   * Creates a blockchain-verified payment request
   * 
   * @param requesterAddress - Address requesting payment
   * @param payerAddress - Address to pay
   * @param amount - Amount in Pi
   * @returns Payment request with blockchain verification
   */
  async requestP2PPayment(
    requesterAddress: string,
    payerAddress: string,
    amount: number
  ): Promise<{
    requestId: string;
    status: string;
    expiresAt: Date;
    blockchainVerified: boolean;
  }> {
    try {
      // Step 1: Verify requester on blockchain
      const requesterVerification = await this.blockchain.verifyAddress(
        requesterAddress
      );

      if (!requesterVerification.valid) {
        throw new Error('Requester not verified on blockchain');
      }

      // Step 2: Create payment request
      const requestId = `payreq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const paymentRequest = await this.blockchain.createPaymentRequest({
        requestId,
        requester: requesterAddress,
        payer: payerAddress,
        amount,
        expiresAt: expiresAt.getTime(),
        status: 'pending'
      });

      // Step 3: Sign request
      const signedRequest = await this.walletManager.signRequest(
        requesterAddress,
        paymentRequest
      );

      // Step 4: Broadcast to blockchain
      await this.blockchain.broadcastPaymentRequest(signedRequest);

      // Step 5: Verify on blockchain
      const verification = await this.blockchain.verifyPaymentRequest(
        requestId
      );

      console.log(
        `[P2P] ✅ Payment request created: ${requestId} (expires: ${expiresAt.toISOString()})`
      );

      return {
        requestId,
        status: 'pending',
        expiresAt,
        blockchainVerified: verification.valid
      };
    } catch (error) {
      console.error(`[P2P] Request creation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Accept payment request
   * Automatically processes payment from pending request
   * 
   * @param requestId - Payment request ID
   * @param payerAddress - Payer's wallet address
   * @returns Confirmation of payment
   */
  async acceptPaymentRequest(
    requestId: string,
    payerAddress: string
  ): Promise<P2PPayment> {
    try {
      // Step 1: Retrieve payment request from blockchain
      const paymentRequest = await this.blockchain.getPaymentRequest(requestId);

      if (!paymentRequest) {
        throw new Error('Payment request not found');
      }

      // Step 2: Verify request not expired
      if (paymentRequest.expiresAt < Date.now()) {
        throw new Error('Payment request expired');
      }

      // Step 3: Verify payer address matches
      if (paymentRequest.payer !== payerAddress) {
        throw new Error('Payer address mismatch');
      }

      // Step 4: Process payment
      const payment = await this.sendP2PPayment(
        payerAddress,
        paymentRequest.requester,
        paymentRequest.amount
      );

      // Step 5: Mark request as accepted
      await this.blockchain.updatePaymentRequest(requestId, {
        status: 'accepted',
        transactionHash: payment.transactionHash
      });

      console.log(`[P2P] ✅ Payment request accepted: ${requestId}`);

      return payment;
    } catch (error) {
      console.error(`[P2P] Request acceptance failed: ${error}`);
      throw error;
    }
  }

  /**
   * Discover peers on P2P network
   * Get verified peers for direct transactions
   * 
   * @param filters - Optional filters for peer discovery
   * @returns List of verified peers
   */
  async discoverPeers(filters?: {
    country?: string;
    minReputation?: number;
    maxLatency?: number;
    onlineOnly?: boolean;
  }): Promise<P2PPeer[]> {
    try {
      // Get peer list from blockchain
      const peers = await this.blockchain.discoverPeers(filters);

      // Verify each peer on blockchain
      const verifiedPeers = await Promise.all(
        peers.map(async (peer) => {
          // Check cache first
          if (this.peerCache.has(peer.address)) {
            return this.peerCache.get(peer.address)!;
          }

          // Verify on blockchain
          const verification = await this.blockchain.verifyAddress(
            peer.address
          );

          const verifiedPeer: P2PPeer = {
            address: peer.address,
            name: peer.name,
            reputation: verification.reputation,
            totalTransactions: verification.totalTransactions,
            averageTransactionAmount: peer.avgTransaction || 0,
            isOnline: peer.isOnline,
            lastSeen: new Date(peer.lastSeen),
            verifiedOnBlockchain: verification.valid,
            kycVerified: verification.kycVerified
          };

          // Cache the result
          this.peerCache.set(peer.address, verifiedPeer);

          return verifiedPeer;
        })
      );

      console.log(`[P2P] Discovered ${verifiedPeers.length} peers`);

      return verifiedPeers;
    } catch (error) {
      console.error(`[P2P] Peer discovery failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get peer reputation score
   * Higher reputation = more trusted peer
   * 
   * @param peerAddress - Peer's wallet address
   * @returns Reputation score (0-100)
   */
  async getPeerReputation(peerAddress: string): Promise<{
    score: number;
    totalTransactions: number;
    successRate: number;
    averageRating: number;
    trustLevel: 'unverified' | 'low' | 'medium' | 'high' | 'excellent';
  }> {
    try {
      const reputation = await this.blockchain.getReputation(peerAddress);

      let trustLevel: 'unverified' | 'low' | 'medium' | 'high' | 'excellent';
      if (reputation.score < 20) trustLevel = 'unverified';
      else if (reputation.score < 40) trustLevel = 'low';
      else if (reputation.score < 60) trustLevel = 'medium';
      else if (reputation.score < 80) trustLevel = 'high';
      else trustLevel = 'excellent';

      return {
        score: reputation.score,
        totalTransactions: reputation.totalTransactions,
        successRate: reputation.successRate,
        averageRating: reputation.averageRating,
        trustLevel
      };
    } catch (error) {
      console.error(`[P2P] Reputation fetch failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get payment history for user
   * Retrieved from blockchain immutable ledger
   * 
   * @param userAddress - User's wallet address
   * @param limit - Number of records to retrieve
   * @returns List of P2P payments
   */
  async getPaymentHistory(
    userAddress: string,
    limit: number = 50
  ): Promise<P2PPayment[]> {
    try {
      // Get transactions from blockchain
      const transactions = await this.blockchain.getUserTransactions(
        userAddress,
        limit
      );

      const payments = transactions.map((tx) => ({
        id: tx.id,
        senderAddress: tx.from,
        recipientAddress: tx.to,
        amount: tx.amount,
        transactionHash: tx.hash,
        status: tx.confirmed ? 'settled' : 'confirmed',
        createdAt: new Date(tx.timestamp),
        confirmedAt: tx.confirmationTime
          ? new Date(tx.confirmationTime)
          : undefined,
        settlementTime: tx.settlementTime
      }));

      console.log(`[P2P] Retrieved ${payments.length} payment records`);

      return payments;
    } catch (error) {
      console.error(`[P2P] History retrieval failed: ${error}`);
      throw error;
    }
  }

  /**
   * Verify payment on blockchain
   * Confirm transaction authenticity and settlement
   * 
   * @param transactionHash - Transaction hash from blockchain
   * @returns Verification result
   */
  async verifyPayment(transactionHash: string): Promise<{
    valid: boolean;
    confirmed: boolean;
    confirmations: number;
    sender: string;
    receiver: string;
    amount: number;
    timestamp: Date;
  }> {
    try {
      const verification = await this.blockchain.verifyTransaction(
        transactionHash
      );

      return {
        valid: verification.valid,
        confirmed: verification.confirmed,
        confirmations: verification.confirmations,
        sender: verification.parties.sender,
        receiver: verification.parties.receiver,
        amount: verification.amount,
        timestamp: new Date(verification.timestamp)
      };
    } catch (error) {
      console.error(`[P2P] Payment verification failed: ${error}`);
      throw error;
    }
  }

  /**
   * Store payment record in database
   * For history and audit purposes
   * 
   * @private
   */
  private async storePaymentRecord(payment: P2PPayment): Promise<void> {
    try {
      // INSERT into p2p_payments table
      console.log(`[P2P] Storing payment record: ${payment.id}`);
      // In production: execute database query
      // await db.query('INSERT INTO p2p_payments ...')
    } catch (error) {
      console.error(`[P2P] Failed to store payment record: ${error}`);
      // Don't throw - blockchain is source of truth
    }
  }
}

export default P2PPaymentService;
