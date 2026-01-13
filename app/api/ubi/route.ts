/**
 * Triumph Synergy - UBI API Routes
 *
 * API endpoints for Universal Basic Income distribution
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	distributeUBI,
	enrollInUBI,
	ubiEngine,
} from "@/lib/ubi/universal-basic-income";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action } = body;

		switch (action) {
			case "enroll": {
				const { piUsername, walletAddress, country } = body;

				if (!piUsername || !walletAddress) {
					return NextResponse.json(
						{ error: "Missing required fields: piUsername, walletAddress" },
						{ status: 400 },
					);
				}

				const recipient = await enrollInUBI(
					piUsername,
					walletAddress,
					country || "US",
				);

				return NextResponse.json({
					success: true,
					recipient,
					message: "Successfully enrolled in UBI program(s)",
				});
			}

			case "distribute": {
				const { programId, recipientIds } = body;

				if (!programId || !recipientIds || !Array.isArray(recipientIds)) {
					return NextResponse.json(
						{
							error: "Missing required fields: programId, recipientIds (array)",
						},
						{ status: 400 },
					);
				}

				const distributions = await distributeUBI(programId, recipientIds);

				return NextResponse.json({
					success: true,
					distributions,
					count: distributions.length,
					message: "Distribution processed successfully",
				});
			}

			case "get-status": {
				const { recipientId } = body;

				if (!recipientId) {
					return NextResponse.json(
						{ error: "Missing required field: recipientId" },
						{ status: 400 },
					);
				}

				const recipient = await ubiEngine.getRecipient(recipientId);

				if (!recipient) {
					return NextResponse.json(
						{ error: "Recipient not found" },
						{ status: 404 },
					);
				}

				return NextResponse.json({
					success: true,
					recipient,
				});
			}

			case "list-programs": {
				const programs = await ubiEngine.listPrograms();

				return NextResponse.json({
					success: true,
					programs,
				});
			}

			case "process-queue": {
				const result = await ubiEngine.processDistributionQueue();

				return NextResponse.json({
					success: true,
					processed: result.processed,
					failed: result.failed,
					message: `Processed ${result.processed} distributions, ${result.failed} failed`,
				});
			}

			default:
				return NextResponse.json(
					{ error: `Unknown action: ${action}` },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("UBI API error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const recipientId = searchParams.get("recipientId");

	if (recipientId) {
		const recipient = await ubiEngine.getRecipient(recipientId);

		if (!recipient) {
			return NextResponse.json(
				{ error: "Recipient not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({
			success: true,
			recipient,
		});
	}

	// Return list of programs if no recipient specified
	const programs = await ubiEngine.listPrograms();

	return NextResponse.json({
		success: true,
		programs,
		message: "UBI System Active - Powered by Pi Network",
	});
}
