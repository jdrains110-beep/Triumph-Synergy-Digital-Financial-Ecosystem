/**
 * Banking Pi Payments API
 * 
 * Enables banks and financial institutions to:
 * - Initiate Pi payments on behalf of customers
 * - Process Pi settlements
 * - Convert Pi to fiat and vice versa
 * - Integrate with Pi SDK for direct transactions
 * 
 * All endpoints work with Pi Browser and Pi App Studio
 * No exceptions - Pi SDK is always triggered
 */

import { type NextRequest, NextResponse } from "next/server";

// Pi API Configuration
const PI_API_KEY = process.env.PI_API_KEY || "";
const PI_API_SECRET = process.env.PI_API_SECRET || "";
const PI_INTERNAL_API_KEY = process.env.PI_INTERNAL_API_KEY || "";

// Dual Pi Value System
const PI_EXTERNAL_RATE = 314.159; // $314.159 per Pi (external)
const PI_INTERNAL_RATE = 314_159; // $314,159 per Pi (internal/mined)

type PiPaymentType = "customer" | "merchant" | "settlement" | "liquidity" | "conversion";
type PiSource = "mined" | "contributed" | "purchased" | "exchange" | "reward";

interface BankPiPaymentRequest {
  partnerId: string;
  bankAccountId: string;
  piWalletAddress?: string;
  amount: number;
  currency: "PI" | "USD";
  type: PiPaymentType;
  source?: PiSource;
  memo?: string;
  metadata?: Record<string, unknown>;
}

interface BankPiSettlementRequest {
  partnerId: string;
  paymentId: string;
  settlementAccountId: string;
  convertToFiat?: boolean;
  fiatCurrency?: string;
}

interface BankPiConversionRequest {
  partnerId: string;
  accountId: string;
  amount: number;
  fromCurrency: "PI" | "USD";
  toCurrency: "PI" | "USD";
  piSource?: PiSource;
  executionType: "immediate" | "scheduled" | "best-rate";
}

/**
 * Calculate Pi value based on source
 */
function calculatePiValue(amount: number, source: PiSource = "purchased"): {
  nominalAmount: number;
  internalValue: number;
  externalValue: number;
  rate: number;
  source: PiSource;
} {
  const isInternal = source === "mined" || source === "contributed";
  const rate = isInternal ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;

  return {
    nominalAmount: amount,
    internalValue: amount * PI_INTERNAL_RATE,
    externalValue: amount * PI_EXTERNAL_RATE,
    rate,
    source,
  };
}

/**
 * Verify bank partner has Pi payment permissions
 */
async function verifyBankPartner(partnerId: string): Promise<{
  valid: boolean;
  partner?: {
    id: string;
    name: string;
    piPaymentsEnabled: boolean;
    piExchangeEnabled: boolean;
    piSettlementAccount: string | null;
    tier: string;
  };
  error?: string;
}> {
  // In production, this would check against database
  // For now, validate that partner exists and has permissions
  if (!partnerId) {
    return { valid: false, error: "Partner ID required" };
  }

  // Mock validation - in production, fetch from database
  return {
    valid: true,
    partner: {
      id: partnerId,
      name: "Partner Bank",
      piPaymentsEnabled: true,
      piExchangeEnabled: true,
      piSettlementAccount: `pi-settlement-${partnerId}`,
      tier: "premier",
    },
  };
}

/**
 * Create Pi payment through Pi Platform API
 */
async function createPiPayment(request: BankPiPaymentRequest): Promise<{
  success: boolean;
  paymentId?: string;
  piValue?: ReturnType<typeof calculatePiValue>;
  error?: string;
}> {
  try {
    // Verify bank partner
    const partnerCheck = await verifyBankPartner(request.partnerId);
    if (!partnerCheck.valid) {
      return { success: false, error: partnerCheck.error };
    }

    if (!partnerCheck.partner?.piPaymentsEnabled) {
      return { success: false, error: "Pi payments not enabled for this partner" };
    }

    // Calculate Pi value
    const piValue = calculatePiValue(
      request.currency === "PI" ? request.amount : request.amount / PI_EXTERNAL_RATE,
      request.source || "purchased"
    );

    // Create payment record (in production, store in database)
    const paymentId = `bank-pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log("[Banking Pi] Payment created:", {
      paymentId,
      partnerId: request.partnerId,
      amount: request.amount,
      piValue,
    });

    return {
      success: true,
      paymentId,
      piValue,
    };
  } catch (error) {
    console.error("[Banking Pi] Payment creation error:", error);
    return { success: false, error: "Payment creation failed" };
  }
}

/**
 * Process Pi settlement for bank
 */
async function processPiSettlement(request: BankPiSettlementRequest): Promise<{
  success: boolean;
  settlementId?: string;
  fiatAmount?: number;
  error?: string;
}> {
  try {
    // Verify bank partner
    const partnerCheck = await verifyBankPartner(request.partnerId);
    if (!partnerCheck.valid) {
      return { success: false, error: partnerCheck.error };
    }

    const settlementId = `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log("[Banking Pi] Settlement processed:", {
      settlementId,
      paymentId: request.paymentId,
      convertToFiat: request.convertToFiat,
    });

    return {
      success: true,
      settlementId,
      fiatAmount: request.convertToFiat ? PI_EXTERNAL_RATE * 1 : undefined, // Example
    };
  } catch (error) {
    console.error("[Banking Pi] Settlement error:", error);
    return { success: false, error: "Settlement processing failed" };
  }
}

/**
 * Execute Pi/fiat conversion for bank
 */
async function executePiConversion(request: BankPiConversionRequest): Promise<{
  success: boolean;
  conversionId?: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  error?: string;
}> {
  try {
    // Verify bank partner
    const partnerCheck = await verifyBankPartner(request.partnerId);
    if (!partnerCheck.valid) {
      return { 
        success: false, 
        error: partnerCheck.error,
        fromAmount: 0,
        toAmount: 0,
        rate: 0,
      };
    }

    if (!partnerCheck.partner?.piExchangeEnabled) {
      return { 
        success: false, 
        error: "Pi exchange not enabled for this partner",
        fromAmount: 0,
        toAmount: 0,
        rate: 0,
      };
    }

    const rate = request.piSource === "mined" || request.piSource === "contributed"
      ? PI_INTERNAL_RATE
      : PI_EXTERNAL_RATE;

    let toAmount: number;
    if (request.fromCurrency === "PI" && request.toCurrency === "USD") {
      toAmount = request.amount * rate;
    } else {
      toAmount = request.amount / rate;
    }

    const conversionId = `conversion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log("[Banking Pi] Conversion executed:", {
      conversionId,
      from: request.fromCurrency,
      to: request.toCurrency,
      amount: request.amount,
      result: toAmount,
      rate,
    });

    return {
      success: true,
      conversionId,
      fromAmount: request.amount,
      toAmount,
      rate,
    };
  } catch (error) {
    console.error("[Banking Pi] Conversion error:", error);
    return { 
      success: false, 
      error: "Conversion failed",
      fromAmount: 0,
      toAmount: 0,
      rate: 0,
    };
  }
}

// GET: API documentation and status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "rates") {
    return NextResponse.json({
      success: true,
      rates: {
        internal: {
          rate: PI_INTERNAL_RATE,
          description: "Internally mined/contributed Pi",
          usdPerPi: PI_INTERNAL_RATE,
          piPerUsd: 1 / PI_INTERNAL_RATE,
        },
        external: {
          rate: PI_EXTERNAL_RATE,
          description: "External/purchased Pi",
          usdPerPi: PI_EXTERNAL_RATE,
          piPerUsd: 1 / PI_EXTERNAL_RATE,
        },
        multiplier: PI_INTERNAL_RATE / PI_EXTERNAL_RATE,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    api: "Banking Pi Payments API",
    version: "1.0.0",
    description: "Enable banks to integrate Pi payments, settlements, and conversions",
    piSdkIntegration: {
      status: "always-enabled",
      domains: [
        "triumph-synergy.vercel.app",
        "triumphsynergy0576.pinet.com",
        "triumphsynergy7386.pinet.com",
        "triumph-synergy-testnet.vercel.app",
        "triumphsynergy1991.pinet.com",
      ],
      note: "Pi SDK is triggered on ALL domains - no exceptions",
    },
    endpoints: {
      "GET ?action=rates": "Get current Pi/USD exchange rates",
      "POST /create-payment": "Create Pi payment for bank customer",
      "POST /settlement": "Process Pi settlement",
      "POST /conversion": "Convert Pi to/from fiat",
      "POST /approve": "Approve pending Pi payment",
      "POST /complete": "Complete Pi payment with txid",
    },
    dualValueSystem: {
      internalPi: `${PI_INTERNAL_RATE} USD (mined/contributed)`,
      externalPi: `${PI_EXTERNAL_RATE} USD (purchased/exchange)`,
    },
    timestamp: new Date().toISOString(),
  });
}

// POST: Handle Pi payment operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create-payment": {
        const result = await createPiPayment(data as BankPiPaymentRequest);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "settlement": {
        const result = await processPiSettlement(data as BankPiSettlementRequest);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "conversion": {
        const result = await executePiConversion(data as BankPiConversionRequest);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "approve": {
        // Proxy to Pi Platform API for payment approval
        const { paymentId, partnerId } = data;
        
        if (!paymentId || !partnerId) {
          return NextResponse.json(
            { success: false, error: "Payment ID and Partner ID required" },
            { status: 400 }
          );
        }

        const partnerCheck = await verifyBankPartner(partnerId);
        if (!partnerCheck.valid) {
          return NextResponse.json(
            { success: false, error: partnerCheck.error },
            { status: 403 }
          );
        }

        // Call Pi Platform API
        const approveResponse = await fetch(
          `https://api.minepi.com/v2/payments/${paymentId}/approve`,
          {
            method: "POST",
            headers: {
              Authorization: `Key ${PI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (approveResponse.ok) {
          const approveData = await approveResponse.json();
          return NextResponse.json({
            success: true,
            paymentId,
            status: "approved",
            data: approveData,
          });
        }

        return NextResponse.json(
          { success: false, error: "Payment approval failed" },
          { status: approveResponse.status }
        );
      }

      case "complete": {
        // Proxy to Pi Platform API for payment completion
        const { paymentId, txid, partnerId } = data;
        
        if (!paymentId || !txid || !partnerId) {
          return NextResponse.json(
            { success: false, error: "Payment ID, txid, and Partner ID required" },
            { status: 400 }
          );
        }

        const partnerCheck = await verifyBankPartner(partnerId);
        if (!partnerCheck.valid) {
          return NextResponse.json(
            { success: false, error: partnerCheck.error },
            { status: 403 }
          );
        }

        // Call Pi Platform API
        const completeResponse = await fetch(
          `https://api.minepi.com/v2/payments/${paymentId}/complete`,
          {
            method: "POST",
            headers: {
              Authorization: `Key ${PI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ txid }),
          }
        );

        if (completeResponse.ok) {
          const completeData = await completeResponse.json();
          return NextResponse.json({
            success: true,
            paymentId,
            txid,
            status: "completed",
            data: completeData,
          });
        }

        return NextResponse.json(
          { success: false, error: "Payment completion failed" },
          { status: completeResponse.status }
        );
      }

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Unknown action",
            validActions: ["create-payment", "settlement", "conversion", "approve", "complete"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Banking Pi] API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
