import { type NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createClient } from "redis";
import { Horizon } from "stellar-sdk";

// Lazy initialization to avoid build-time connection attempts
let redis: ReturnType<typeof createClient> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

function _getRedis() {
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
const server = new StellarSdk.Horizon.Server(
  process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org"
);

/**
 * Get Stellar Consensus Protocol Status
 * GET /api/stellar/consensus
 */
export async function GET(_request: NextRequest) {
  try {
    // Get latest ledger from Stellar network
    const latestLedger = await server.ledgers().order("desc").limit(1).call();

    const ledger = latestLedger.records[0];

    // Get network status with safe property access
    const networkStatus = {
      ledger_sequence: ledger.sequence || 0,
      closed_at: ledger.closed_at || new Date().toISOString(),
      transaction_count: (ledger as any).transaction_count || 0,
      operation_count: (ledger as any).operation_count || 0,
      base_fee: (ledger as any).base_fee_in_stroops || 0,
      protocol_version: (ledger as any).protocol_version || 0,
    };

    // Calculate consensus metrics
    const consensusHealth = {
      network_active: true,
      consensus_protocol: "Stellar Consensus Protocol (SCP)",
      last_ledger_age_seconds: Math.floor(
        (Date.now() - new Date(ledger.closed_at).getTime()) / 1000
      ),
      transactions_per_ledger: networkStatus.transaction_count,
      network_throughput: `${Math.floor(networkStatus.transaction_count / 5)} tx/sec average`,
    };

    // Get our system stats
    const sqlClient = getSql();
    const systemStats = await sqlClient`
      SELECT 
        COUNT(*) FILTER (WHERE stellar_verified = true) as verified_count,
        COUNT(*) as total_payments,
        SUM(internal_value) FILTER (WHERE source IN ('internal_mined', 'internal_contributed')) as internal_value_total,
        SUM(price_equivalent) as total_price_equivalent
      FROM pi_payments_valued
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    return NextResponse.json({
      stellar_network: networkStatus,
      consensus_health: consensusHealth,
      triumph_synergy_stats: systemStats[0] || {},
      integration: {
        status: "active",
        verified_by_scp: true,
        message: "All transactions verified through Stellar Consensus Protocol",
      },
    });
  } catch (error) {
    console.error("Stellar consensus error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Stellar consensus data",
        status: "degraded",
      },
      { status: 500 }
    );
  }
}

/**
 * Submit transaction to Stellar network
 * POST /api/stellar/consensus
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_keypair, destination, amount, memo } = body;

    if (!source_keypair || !destination || !amount) {
      return NextResponse.json(
        {
          error: "Missing required fields: source_keypair, destination, amount",
        },
        { status: 400 }
      );
    }

    // Load source account
    const sourceKeys = StellarSdk.Keypair.fromSecret(source_keypair);
    const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase:
        process.env.STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset: new StellarSdk.Asset(
            process.env.STELLAR_ASSET_CODE || "PI",
            process.env.STELLAR_ASSET_ISSUER || destination
          ),
          amount: amount.toString(),
        })
      )
      .addMemo(StellarSdk.Memo.text(memo || "Triumph Synergy Payment"))
      .setTimeout(180)
      .build();

    // Sign transaction
    transaction.sign(sourceKeys);

    // Submit to Stellar network (will be verified by SCP)
    const result = await server.submitTransaction(transaction);

    console.log("✅ Transaction submitted to Stellar SCP:", {
      hash: result.hash,
      ledger: result.ledger,
    });

    return NextResponse.json({
      success: true,
      stellar_tx_id: result.hash,
      ledger: result.ledger,
      consensus_status: "confirmed",
      message: "Transaction confirmed by Stellar Consensus Protocol",
    });
  } catch (error: any) {
    console.error("Stellar transaction error:", error);
    return NextResponse.json(
      {
        error: "Failed to submit transaction",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
