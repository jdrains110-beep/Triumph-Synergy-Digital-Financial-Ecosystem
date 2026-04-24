// app/api/pi/kyc/route.ts
// Pi Network Fast-Track KYC API
// Individual KYC verification endpoints

import { NextResponse } from 'next/server';
import { piFastTrackKYC } from '@/lib/pi-kyc';

/**
 * POST /api/pi/kyc
 * Initiate Fast-Track KYC verification
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.piUid || !body.username || !body.piAccessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: piUid, username, piAccessToken' },
        { status: 400 }
      );
    }

    if (!body.consentGiven || !body.gdprConsent) {
      return NextResponse.json(
        { error: 'User consent required for KYC verification' },
        { status: 400 }
      );
    }

    const application = await piFastTrackKYC.initiateKYC({
      piUid: body.piUid,
      username: body.username,
      requestedLevel: body.requestedLevel || 'FAST_TRACK_APPROVED',
      piAccessToken: body.piAccessToken,
      consentGiven: body.consentGiven,
      gdprConsent: body.gdprConsent,
      additionalDocuments: body.additionalDocuments,
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
    console.error('KYC initiation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'KYC initiation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pi/kyc?applicationId=XXX or ?piUid=XXX
 * Get KYC status
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const piUid = searchParams.get('piUid');

    if (applicationId) {
      const application = await piFastTrackKYC.getApplicationStatus(applicationId);
      if (!application) {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ application });
    }

    if (piUid) {
      const user = await piFastTrackKYC.getUserKYCStatus(piUid);
      if (!user) {
        return NextResponse.json(
          { verified: false, kycLevel: 'UNVERIFIED' }
        );
      }
      return NextResponse.json({
        verified: true,
        user: {
          piUid: user.piUid,
          username: user.username,
          kycLevel: user.kycLevel,
          kycScore: user.kycScore,
          piWalletAddress: user.piWalletAddress,
          verificationDate: user.verificationDate,
          expiryDate: user.expiryDate,
          riskProfile: user.riskProfile,
        },
      });
    }

    return NextResponse.json(
      { error: 'Provide applicationId or piUid query parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('KYC status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve KYC status' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pi/kyc
 * Submit additional documents or update application
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.applicationId) {
      return NextResponse.json(
        { error: 'applicationId required' },
        { status: 400 }
      );
    }

    // Handle document submission
    if (body.documents) {
      const application = await piFastTrackKYC.submitDocuments(
        body.applicationId,
        body.documents
      );
      return NextResponse.json({ application });
    }

    // Handle admin review
    if (body.adminReview && body.decision) {
      const application = await piFastTrackKYC.reviewApplication(
        body.applicationId,
        body.decision,
        body.notes
      );
      return NextResponse.json({ application });
    }

    return NextResponse.json(
      { error: 'Invalid update request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('KYC update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update KYC' },
      { status: 500 }
    );
  }
}
