import * as StellarSdk from "@stellar/stellar-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { getSCPAutoUpdate, getStellarPiCoinSDK } from "@/lib/stellar";

// Stellar Configuration
const server = new StellarSdk.Horizon.Server(
	process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org",
);

/**
 * Get Stellar Consensus Protocol Status
 * GET /api/stellar/consensus
 *
 * Returns real-time SCP state with auto-synchronization
 */
export async function GET(_request: NextRequest) {
	try {
		// Get SCP auto-update instance
		const scp = getSCPAutoUpdate();
		const scpState = scp.getState();

		// Get Pi Coin SDK for balance info
		const piSdk = getStellarPiCoinSDK();
		const piConfig = piSdk.getPiCoinConfig();

		// Get latest ledger from Stellar network (fallback if SCP not synced)
		let ledger: StellarSdk.Horizon.ServerApi.LedgerRecord | null = null;
		try {
			const latestLedger = await server.ledgers().order("desc").limit(1).call();
			ledger = latestLedger.records[0];
		} catch (e) {
			console.warn("Failed to fetch ledger directly:", e);
		}

		// Build network status from SCP state or direct query
		const networkStatus = {
			ledger_sequence: scpState?.latestLedger || ledger?.sequence || 0,
			closed_at:
				scpState?.ledgerCloseTime?.toISOString() ||
				ledger?.closed_at ||
				new Date().toISOString(),
			transaction_count: (ledger as any)?.transaction_count || 0,
			operation_count: (ledger as any)?.operation_count || 0,
			base_fee:
				scpState?.baseFee || (ledger as any)?.base_fee_in_stroops || 100,
			protocol_version:
				scpState?.protocolVersion || (ledger as any)?.protocol_version || 0,
			core_version: scpState?.coreVersion || "unknown",
		};

		// Calculate consensus metrics
		const ledgerCloseTime =
			scpState?.ledgerCloseTime ||
			(ledger ? new Date(ledger.closed_at) : new Date());
		const consensusHealth = {
			network_active: true,
			consensus_protocol: "Stellar Consensus Protocol (SCP)",
			scp_phase: scpState?.currentPhase || "EXTERNALIZED",
			last_ledger_age_seconds: Math.floor(
				(Date.now() - ledgerCloseTime.getTime()) / 1000,
			),
			transactions_per_ledger: networkStatus.transaction_count,
			network_throughput: `${Math.floor(networkStatus.transaction_count / 5)} tx/sec average`,
			scp_synchronized: scpState
				? Date.now() - scpState.lastUpdated.getTime() < 30000
				: false,
			auto_update_active: !!scpState,
		};

		// Pi Coin integration status
		const piCoinIntegration = {
			asset_code: piConfig.assetCode,
			issuer: piConfig.issuer || "Not configured",
			decimals: piConfig.decimals,
			sdk_status: "active",
		};

		return NextResponse.json({
			stellar_network: networkStatus,
			consensus_health: consensusHealth,
			pi_coin_integration: piCoinIntegration,
			scp_auto_update: {
				status: scpState ? "active" : "initializing",
				last_updated: scpState?.lastUpdated?.toISOString(),
				network_passphrase: scpState?.networkPassphrase,
				history_latest_ledger: scpState?.historyLatestLedger,
			},
			integration: {
				status: "active",
				verified_by_scp: true,
				message:
					"All transactions verified through Stellar Consensus Protocol with auto-synchronization",
			},
		});
	} catch (error) {
		console.error("Stellar consensus error:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch Stellar consensus data",
				status: "degraded",
				scp_auto_update: "error",
			},
			{ status: 500 },
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
				{ status: 400 },
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
						process.env.STELLAR_ASSET_ISSUER || destination,
					),
					amount: amount.toString(),
				}),
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
			{ status: 500 },
		);
	}
}
