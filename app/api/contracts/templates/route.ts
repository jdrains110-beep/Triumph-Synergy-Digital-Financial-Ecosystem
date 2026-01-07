/**
 * Contract Templates & Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContractService } from '@/lib/contracts/service';
import { db } from '@/lib/db';
import { contractTemplates } from '@/lib/contracts/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/contracts/templates - List contract templates
 */
export async function getTemplates(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    const category = req.nextUrl.searchParams.get('category');

    let query = db.select().from(contractTemplates).where(eq(contractTemplates.isActive, true));

    if (type) {
      // Need to add additional filtering logic
    }

    const templates = await query;

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/from-template - Create contract from template
 */
export async function createFromTemplate(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { templateId, variables } = body;

    if (!templateId || !variables) {
      return NextResponse.json(
        { error: 'Template ID and variables required' },
        { status: 400 }
      );
    }

    const contract = await ContractService.createContractFromTemplate(
      templateId,
      variables,
      userId
    );

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Error creating contract from template:', error);
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/send-for-signature - Send contract for signature via DocuSign
 */
export async function sendForSignature(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { contractId, recipients, subject, message } = body;

    if (!contractId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Contract ID and recipients required' },
        { status: 400 }
      );
    }

    // Get contract
    const contract = await ContractService.getContractById(contractId);
    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Get DocuSign service (requires integration setup)
    const docusignService = await DocuSignService.getInstance(userId);

    const envelopeResponse = await docusignService.sendForSignature(
      {
        contractId,
        recipients: recipients.map((r: any, idx: number) => ({
          email: r.email,
          name: r.name,
          recipientId: (idx + 1).toString(),
        })),
        subject: subject || `Please sign: ${contract.title}`,
        message: message || `You have been asked to review and sign this contract.`,
      },
      contract.content
    );

    return NextResponse.json(
      {
        envelopeId: envelopeResponse.envelopeId,
        status: envelopeResponse.status,
        uri: envelopeResponse.uri,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending for signature:', error);
    return NextResponse.json(
      { error: 'Failed to send for signature' },
      { status: 500 }
    );
  }
}
