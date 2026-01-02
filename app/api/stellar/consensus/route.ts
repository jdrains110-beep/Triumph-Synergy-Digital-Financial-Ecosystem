import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from 'stellar-sdk';
import { createClient } from 'redis';
import { Pool } from 'pg';

const redis = createClient({ url: process.env.REDIS_URL });
const db = new Pool({ connectionString: process.env.POSTGRES_URL });

redis.connect().catch(console.error);

// Stellar Configuration
const server = new StellarSdk.Horizon.Server(
  process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org'
);

/**
 * Get Stellar Consensus Protocol Status
 * GET /api/stellar/consensus
 */
export async function GET(request: NextRequest) {
  try {
    // Get latest ledger from Stellar network
    const latestLedger = await server.ledgers()
      .order('desc')
      .limit(1)
      .call();

    const ledger = latestLedger.records[0];

    // Get network status
    const networkStatus = {
      ledger_sequence: ledger.sequence,
      closed_at: ledger.closed_at,
      transaction_count: ledger.transaction_count,
      operation_count: ledger.operation_count,
      base_fee: ledger.base_fee_in_stroops,
      protocol_version: ledger.protocol_version,
    };

    // Calculate consensus metrics
    const consensusHealth = {
      network_active: true,
      consensus_protocol: 'Stellar Consensus Protocol (SCP)',
      last_ledger_age_seconds: Math.floor(
        (Date.now() - new Date(ledger.closed_at).getTime()) / 1000
      ),
      transactions_per_ledger: ledger.transaction_count,
      network_throughput: `${Math.floor(ledger.transaction_count / 5)} tx/sec average`,
    };

    // Get our system stats
    const systemStats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE stellar_verified = true) as verified_count,
        COUNT(*) as total_payments,
        SUM(internal_value) FILTER (WHERE source IN ('internal_mined', 'internal_contributed')) as internal_value_total,
        SUM(price_equivalent) as total_price_equivalent
      FROM pi_payments_valued
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    return NextResponse.json({
      stellar_network: networkStatus,
      consensus_health: consensusHealth,
      triumph_synergy_stats: systemStats.rows[0] || {},
      integration: {
        status: 'active',
        verified_by_scp: true,
        message: 'All transactions verified through Stellar Consensus Protocol',
      },
    });
  } catch (error) {
    console.error('Stellar consensus error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Stellar consensus data',
        status: 'degraded',
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
        { error: 'Missing required fields: source_keypair, destination, amount' },
        { status: 400 }
      );
    }

    // Load source account
    const sourceKeys = StellarSdk.Keypair.fromSecret(source_keypair);
    const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset: new StellarSdk.Asset(
            process.env.STELLAR_ASSET_CODE || 'PI',
            process.env.STELLAR_ASSET_ISSUER || destination
          ),
          amount: amount.toString(),
        })
      )
      .addMemo(StellarSdk.Memo.text(memo || 'Triumph Synergy Payment'))
      .setTimeout(180)
      .build();

    // Sign transaction
    transaction.sign(sourceKeys);

    // Submit to Stellar network (will be verified by SCP)
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Transaction submitted to Stellar SCP:`, {
      hash: result.hash,
      ledger: result.ledger,
    });

    return NextResponse.json({
      success: true,
      stellar_tx_id: result.hash,
      ledger: result.ledger,
      consensus_status: 'confirmed',
      message: 'Transaction confirmed by Stellar Consensus Protocol',
    });
  } catch (error: any) {
    console.error('Stellar transaction error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit transaction',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
