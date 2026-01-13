/**
 * Triumph Synergy - Enterprise Hub API Routes
 *
 * Unified enterprise platform dashboard and cross-system operations
 */

import { type NextRequest, NextResponse } from "next/server";
import { enterpriseHub } from "@/lib/enterprise/enterprise-hub";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const action = searchParams.get("action");

		switch (action) {
			case "dashboard": {
				const dashboard = await enterpriseHub.getDashboard();
				return NextResponse.json({
					success: true,
					data: dashboard,
				});
			}

			case "health": {
				const health = await enterpriseHub.healthCheck();
				return NextResponse.json({
					success: true,
					data: health,
				});
			}

			case "search": {
				const query = searchParams.get("q");
				if (!query) {
					return NextResponse.json(
						{ success: false, error: "Search query required" },
						{ status: 400 },
					);
				}
				const results = await enterpriseHub.globalSearch(query);
				return NextResponse.json({
					success: true,
					data: results,
				});
			}

			case "revenue": {
				const revenue = await enterpriseHub.getRevenueBreakdown();
				return NextResponse.json({
					success: true,
					data: revenue,
				});
			}

			default:
				return NextResponse.json({
					success: true,
					message: "Triumph Synergy Enterprise Hub API",
					version: "1.0.0",
					platform: "Triumph Synergy Digital Ecosystem",
					modules: {
						commerce: "/api/commerce",
						realEstate: "/api/real-estate",
						permits: "/api/permits",
						delivery: "/api/delivery",
						acquisitions: "/api/acquisitions",
						ubi: "/api/ubi",
						nesara: "/api/nesara",
						credit: "/api/credit",
						financialHub: "/api/financial-hub",
					},
					endpoints: {
						"GET ?action=dashboard": "Enterprise dashboard with all metrics",
						"GET ?action=health": "System health check",
						"GET ?action=search&q=": "Global search across all platforms",
						"GET ?action=revenue": "Revenue breakdown by platform",
						POST: "Cross-platform operations",
					},
				});
		}
	} catch (error) {
		console.error("Enterprise Hub API GET error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to process request" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, ...data } = body;

		switch (action) {
			case "initiate-development": {
				const result = await enterpriseHub.initiateRealEstateDevelopment(data);
				return NextResponse.json({
					success: true,
					data: result,
					message: "Development project initiated with permits",
				});
			}

			case "process-ecommerce-delivery": {
				const result = await enterpriseHub.processEcommerceDelivery(
					data.orderId,
				);
				return NextResponse.json({
					success: true,
					data: result,
					message: "E-commerce delivery processed",
				});
			}

			case "integrate-acquired-tech": {
				const result = await enterpriseHub.integrateAcquiredTech(
					data.acquisitionId,
				);
				return NextResponse.json({
					success: true,
					data: result,
					message: "Technology integration plan created",
				});
			}

			default:
				return NextResponse.json(
					{ success: false, error: "Invalid action" },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("Enterprise Hub API POST error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to process request",
			},
			{ status: 500 },
		);
	}
}
