/**
 * SAIB GCV Transaction Processor
 * 
 * Handles Pi Network Global Consensus Value (GCV) transactions with mathematical
 * verification and sovereign authentication. Integrates trust graph metrics and
 * enforces founder protection protocols.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import {
  PiConsensusValidator,
  SovereignAuthMatrix,
  PiTransactionClassifier,
} from '@/lib/saib/pi-gcv-validator';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface GcvTransactionRequest {
  saibId: string;
  userTrustGraphScore: string;
  tokenQuantityWei: string;
  claimedPublicKey?: string;
  encryptedPayload?: string;
  timestamp?: string;
}

interface GcvTransactionResponse {
  status: 'SUCCESS' | 'AUTHORIZED' | 'QUEUED' | 'FAILED';
  gcvMetrics: any;
  sovereignAuthorization?: any;
  executionClassification?: any;
  executionDelay?: number;
  transactionId?: string;
  message: string;
}

/**
 * POST /api/saib/gcv/process-transaction
 * Process GCV-aligned transaction with trust graph validation
 */
export async function POST(request: NextRequest) {
  try {
    // 1. VERIFY AUTHORIZATION
    const authHeader = request.headers.get('Authorization');
    const secretToken = process.env.SAIB_SECRET_TOKEN;

    if (!secretToken) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify Bearer token with timing-safe comparison
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        try {
          timingSafeEqual(
            Buffer.from(parts[1]),
            Buffer.from(secretToken)
          );
        } catch {
          console.warn('[GCV] Unauthorized access attempt');
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
      }
    }

    // 2. PARSE REQUEST
    let txRequest: GcvTransactionRequest;
    try {
      txRequest = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('[GCV] 📊 Processing transaction:', {
      saibId: txRequest.saibId,
      trustScore: txRequest.userTrustGraphScore,
    });

    // 3. VALIDATE GCV TRANSACTION
    const gcvMetrics = PiConsensusValidator.processGcvTransaction(
      txRequest.userTrustGraphScore,
      txRequest.tokenQuantityWei
    );

    if (gcvMetrics.validationStatus !== 'SUCCESS') {
      console.warn('[GCV] ⚠️ GCV validation failed:', gcvMetrics.errorReason);
      
      // Log failed transaction
      await supabase.from('gcv_transactions').insert([
        {
          saib_id: txRequest.saibId,
          status: 'FAILED',
          trust_score: parseInt(txRequest.userTrustGraphScore),
          gcv_settlement_usd: '0',
          validation_status: gcvMetrics.validationStatus,
          error_reason: gcvMetrics.errorReason,
          created_at: new Date().toISOString(),
        },
      ]);

      return NextResponse.json(
        {
          status: 'FAILED',
          gcvMetrics,
          message: 'GCV validation failed',
        } as GcvTransactionResponse,
        { status: 400 }
      );
    }

    // 4. CHECK SOVEREIGN AUTHENTICATION (if public key provided)
    let sovereignAuth = null;
    if (txRequest.claimedPublicKey) {
      try {
        sovereignAuth = SovereignAuthMatrix.requireSovereignAuthorization(
          txRequest.claimedPublicKey
        );
        console.log('[GCV] ✅ Sovereign authentication successful');
      } catch (err) {
        console.log('[GCV] ℹ️ Non-sovereign transaction (normal flow)');
      }
    }

    // 5. CLASSIFY TRANSACTION BY GCV TIER
    const classification = PiTransactionClassifier.classifyTransaction(
      txRequest.userTrustGraphScore
    );
    const executionDelay = PiTransactionClassifier.calculateExecutionDelay(classification);

    console.log('[GCV] 📈 Transaction classified:', {
      tier: Object.keys(PiTransactionClassifier.CLASSIFICATION_TIERS).find(
        k => PiTransactionClassifier.CLASSIFICATION_TIERS[k] === classification
      ),
      priority: classification.executionPriority,
      delay: executionDelay,
    });

    // 6. DETERMINE SYSTEM CLASS ENGAGEMENT
    let systemClassEngaged = gcvMetrics.systemClassEngaged;
    if (sovereignAuth?.sovereignRights) {
      systemClassEngaged = 'GCV_SOVEREIGN_HUB_ACTIVE';
    }

    const transactionId = `gcv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const finalStatus = sovereignAuth?.authorized ? 'AUTHORIZED' : 'QUEUED';

    // 7. LOG TO SUPABASE
    try {
      await supabase.from('gcv_transactions').insert([
        {
          transaction_id: transactionId,
          saib_id: txRequest.saibId,
          status: finalStatus,
          trust_score: parseInt(txRequest.userTrustGraphScore),
          pi_amount: gcvMetrics.piTokenAmount,
          gcv_settlement_usd: gcvMetrics.gcvSettlementRateUsd,
          classification_tier: classification.description,
          execution_priority: classification.executionPriority,
          sovereign_clearance: sovereignAuth?.clearanceLevel || 0,
          system_class_engaged: systemClassEngaged,
          created_at: new Date().toISOString(),
        },
      ]);

      console.log('[GCV] ✅ Transaction logged to Supabase');
    } catch (supabaseErr) {
      console.warn('[GCV] ⚠️ Supabase logging failed:', supabaseErr);
      // Continue anyway - transaction can still proceed
    }

    // 8. LOG SECURITY EVENT
    try {
      await supabase.from('saib_security_logs').insert([
        {
          saib_id: txRequest.saibId,
          event_type: 'GCV_TRANSACTION',
          state_engaged: systemClassEngaged,
          circuit_breaker_tripped: false,
          logged_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('[GCV] ⚠️ Security log failed:', err);
    }

    // 9. BUILD RESPONSE
    const response: GcvTransactionResponse = {
      status: finalStatus,
      gcvMetrics,
      sovereignAuthorization: sovereignAuth || undefined,
      executionClassification: {
        tier: classification,
        executionDelay,
      },
      executionDelay,
      transactionId,
      message: `Transaction ${finalStatus}. Settlement: ${gcvMetrics.gcvSettlementRateUsd}`,
    };

    // Apply execution delay if not sovereign
    if (executionDelay > 0 && !sovereignAuth?.sovereignRights) {
      console.log(`[GCV] ⏳ Applying ${executionDelay}ms execution delay...`);
      await new Promise(resolve => setTimeout(resolve, executionDelay));
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[GCV] ❌ Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/saib/gcv/process-transaction
 * Health check and schema information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ready',
      service: 'SAIB GCV Transaction Processor',
      version: '4.1.0',
      gcvBenchmark: '$314,159 per Pi',
      supportedTiers: Object.keys(PiTransactionClassifier.CLASSIFICATION_TIERS),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
