/**
 * Contract API Routes
 * Endpoints for creating, managing, and signing contracts
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContractService } from '@/lib/contracts/service';
import { AuditTrailService } from '@/lib/contracts/audit-trail-service';
import { DocuSignService } from '@/lib/contracts/docusign-service';
import {
  Contract,
  ContractType,
  SignatureMethod,
  ContractStatus,
  ConsentStatus,
} from '@/lib/contracts/types';

/**
 * GET /api/contracts - List user's contracts
 */
export async function getContracts(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const result = await ContractService.getUserContracts(userId, limit, offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts - Create a new contract
 */
export async function createContract(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      type,
      title,
      version,
      content,
      htmlContent,
      jurisdiction,
      effectiveDate,
      expiryDate,
      tags,
    } = body;

    if (!type || !title || !content || !jurisdiction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const contract = await ContractService.createContract(
      {
        type: type as ContractType,
        title,
        version: version || '1.0',
        content,
        htmlContent,
        jurisdiction,
        effectiveDate: new Date(effectiveDate),
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status: ContractStatus.DRAFT,
        tags: tags || [],
      },
      userId
    );

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contracts/:contractId - Get contract details
 */
export async function getContractDetails(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params;
    const details = await ContractService.getContractWithDetails(contractId);

    if (!details) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/:contractId/sign - Sign a contract
 */
export async function signContract(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params;
    const userId = req.headers.get('x-user-id');
    const email = req.headers.get('x-user-email');
    const displayName = req.headers.get('x-user-name') || 'Unknown';

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      signatureData,
      method,
      screenshotBase64,
      ipAddress,
      userAgent,
      platform,
      browser,
      deviceType,
      country,
      city,
    } = body;

    if (!signatureData || !method) {
      return NextResponse.json(
        { error: 'Signature data and method required' },
        { status: 400 }
      );
    }

    // Capture screenshot evidence
    let screenshotHash: string | undefined;
    if (screenshotBase64) {
      const screenshot = AuditTrailService.captureScreenshot(
        screenshotBase64,
        'Contract signing acceptance'
      );
      screenshotHash = screenshot.hash;
    }

    // Sign the contract
    const signature = await ContractService.signContract(
      contractId,
      userId,
      email,
      displayName,
      signatureData,
      method as SignatureMethod,
      {
        ipAddress,
        userAgent,
        platform,
        browser,
        deviceType,
        country,
        city,
      }
    );

    // Log comprehensive audit event
    await AuditTrailService.logSigningEvent(
      contractId,
      userId,
      {
        ipAddress,
        userAgent,
        platform,
        browser,
        deviceType,
        timestamp: new Date(),
        country,
        city,
      },
      {
        action: 'signed',
        screenshotHash,
        signatureData,
        method,
      }
    );

    // Generate signing certificate
    const certificate = AuditTrailService.generateSigningCertificate({
      contractId,
      userId,
      email,
      displayName,
      signedAt: new Date(),
      ipAddress,
      country,
      city,
      screenshotHash,
      deviceFingerprint: AuditTrailService.generateDeviceFingerprint({
        ipAddress,
        userAgent,
        platform,
        browser,
        deviceType,
        timestamp: new Date(),
        country,
        city,
      }),
      signatureMethod: method,
    });

    return NextResponse.json(
      {
        signature,
        certificate,
        evidenceToken: AuditTrailService.generateEvidenceToken(
          contractId,
          userId,
          {
            ipAddress,
            userAgent,
            platform,
            browser,
            deviceType,
            timestamp: new Date(),
            country,
            city,
          },
          screenshotHash
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error signing contract:', error);
    return NextResponse.json(
      { error: 'Failed to sign contract' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/:contractId/consent - Record user consent
 */
export async function recordConsent(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params;
    const userId = req.headers.get('x-user-id');
    const email = req.headers.get('x-user-email');
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '0.0.0.0';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { contractType, status, expiresInDays } = body;

    if (!contractType || !status) {
      return NextResponse.json(
        { error: 'Contract type and consent status required' },
        { status: 400 }
      );
    }

    const consent = await ContractService.recordConsent(
      userId,
      email,
      contractId,
      contractType as ContractType,
      status as ConsentStatus,
      { ipAddress, userAgent },
      expiresInDays
    );

    // Log consent event
    await AuditTrailService.logSigningEvent(
      contractId,
      userId,
      {
        ipAddress,
        userAgent,
        platform: 'web',
        browser: 'unknown',
        deviceType: 'desktop',
        timestamp: new Date(),
      },
      {
        action: status === 'ACCEPTED' ? 'accepted' : 'rejected',
      }
    );

    return NextResponse.json(consent, { status: 201 });
  } catch (error) {
    console.error('Error recording consent:', error);
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contracts/:contractId/audit-trail - Get audit trail
 */
export async function getAuditTrail(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params;
    const auditLogs = await ContractService.getContractAuditTrail(contractId);

    return NextResponse.json({
      contractId,
      logs: auditLogs,
      total: auditLogs.length,
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contracts/:contractId/compliance - Check legal compliance
 */
export async function checkCompliance(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params;
    const compliance = await ContractService.verifyLegalCompliance(contractId);

    return NextResponse.json({
      contractId,
      compliance,
      summary: {
        isCompliant: compliance.isValid,
        message: compliance.isValid
          ? 'Contract meets legal compliance standards (ESIGN, UETA)'
          : 'Contract requires additional signatures or consent',
      },
    });
  } catch (error) {
    console.error('Error checking compliance:', error);
    return NextResponse.json(
      { error: 'Failed to check compliance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/:contractId/export - Export contract with audit trail
 */
export async function exportContract(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params;
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const contractData = await ContractService.exportContractWithAuditTrail(contractId);
    const evidencePackage = await AuditTrailService.exportEvidencePackage(contractId);

    await AuditTrailService.logSigningEvent(
      contractId,
      userId,
      {
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || '0.0.0.0',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        platform: 'web',
        browser: 'unknown',
        deviceType: 'desktop',
        timestamp: new Date(),
      },
      { action: 'exported' }
    );

    return NextResponse.json({
      contract: contractData,
      evidence: evidencePackage,
      exportedAt: new Date(),
    });
  } catch (error) {
    console.error('Error exporting contract:', error);
    return NextResponse.json(
      { error: 'Failed to export contract' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/docusign/webhook - DocuSign webhook handler
 */
export async function handleDocuSignWebhook(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify webhook signature (implement in production)
    // await verifyDocuSignWebhookSignature(req);

    await DocuSignService.processWebhookEvent(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing DocuSign webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
