/**
 * SAIB Security Webhook: Supabase Event Logger
 * 
 * Receives security telemetry from Cloudflare Workers and logs it to Supabase
 * for real-time monitoring, historical analysis, and alerting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

interface SecurityEvent {
  saibId: string;
  eventType: 'OMNIGUARD_AUDIT' | 'GAS_MARKET_CHECK' | 'CIRCUIT_BREAKER' | 'STANDARD_EXECUTION';
  state: string;
  circuitBreakerTripped: boolean;
  variance?: string;
  gasPrice?: string;
  estimatedCostUsd?: number;
  timestamp: string;
}

/**
 * Verify request authorization using timing-safe token comparison
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
 * POST /api/saib/security-webhook
 * Receives security events from edge workers and logs them to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    // 1. VERIFY AUTHORIZATION
    const authHeader = request.headers.get('Authorization');
    const secretToken = process.env.SAIB_SECRET_TOKEN;

    if (!secretToken) {
      console.error('[WEBHOOK] SAIB_SECRET_TOKEN not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!verifyAuthorization(authHeader, secretToken)) {
      console.error('[WEBHOOK] Unauthorized security event (invalid token)');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. PARSE REQUEST BODY
    let eventData: SecurityEvent;
    try {
      eventData = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('[WEBHOOK] 📨 Received security event:', {
      saibId: eventData.saibId,
      eventType: eventData.eventType,
      circuitBreakerTripped: eventData.circuitBreakerTripped,
    });

    // 3. VALIDATE EVENT STRUCTURE
    if (!eventData.saibId || !eventData.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: saibId, eventType' },
        { status: 400 }
      );
    }

    // 4. LOG TO SUPABASE (with fallback to console)
    try {
      // Attempt to insert into Supabase
      const { error: insertError } = await supabase
        .from('saib_security_logs')
        .insert([
          {
            saib_id: eventData.saibId,
            event_type: eventData.eventType,
            state_engaged: eventData.state,
            circuit_breaker_tripped: eventData.circuitBreakerTripped,
            variance_detected: eventData.variance ? true : false,
            variance_amount: eventData.variance || null,
            gas_price_wei: eventData.gasPrice || null,
            estimated_cost_usd: eventData.estimatedCostUsd || null,
            logged_at: eventData.timestamp || new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error('[WEBHOOK] ⚠️ Supabase insert failed:', insertError);
        // Continue anyway - log to console as fallback
      } else {
        console.log('[WEBHOOK] ✅ Event logged to Supabase');
      }
    } catch (supabaseError) {
      console.error('[WEBHOOK] ⚠️ Supabase connection error:', supabaseError);
      // Continue - we'll fall back to console logging
    }

    // 5. TRIGGER ALERTS IF NEEDED
    if (eventData.circuitBreakerTripped) {
      await handleEmergencyAlert(eventData);
    }

    // 6. RETURN SUCCESS RESPONSE
    return NextResponse.json(
      {
        status: 'logged',
        eventType: eventData.eventType,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[WEBHOOK] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle emergency alerts when circuit breaker is triggered
 * This is where you'd send notifications to admins
 */
async function handleEmergencyAlert(event: SecurityEvent) {
  console.warn(`🚨 EMERGENCY SECURITY ALERT`);
  console.warn(`🚨 SAIB Unit: ${event.saibId}`);
  console.warn(`🚨 Event Type: ${event.eventType}`);
  console.warn(`🚨 State: ${event.state}`);
  console.warn(`🚨 Timestamp: ${event.timestamp}`);

  // TODO: Integrate with notification service
  // Options:
  // - Discord webhook: await sendDiscordAlert(event);
  // - Email: await sendEmailAlert(event);
  // - PagerDuty: await triggerPagerDuty(event);
  // - Slack: await postToSlack(event);

  // Example Discord webhook (uncomment to enable)
  /*
  try {
    const discordWebhook = process.env.DISCORD_SECURITY_WEBHOOK;
    if (discordWebhook) {
      await fetch(discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **SAIB SECURITY ALERT**\nUnit: ${event.saibId}\nType: ${event.eventType}\nState: ${event.state}`,
          username: 'SAIB Optimus Security',
        }),
      });
    }
  } catch (err) {
    console.error('Failed to send Discord alert:', err);
  }
  */
}

/**
 * GET /api/saib/security-webhook
 * Health check and schema information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ready',
      service: 'SAIB Security Webhook Logger',
      version: '4.0.0',
      expectedEventTypes: [
        'OMNIGUARD_AUDIT',
        'GAS_MARKET_CHECK',
        'CIRCUIT_BREAKER',
        'STANDARD_EXECUTION',
      ],
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
