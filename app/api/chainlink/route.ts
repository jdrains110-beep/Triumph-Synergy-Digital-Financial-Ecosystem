/**
 * CHAINLINK ORACLE API ENDPOINT
 *
 * Provides access to Chainlink-powered features:
 * - Real-time price feeds with error handling
 * - Verifiable randomness (VRF v2.5)
 * - Automation status (Keepers v2.1+)
 * - Health checks and monitoring
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	CHAINLINK_AUTOMATIONS,
	CHAINLINK_TRUST_METRICS,
	checkChainlinkHealth,
	getChainlinkPrice,
	getChainlinkPrices,
	getVRFRandomness,
	requestChainlinkVRF,
} from "@/lib/integrations/chainlink-oracle";

// ============================================================================
// GET: Chainlink Price Feed
// ============================================================================

/**
 * GET /api/chainlink/prices?pair=PI/USD
 * Get current price for any asset pair from Chainlink
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const pair = searchParams.get("pair");
		const action = searchParams.get("action");

		// Single price feed
		if (pair && action === "price") {
			const validPairs = [
				"PI/USD",
				"XLM/USD",
				"BTC/USD",
				"ETH/USD",
				"USDC/USD",
			];
			if (!validPairs.includes(pair as any)) {
				return NextResponse.json(
					{ error: `Invalid pair. Valid pairs: ${validPairs.join(", ")}` },
					{ status: 400 },
				);
			}

			const price = await getChainlinkPrice(
				pair as "PI/USD" | "XLM/USD" | "BTC/USD" | "ETH/USD" | "USDC/USD",
			);
			return NextResponse.json({ success: true, data: price });
		}

		// Multiple prices
		if (action === "prices") {
			const pairs = (searchParams.get("pairs") || "PI/USD,XLM/USD").split(",");
			const prices = await getChainlinkPrices(
				pairs as Array<
					"PI/USD" | "XLM/USD" | "BTC/USD" | "ETH/USD" | "USDC/USD"
				>,
			);
			return NextResponse.json({ success: true, data: prices });
		}

		// Health status
		if (action === "health") {
			const health = await checkChainlinkHealth();
			return NextResponse.json({ success: true, data: health });
		}

		// List all automations
		if (action === "automations") {
			return NextResponse.json({
				success: true,
				data: {
					automations: CHAINLINK_AUTOMATIONS,
					activeCount: CHAINLINK_AUTOMATIONS.filter((a) => a.isActive).length,
					totalCount: CHAINLINK_AUTOMATIONS.length,
				},
			});
		}

		// Trust metrics
		if (action === "trust") {
			return NextResponse.json({
				success: true,
				data: CHAINLINK_TRUST_METRICS,
			});
		}

		// Default: return integration summary
		return NextResponse.json({
			success: true,
			data: {
				service: "Chainlink Oracle Integration",
				endpoints: {
					price: "/api/chainlink/prices?pair=PI/USD&action=price",
					prices: "/api/chainlink/prices?pairs=PI/USD,XLM/USD&action=prices",
					health: "/api/chainlink/prices?action=health",
					automations: "/api/chainlink/prices?action=automations",
					trust: "/api/chainlink/prices?action=trust",
					vrf: "POST /api/chainlink/vrf",
				},
				features: [
					"Decentralized price feeds from independent operators",
					"Verifiable randomness (VRF v2.5)",
					"Keepers automation (v2.1+)",
					"Cross-chain messaging (CCIP with defense-in-depth)",
				],
			},
		});
	} catch (error) {
		console.error("Chainlink API error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch Chainlink data" },
			{ status: 500 },
		);
	}
}

// ============================================================================
// POST: Request Chainlink VRF
// ============================================================================

/**
 * POST /api/chainlink/vrf
 * Request verifiable random numbers from Chainlink VRF
 */
export async function POST(request: NextRequest) {
	try {
		// Validate request body can be parsed
		let body: any;
		try {
			body = await request.json();
		} catch (parseError) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const { action, requestId } = body;

		// Validate action parameter
		if (!action || typeof action !== "string") {
			return NextResponse.json(
				{ error: "action parameter required and must be a string" },
				{ status: 400 },
			);
		}

		if (action === "request_vrf") {
			try {
				const vrfRequestId = await requestChainlinkVRF();
				return NextResponse.json({
					success: true,
					data: {
						requestId: vrfRequestId,
						status: "pending",
						message:
							"VRF request submitted. Results will be available after Chainlink fulfills the request.",
						estimatedTime: "5-10 minutes",
					},
				});
			} catch (vrfError) {
				console.error("VRF request failed:", vrfError);
				return NextResponse.json(
					{ error: "Failed to request VRF. Please try again." },
					{ status: 500 },
				);
			}
		}

		if (action === "get_vrf_result") {
			if (!requestId || typeof requestId !== "string") {
				return NextResponse.json(
					{ error: "requestId required and must be a string" },
					{ status: 400 },
				);
			}

			try {
				const randomness = await getVRFRandomness(requestId);
				return NextResponse.json({
					success: true,
					data: randomness,
				});
			} catch (vrfError) {
				console.error("VRF result retrieval failed:", vrfError);
				return NextResponse.json(
					{
						error:
							"Failed to retrieve VRF result. Request may still be pending.",
					},
					{ status: 500 },
				);
			}
		}

		return NextResponse.json(
			{ error: "Invalid action. Use: request_vrf, get_vrf_result" },
			{ status: 400 },
		);
	} catch (error) {
		console.error("Chainlink VRF endpoint error:", error);
		return NextResponse.json(
			{ error: "Failed to process Chainlink VRF request" },
			{ status: 500 },
		);
	}
}
