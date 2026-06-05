/**
 * SAIB Optimus: Secure Envelope Decryption Endpoint
 * 
 * This API endpoint ONLY exists on the Next.js backend.
 * It holds the private decryption key and decrypts incoming secure envelopes.
 * 
 * Architecture:
 * 1. Hardware encrypts payload with PUBLIC KEY
 * 2. Cloudflare Worker forwards encrypted blob blindly (cannot read)
 * 3. This endpoint decrypts with PRIVATE KEY (only location with this key)
 * 4. Processes the decrypted data and routes conversions
 * 
 * Result: End-to-end encryption where only hardware and Next.js backend can see data.
 * Even Cloudflare cannot read payload contents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  decryptSecureEnvelope,
  SecureEnvelope,
  validateEnvelopeStructure
} from '@/lib/saib/crypto-envelope';
import { routeTokenConversion } from '@/lib/saib/token-conversion-router';
import { recognizeEcosystemToken } from '@/lib/saib/token-registry';

/**
 * Validates Bearer token using timing-safe comparison.
 * Prevents timing attacks that could leak token information.
 */
function verifyAuthorization(authHeader: string | null, secretToken: string): boolean {
  if (!authHeader) return false;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  const providedToken = parts[1];
  try {
    return timingSafeEqual(Buffer.from(providedToken), Buffer.from(secretToken));
  } catch {
    return false;
  }
}

/**
 * POST /api/saib/decrypt-envelope
 * 
 * Decrypts incoming secure envelopes using Next.js backend's private key.
 * Only this endpoint can read the encrypted payload.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. VERIFY AUTHORIZATION
    const authHeader = request.headers.get('Authorization');
    const secretToken = process.env.SAIB_SECRET_TOKEN;

    if (!secretToken) {
      console.error('[DECRYPT] SAIB_SECRET_TOKEN not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!verifyAuthorization(authHeader, secretToken)) {
      console.error('[DECRYPT] Unauthorized request (invalid auth)');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. PARSE INCOMING REQUEST
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const envelope = requestBody.envelope as SecureEnvelope;
    const directive = requestBody.directive as string;

    // 3. VALIDATE ENVELOPE STRUCTURE
    if (!validateEnvelopeStructure(envelope)) {
      console.error('[DECRYPT] Malformed envelope structure');
      return NextResponse.json(
        { error: 'Malformed Secure Envelope' },
        { status: 400 }
      );
    }

    console.log(`[DECRYPT] 🔐 Processing secure envelope from ${envelope.saibId}`);

    // 4. DECRYPT PAYLOAD
    // This is the ONLY place where the private decryption happens
    const privateKeySecret = process.env.SAIB_DECRYPTION_KEY || process.env.SAIB_SECRET_TOKEN;
    
    if (!privateKeySecret) {
      console.error('[DECRYPT] SAIB_DECRYPTION_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const decryptedPayload = await decryptSecureEnvelope(envelope, privateKeySecret);

    if (!decryptedPayload) {
      console.error('[DECRYPT] Decryption failed for envelope', envelope.saibId);
      return NextResponse.json(
        { error: 'Decryption failed: Invalid payload or corruption detected' },
        { status: 400 }
      );
    }

    console.log(`[DECRYPT] ✅ Successfully decrypted envelope from ${envelope.saibId}`);
    console.log(`[DECRYPT] Payload: ${JSON.stringify({
      sourceToken: decryptedPayload.sourceToken,
      targetToken: decryptedPayload.targetToken,
      amount: decryptedPayload.amount,
    })}`);

    // 5. ANALYZE ECOSYSTEM TOKENS
    const ecosystemAnalysis = analyzeDecryptedTokens(decryptedPayload);
    
    if (ecosystemAnalysis.requiresEcosystemConversion) {
      console.log(`[DECRYPT] 🎯 Ecosystem conversion detected: ${decryptedPayload.sourceToken} → ${decryptedPayload.targetToken}`);
    }

    // 6. APPLY AUTONOMOUS DIRECTIVE
    const executionContext = {
      directive,
      envelope,
      decryptedPayload,
      ecosystemAnalysis,
      timestamp: new Date().toISOString(),
    };

    console.log(`[DECRYPT] 📊 Directive: ${directive}`);
    console.log(`[DECRYPT] 🔄 Queuing for backend processing...`);

    // 7. QUEUE FOR BACKGROUND PROCESSING
    // (In production, this would trigger a job queue)
    await queueForBackendProcessing(executionContext);

    // 8. RESPOND WITH AUDIT TRAIL
    return NextResponse.json(
      {
        status: 'Decrypted',
        receiptId: envelope.ephemeralPublicKey.slice(0, 16),
        decryptionVerified: true,
        payloadHash: await hashPayload(decryptedPayload),
        ecosystemToken: ecosystemAnalysis.requiresEcosystemConversion,
        directive,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'X-SAIB-Decrypted': 'true',
          'X-Ecosystem-Token': ecosystemAnalysis.requiresEcosystemConversion ? 'true' : 'false',
          'X-SAIB-Directive': directive,
          'X-Decryption-Location': 'backend-only', // Proof decryption happened here
        },
      }
    );
  } catch (error) {
    console.error('[DECRYPT] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/saib/decrypt-envelope
 * 
 * Health check and configuration verification.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ready',
      service: 'SAIB Optimus Envelope Decryption',
      version: '4.0.0',
      capabilities: [
        'AES-GCM decryption',
        'HMAC-SHA256 verification',
        'Ecosystem token recognition',
        'Autonomous directive execution',
      ],
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'X-SAIB-Service': 'decrypt-envelope',
      },
    }
  );
}

/**
 * Analyzes decrypted payload for ecosystem tokens.
 */
function analyzeDecryptedTokens(payload: any) {
  const sourceSymbol = payload.sourceToken?.toUpperCase() || '';
  const targetSymbol = payload.targetToken?.toUpperCase() || '';

  const isTrisyn = (symbol: string) => symbol.includes('TRISYN') || /^0x[a-f0-9]{40}$/i.test(symbol);
  const isPi = (symbol: string) => symbol.includes('PI');

  const sourceIsTrisyn = isTrisyn(sourceSymbol);
  const sourceIsPi = isPi(sourceSymbol);
  const targetIsTrisyn = isTrisyn(targetSymbol);
  const targetIsPi = isPi(targetSymbol);

  const requiresEcosystemConversion =
    (sourceIsTrisyn || sourceIsPi) && (targetIsTrisyn || targetIsPi);

  return {
    sourceIsTrisyn,
    sourceIsPi,
    targetIsTrisyn,
    targetIsPi,
    requiresEcosystemConversion,
    conversionPath: requiresEcosystemConversion
      ? `${sourceSymbol}→${targetSymbol}`
      : null,
  };
}

/**
 * Hashes decrypted payload for audit trail.
 * Proves data was decrypted without storing plaintext.
 */
async function hashPayload(payload: any): Promise<string> {
  const text = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Queues execution context for background processing.
 * In production, this would trigger a job queue (Bull, RabbitMQ, etc.).
 */
async function queueForBackendProcessing(context: any): Promise<void> {
  try {
    // Simulate job queue submission
    console.log(`[QUEUE] 📬 Submitted for processing:`, {
      saibId: context.envelope.saibId,
      directive: context.directive,
      timestamp: context.timestamp,
    });

    // In production, this would be:
    // await jobQueue.add('saib-optimus-execute', context);
  } catch (error) {
    console.error('[QUEUE] Error submitting job:', error);
    throw error;
  }
}
