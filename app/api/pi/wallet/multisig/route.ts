// app/api/pi/wallet/multisig/route.ts
// Pi Network Multi-Signature Wallet API
// Enterprise-grade multi-sig wallet management

import { NextResponse } from 'next/server';
import { piMultiSigManager, piFastTrackKYB } from '@/lib/pi-kyc';

/**
 * POST /api/pi/wallet/multisig
 * Initiate multi-sig transaction
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'initiatePayment': {
        const { walletId, initiatorPiUid, amount, recipient, memo } = body;

        if (!walletId || !initiatorPiUid || !amount || !recipient) {
          return NextResponse.json(
            { error: 'Missing required fields: walletId, initiatorPiUid, amount, recipient' },
            { status: 400 }
          );
        }

        const transaction = await piMultiSigManager.initiatePayment(
          walletId,
          initiatorPiUid,
          amount,
          recipient,
          memo,
          body.options
        );

        return NextResponse.json({
          success: true,
          transaction: {
            transactionId: transaction.transactionId,
            status: transaction.status,
            requiredSignatures: transaction.requiredSignatures,
            currentSignatures: transaction.currentSignatures,
            expiresAt: transaction.expiresAt,
          },
        });
      }

      case 'addSignature': {
        const { transactionId, signatoryPiUid, deviceId, biometricVerified } = body;

        if (!transactionId || !signatoryPiUid || !deviceId) {
          return NextResponse.json(
            { error: 'Missing required fields: transactionId, signatoryPiUid, deviceId' },
            { status: 400 }
          );
        }

        const transaction = await piMultiSigManager.addSignature(
          transactionId,
          signatoryPiUid,
          {
            deviceId,
            biometricVerified: biometricVerified || false,
          }
        );

        return NextResponse.json({
          success: true,
          transaction: {
            transactionId: transaction.transactionId,
            status: transaction.status,
            currentSignatures: transaction.currentSignatures,
            requiredSignatures: transaction.requiredSignatures,
            signatures: transaction.signatures.map(s => ({
              piUid: s.piUid,
              signedAt: s.signedAt,
              biometricVerified: s.biometricVerified,
            })),
          },
        });
      }

      case 'rejectTransaction': {
        const { transactionId, signatoryPiUid, reason } = body;

        if (!transactionId || !signatoryPiUid) {
          return NextResponse.json(
            { error: 'Missing required fields: transactionId, signatoryPiUid' },
            { status: 400 }
          );
        }

        const transaction = await piMultiSigManager.rejectTransaction(
          transactionId,
          signatoryPiUid,
          reason
        );

        return NextResponse.json({
          success: true,
          transaction: {
            transactionId: transaction.transactionId,
            status: transaction.status,
          },
        });
      }

      case 'addSignatory': {
        const { walletId, initiatorPiUid, newSignatory } = body;

        if (!walletId || !initiatorPiUid || !newSignatory) {
          return NextResponse.json(
            { error: 'Missing required fields: walletId, initiatorPiUid, newSignatory' },
            { status: 400 }
          );
        }

        const transaction = await piMultiSigManager.addSignatory(
          walletId,
          initiatorPiUid,
          newSignatory
        );

        return NextResponse.json({
          success: true,
          transaction: {
            transactionId: transaction.transactionId,
            status: transaction.status,
            requiredSignatures: transaction.requiredSignatures,
            type: 'ADD_SIGNATORY',
          },
        });
      }

      case 'updateThreshold': {
        const { walletId, initiatorPiUid, newThreshold } = body;

        if (!walletId || !initiatorPiUid || !newThreshold) {
          return NextResponse.json(
            { error: 'Missing required fields: walletId, initiatorPiUid, newThreshold' },
            { status: 400 }
          );
        }

        const transaction = await piMultiSigManager.updateThreshold(
          walletId,
          initiatorPiUid,
          newThreshold
        );

        return NextResponse.json({
          success: true,
          transaction: {
            transactionId: transaction.transactionId,
            status: transaction.status,
            type: 'UPDATE_THRESHOLD',
          },
        });
      }

      case 'emergencyRecovery': {
        const { walletId, reason } = body;

        if (!walletId || !reason) {
          return NextResponse.json(
            { error: 'Missing required fields: walletId, reason' },
            { status: 400 }
          );
        }

        const recovery = await piMultiSigManager.initiateEmergencyRecovery(
          walletId,
          reason
        );

        return NextResponse.json({
          success: true,
          recovery,
        });
      }

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            validActions: [
              'initiatePayment',
              'addSignature',
              'rejectTransaction',
              'addSignatory',
              'updateThreshold',
              'emergencyRecovery',
            ]
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Multi-sig operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Multi-sig operation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pi/wallet/multisig?walletId=XXX
 * Get multi-sig wallet information and pending transactions
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');
    const transactionId = searchParams.get('transactionId');

    if (transactionId) {
      // Get specific transaction
      const transactions = piMultiSigManager.getTransactionHistory(walletId || '', {
        limit: 1,
      });
      const transaction = transactions.find(t => t.transactionId === transactionId);

      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ transaction });
    }

    if (!walletId) {
      return NextResponse.json(
        { error: 'walletId query parameter required' },
        { status: 400 }
      );
    }

    // Get wallet info
    const wallet = piMultiSigManager.getWallet(walletId);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Get pending transactions
    const pendingTransactions = piMultiSigManager.getPendingTransactions(walletId);

    // Get recent history
    const recentHistory = piMultiSigManager.getTransactionHistory(walletId, {
      limit: 10,
    });

    return NextResponse.json({
      wallet: {
        walletId: wallet.walletId,
        walletAddress: wallet.walletAddress,
        businessId: wallet.businessId,
        status: wallet.status,
        signatoryThreshold: wallet.signatoryThreshold,
        totalSignatories: wallet.totalSignatories,
        signatories: wallet.signatories.map(s => ({
          piUid: s.piUid,
          username: s.username,
          role: s.role,
          canInitiate: s.canInitiate,
          canApprove: s.canApprove,
          lastActive: s.lastActive,
        })),
        spendingLimits: wallet.spendingLimits,
        escrowEnabled: wallet.escrowEnabled,
      },
      pendingTransactions: pendingTransactions.map(t => ({
        transactionId: t.transactionId,
        type: t.type,
        amount: t.amount,
        recipient: t.recipient,
        status: t.status,
        currentSignatures: t.currentSignatures,
        requiredSignatures: t.requiredSignatures,
        expiresAt: t.expiresAt,
      })),
      recentHistory: recentHistory.map(t => ({
        transactionId: t.transactionId,
        type: t.type,
        amount: t.amount,
        status: t.status,
        executedAt: t.executedAt,
        blockchainTx: t.blockchainTx,
      })),
    });
  } catch (error) {
    console.error('Multi-sig query error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve multi-sig wallet information' },
      { status: 500 }
    );
  }
}
