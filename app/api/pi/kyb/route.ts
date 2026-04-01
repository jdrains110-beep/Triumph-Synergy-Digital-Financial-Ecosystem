// app/api/pi/kyb/route.ts
// Pi Network Fast-Track KYB API
// Business verification endpoints

import { NextResponse } from 'next/server';
import { piFastTrackKYB } from '@/lib/pi-kyc';

/**
 * POST /api/pi/kyb
 * Initiate Fast-Track KYB business verification
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.ownerPiUid || !body.businessName || !body.registrationNumber || !body.jurisdiction) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['ownerPiUid', 'businessName', 'registrationNumber', 'jurisdiction']
        },
        { status: 400 }
      );
    }

    if (!body.consentGiven || !body.gdprConsent) {
      return NextResponse.json(
        { error: 'Business consent required for KYB verification' },
        { status: 400 }
      );
    }

    // Validate directors and beneficial owners
    if (!body.directors || body.directors.length === 0) {
      return NextResponse.json(
        { error: 'At least one director required' },
        { status: 400 }
      );
    }

    if (!body.beneficialOwners || body.beneficialOwners.length === 0) {
      return NextResponse.json(
        { error: 'Beneficial ownership information required' },
        { status: 400 }
      );
    }

    // Validate multi-sig config if requested
    if (body.requestMultiSigWallet && body.multiSigConfig) {
      const { signatories, threshold } = body.multiSigConfig;
      if (!signatories || signatories.length < 2) {
        return NextResponse.json(
          { error: 'Multi-sig requires at least 2 signatories' },
          { status: 400 }
        );
      }
      if (threshold < 1 || threshold > signatories.length) {
        return NextResponse.json(
          { error: 'Invalid multi-sig threshold' },
          { status: 400 }
        );
      }
    }

    const application = await piFastTrackKYB.initiateKYB({
      ownerPiUid: body.ownerPiUid,
      businessName: body.businessName,
      registrationNumber: body.registrationNumber,
      jurisdiction: body.jurisdiction,
      requestedLevel: body.requestedLevel || 'VERIFIED_BUSINESS',
      directors: body.directors,
      beneficialOwners: body.beneficialOwners,
      requestMultiSigWallet: body.requestMultiSigWallet || false,
      multiSigConfig: body.multiSigConfig,
      documents: body.documents || {},
      consentGiven: body.consentGiven,
      gdprConsent: body.gdprConsent,
    });

    return NextResponse.json({
      success: true,
      application: {
        applicationId: application.applicationId,
        status: application.status,
        fastTrackQualified: application.fastTrackQualified,
        estimatedCompletionTime: application.estimatedCompletionTime,
        verificationSteps: application.verificationSteps,
        walletProvisioning: application.walletProvisioning,
      },
    });
  } catch (error) {
    console.error('KYB initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'KYB initiation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pi/kyb?applicationId=XXX or ?businessId=XXX
 * Get KYB status
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const businessId = searchParams.get('businessId');

    if (applicationId) {
      const application = await piFastTrackKYB.getApplicationStatus(applicationId);
      if (!application) {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ application });
    }

    if (businessId) {
      const business = await piFastTrackKYB.getBusinessKYBStatus(businessId);
      if (!business) {
        return NextResponse.json(
          { verified: false, kybLevel: 'UNVERIFIED' }
        );
      }
      return NextResponse.json({
        verified: true,
        business: {
          businessId: business.businessId,
          businessName: business.businessName,
          kybLevel: business.kybLevel,
          kybScore: business.kybScore,
          verificationDate: business.verificationDate,
          expiryDate: business.expiryDate,
          directorsCount: business.directors.length,
          beneficialOwnersCount: business.beneficialOwners.length,
          hasMultiSigWallet: !!business.multiSigWallet,
          multiSigWalletAddress: business.multiSigWallet?.walletAddress,
          complianceStatus: business.complianceChecks,
        },
      });
    }

    return NextResponse.json(
      { error: 'Provide applicationId or businessId query parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('KYB status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve KYB status' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pi/kyb
 * Update business or add signatory
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.businessId) {
      return NextResponse.json(
        { error: 'businessId required' },
        { status: 400 }
      );
    }

    // Handle add signatory
    if (body.addSignatory) {
      const { signatoryPiUid, role } = body.addSignatory;
      if (!signatoryPiUid || !role) {
        return NextResponse.json(
          { error: 'signatoryPiUid and role required' },
          { status: 400 }
        );
      }

      const wallet = await piFastTrackKYB.addSignatory(
        body.businessId,
        signatoryPiUid,
        role
      );

      return NextResponse.json({
        success: true,
        wallet: {
          walletId: wallet?.walletId,
          totalSignatories: wallet?.totalSignatories,
          signatories: wallet?.signatories.map(s => ({
            piUid: s.piUid,
            role: s.role,
            addedAt: s.addedAt,
          })),
        },
      });
    }

    // Handle update spending limits
    if (body.updateSpendingLimits) {
      const wallet = await piFastTrackKYB.updateSpendingLimits(
        body.businessId,
        body.updateSpendingLimits
      );

      return NextResponse.json({
        success: true,
        spendingLimits: wallet?.spendingLimits,
      });
    }

    return NextResponse.json(
      { error: 'Invalid update request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('KYB update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update KYB' },
      { status: 500 }
    );
  }
}
