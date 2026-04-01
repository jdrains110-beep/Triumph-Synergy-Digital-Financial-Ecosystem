// app/api/pi/wallet/route.ts
// Pi Network Wallet Provisioning API
// Individual and business wallet endpoints

import { NextResponse } from 'next/server';
import { piWalletProvisioning, piFastTrackKYC } from '@/lib/pi-kyc';

/**
 * POST /api/pi/wallet
 * Provision new Pi wallet (requires KYC completion)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.piUid) {
      return NextResponse.json(
        { error: 'piUid required' },
        { status: 400 }
      );
    }

    // Verify KYC status
    const kycStatus = await piFastTrackKYC.getUserKYCStatus(body.piUid);
    if (!kycStatus || kycStatus.kycLevel === 'UNVERIFIED') {
      return NextResponse.json(
        { 
          error: 'KYC verification required before wallet creation',
          kycRequired: true,
          kycEndpoint: '/api/pi/kyc'
        },
        { status: 403 }
      );
    }

    // Check if wallet already exists
    if (kycStatus.piWalletAddress) {
      return NextResponse.json({
        success: true,
        walletExists: true,
        wallet: {
          walletAddress: kycStatus.piWalletAddress,
          createdAt: kycStatus.verificationDate,
        },
      });
    }

    // Provision new wallet
    const result = await piWalletProvisioning.provisionIndividualWallet(kycStatus);

    if (result.success) {
      return NextResponse.json({
        success: true,
        wallet: {
          walletId: result.walletId,
          walletAddress: result.walletAddress,
          transactionId: result.transactionId,
          createdAt: result.createdAt,
        },
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Wallet provisioning failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Wallet provisioning error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Wallet creation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pi/wallet?piUid=XXX or ?walletAddress=XXX
 * Get wallet information
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const piUid = searchParams.get('piUid');
    const walletAddress = searchParams.get('walletAddress');

    if (piUid) {
      // Get user's wallet via KYC status
      const kycStatus = await piFastTrackKYC.getUserKYCStatus(piUid);
      
      if (!kycStatus) {
        return NextResponse.json(
          { error: 'User not found', hasWallet: false }
        );
      }

      if (!kycStatus.piWalletAddress) {
        return NextResponse.json({
          hasWallet: false,
          kycLevel: kycStatus.kycLevel,
          canCreateWallet: kycStatus.kycLevel !== 'UNVERIFIED',
        });
      }

      // Get wallet balance
      const balance = await piWalletProvisioning.getWalletBalance(
        kycStatus.piWalletAddress
      );

      return NextResponse.json({
        hasWallet: true,
        wallet: {
          walletAddress: kycStatus.piWalletAddress,
          kycLevel: kycStatus.kycLevel,
          balance,
        },
      });
    }

    if (walletAddress) {
      // Get balance for specific wallet
      const balance = await piWalletProvisioning.getWalletBalance(walletAddress);

      return NextResponse.json({
        walletAddress,
        balance,
      });
    }

    return NextResponse.json(
      { error: 'Provide piUid or walletAddress query parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Wallet query error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve wallet information' },
      { status: 500 }
    );
  }
}
