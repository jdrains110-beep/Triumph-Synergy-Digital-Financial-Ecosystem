import { type NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createClient } from "redis";
import { Horizon } from "@stellar/stellar-sdk";
import { PiSource } from "@/types/pi";

// Lazy initialization to avoid build-time connection attempts
let redis: ReturnType<typeof createClient> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

function getRedis() {
  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL });
    redis.connect().catch(console.error);
  }
  return redis;
}

function getSql() {
  if (!sql) {
    sql = postgres(process.env.POSTGRES_URL || "");
  }
  return sql;
}

// Stellar Configuration
const server = new Horizon.Server(
  process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org"
);

const INTERNAL_PI_MULTIPLIER = Number.parseFloat(
  process.env.INTERNAL_PI_MULTIPLIER || "1.5"
);
const INTERNAL_PI_MIN_VALUE = Number.parseFloat(
  process.env.INTERNAL_PI_MIN_VALUE || "10.0"
);
const EXTERNAL_PI_MIN_VALUE = Number.parseFloat(
  process.env.EXTERNAL_PI_MIN_VALUE || "1.0"
);

type PiPaymentRequest = {
  user_id: string;
  amount: number;
  source: PiSource;
  memo?: string;
  stellar_tx_id?: string;
  metadata?: Record<string, any>;
};

/**
 * Calculate Pi value based on source (Internal vs External)
 */
function calculatePiValue(
  amount: number,
  source: PiSource
): {
  nominal_amount: number;
  internal_value: number;
  price_equivalent: number;
  source: PiSource;
} {
  let internal_value: number;
  let price_equivalent: number;

  switch (source) {
    case PiSource.INTERNAL_MINED:
    case PiSource.INTERNAL_CONTRIBUTED:
      // Internal Pi (mined/contributed) has higher internal value
      internal_value = amount * INTERNAL_PI_MULTIPLIER;
      price_equivalent = amount * INTERNAL_PI_MIN_VALUE;
      break;

    case PiSource.EXTERNAL_EXCHANGE:
      // External Pi (exchange-bought) has standard value
      internal_value = amount;
      price_equivalent = amount * EXTERNAL_PI_MIN_VALUE;
      break;

    default:
      internal_value = amount;
      price_equivalent = amount * EXTERNAL_PI_MIN_VALUE;
  }

  return {
    nominal_amount: amount,
    internal_value,
    price_equivalent,
    source,
  };
}

/**
 * Verify transaction on Stellar Network using Stellar Consensus Protocol
 */
async function verifyStellarTransaction(
  stellar_tx_id: string,
  _expected_amount: number
): Promise<boolean> {
  try {
    const transaction = await server
      .transactions()
      .transaction(stellar_tx_id)
      .call();

    // Verify transaction was successful
    if (!transaction.successful) {
      return false;
    }

    // Stellar Consensus Protocol verification
    // Transaction is included in a closed ledger
    console.log("✅ Stellar SCP Verification:", {
      tx_hash: stellar_tx_id,
      ledger: transaction.ledger,
      successful: transaction.successful,
    });

    return true;
  } catch (error) {
    console.error("❌ Stellar verification failed:", error);
    return false;
  }
}

/**
 * Create Pi Payment with Value Differentiation
 * POST /api/pi/value
 */
export async function POST(request: NextRequest) {
  try {
    const body: PiPaymentRequest = await request.json();
    const { user_id, amount, source, memo, stellar_tx_id, metadata } = body;

    // Validate input
    if (!user_id || !amount || amount <= 0 || !source) {
      return NextResponse.json(
        { error: "Invalid payment data. Required: user_id, amount, source" },
        { status: 400 }
      );
    }

    // Validate Pi source
    if (!Object.values(PiSource).includes(source)) {
      return NextResponse.json(
        {
          error: `Invalid source. Must be one of: ${Object.values(PiSource).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Calculate value based on source
    const piValue = calculatePiValue(amount, source);

    // Verify on Stellar network if transaction ID provided
    let stellar_verified = false;
    if (stellar_tx_id) {
      stellar_verified = await verifyStellarTransaction(stellar_tx_id, amount);

      if (!stellar_verified) {
        return NextResponse.json(
          { error: "Stellar transaction verification failed" },
          { status: 400 }
        );
      }
    }

    // Generate payment ID
    const payment_id = `pi_val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store in database with value differentiation
    const sqlClient = getSql();
    const redisClient = getRedis();

    await sqlClient`
      INSERT INTO pi_payments_valued (
        payment_id, user_id, 
        nominal_amount, internal_value, price_equivalent, 
        source, status, stellar_tx_id, stellar_verified, 
        metadata, created_at
      ) VALUES (
        ${payment_id}, ${user_id}, 
        ${piValue.nominal_amount}, ${piValue.internal_value}, ${piValue.price_equivalent}, 
        ${piValue.source}, 'pending', ${stellar_tx_id || null}, ${stellar_verified}, 
        ${JSON.stringify({ memo, ...metadata })}, NOW()
      )
    `;

    // Queue for processing
    await redisClient.lPush(
      "payment_value_queue",
      JSON.stringify({
        payment_id,
        user_id,
        ...piValue,
        stellar_tx_id,
        stellar_verified,
      })
    );

    console.log("✅ Pi payment queued with value differentiation:", {
      payment_id,
      source,
      nominal: piValue.nominal_amount,
      internal_value: piValue.internal_value,
      price: piValue.price_equivalent,
    });

    return NextResponse.json({
      success: true,
      payment_id,
      value_breakdown: {
        nominal_amount: piValue.nominal_amount,
        internal_value: piValue.internal_value,
        price_equivalent: piValue.price_equivalent,
        source: piValue.source,
        multiplier:
          source === PiSource.EXTERNAL_EXCHANGE ? 1.0 : INTERNAL_PI_MULTIPLIER,
      },
      stellar: {
        verified: stellar_verified,
        tx_id: stellar_tx_id || null,
      },
      status: "pending",
      message: `Payment queued. ${source === PiSource.EXTERNAL_EXCHANGE ? "External exchange Pi" : "Internal contributed Pi with enhanced value"}`,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

/**
 * Get Pi Value Information
 * GET /api/pi/value?amount=10&source=internal_mined
 */
export function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = Number.parseFloat(searchParams.get("amount") || "0");
    const source =
      (searchParams.get("source") as PiSource) || "external_exchange";

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const piValue = calculatePiValue(amount, source);

    return NextResponse.json({
      calculation: piValue,
      explanation: {
        internal_pi: `Mined/contributed Pi has ${INTERNAL_PI_MULTIPLIER}x multiplier for internal value`,
        external_pi: "Exchange-bought Pi maintains standard 1:1 value",
        sustainability:
          "100-year model: Internal Pi sustains the ecosystem through higher utility value",
      },
      current_rates: {
        internal_multiplier: INTERNAL_PI_MULTIPLIER,
        internal_min_value: INTERNAL_PI_MIN_VALUE,
        external_min_value: EXTERNAL_PI_MIN_VALUE,
      },
    });
  } catch (error) {
    console.error("Value calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate value" },
      { status: 500 }
    );
  }
}
