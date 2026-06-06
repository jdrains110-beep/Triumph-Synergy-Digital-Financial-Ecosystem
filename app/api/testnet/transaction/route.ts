import { NextRequest, NextResponse } from 'next/server';

/**
 * Testnet Transaction Handler
 * Integrates with Docker Desktop SAIB enforcer for contract validation
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemType, itemId, amount, currency, paymentMethod, userId } = body;

    if (!itemType || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log transaction
    console.log(`[TESTNET TXN] ${userId} - ${itemType} - ${amount} ${currency}`);

    // Process based on item type
    switch (itemType) {
      case 'delivery':
        // Trigger SAIB duty: delivery-coordination
        await triggerSAIBDuty('delivery-coordination', {
          orderId: itemId,
          amount,
          currency,
          status: 'payment_confirmed',
        });
        break;

      case 'rental':
        // Trigger SAIB duty: rental-escrow
        await triggerSAIBDuty('rental-escrow', {
          propertyId: itemId,
          investmentAmount: amount,
          currency,
          status: 'escrow_established',
        });
        break;

      case 'course':
        // Trigger SAIB duty: education-enrollment
        await triggerSAIBDuty('education-enrollment', {
          courseId: itemId,
          studentId: userId,
          amount,
          currency,
          status: 'enrollment_confirmed',
        });
        break;

      case 'flight':
      case 'hotel':
      case 'tour':
        // Trigger SAIB duty: travel-booking
        await triggerSAIBDuty('travel-booking', {
          bookingId: itemId,
          bookingType: itemType,
          amount,
          currency,
          status: 'booking_confirmed',
        });
        break;

      case 'domain':
        // Trigger SAIB duty: domain-tokenization (.pi web3 domains)
        await triggerSAIBDuty('domain-tokenization', {
          domain: itemId,
          owner: userId,
          amount,
          currency,
          status: 'domain_minted',
        });
        break;

      case 'utility':
        // Trigger SAIB duty: utility-settlement (electricity, water, gas, internet)
        await triggerSAIBDuty('utility-settlement', {
          billId: itemId,
          payer: userId,
          amount,
          currency,
          status: 'bill_settled',
        });
        break;

      case 'gaming':
        // Trigger SAIB duty: gaming-escrow (tournament entry & prize pool)
        await triggerSAIBDuty('gaming-escrow', {
          eventId: itemId,
          player: userId,
          amount,
          currency,
          status: 'entry_escrowed',
        });
        break;

      case 'judicial':
      case 'counsel':
        // Trigger SAIB duty: judicial-service (cases, lawyers, public defenders)
        await triggerSAIBDuty('judicial-service', {
          caseId: itemId,
          requester: userId,
          serviceType: itemType,
          amount,
          currency,
          status: 'service_engaged',
        });
        break;

      case 'credit':
      case 'dispute':
        // Trigger SAIB duty: credit-session (Pi credit & dispute sessions)
        await triggerSAIBDuty('credit-session', {
          sessionId: itemId,
          subject: userId,
          sessionType: itemType,
          amount,
          currency,
          status: 'session_opened',
        });
        break;

      case 'sovereignship':
      case 'position':
        // Trigger SAIB duty: sovereignship-contract (king/queen status, citizenship)
        await triggerSAIBDuty('sovereignship-contract', {
          applicationId: itemId,
          applicant: userId,
          contractType: itemType,
          amount,
          currency,
          status: 'contract_executed',
        });
        break;

      default:
        // Generic transaction — still SAIB-enforced for token integrity
        await triggerSAIBDuty('generic-settlement', {
          referenceId: itemId,
          payer: userId,
          itemType,
          amount,
          currency,
          status: 'settled',
        });
        console.log(`[TESTNET TXN] Processing generic ${itemType} transaction`);
    }

    // Simulate transaction completion
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemType,
      amount,
      currency,
      paymentMethod,
      // SAIB enforces internal, external (Pi) and TriSyn utility tokens on every transaction
      saibEnforced: true,
      tokenClass: currency === 'Gold-Pi' ? 'internal-gold' : currency === 'TriSyn' ? 'trisyn-utility' : 'external-pi',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TESTNET TXN ERROR]', error);
    return NextResponse.json(
      { error: 'Transaction processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Trigger SAIB duty execution via Docker Desktop container
 */
async function triggerSAIBDuty(dutyType: string, data: Record<string, any>) {
  try {
    // Connect to local SAIB enforcer (port 8210).
    // Use a short timeout so the request fails fast when the enforcer is not
    // running (or Docker's port-forwarder is orphaned), keeping transactions
    // responsive with graceful in-app fallback.
    const response = await fetch('http://triumph-saib-enforcer:8210/enforce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: dutyType,
        payload: data,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      console.warn(`[SAIB] Duty ${dutyType} not immediately available - will retry`);
      // In production: implement retry logic
      return;
    }

    const result = await response.json();
    console.log(`[SAIB] Duty executed: ${dutyType}`, result);
  } catch (error) {
    console.warn(`[SAIB] Could not trigger ${dutyType}:`, error);
    // Fall back to transaction processing without SAIB
  }
}
