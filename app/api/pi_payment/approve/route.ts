import { type NextRequest, NextResponse } from "next/server";

// Pi Network API Configuration
const PI_API_KEY = process.env.PI_API_KEY || "";
const PI_APP_ID = process.env.PI_APP_ID || "";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { paymentId, amount, memo, metadata, user, isAdmin } = body;

		if (!paymentId) {
			return NextResponse.json(
				{ error: "Payment ID required" },
				{ status: 400 },
			);
		}

		console.log("[Pi Payment API] Approving payment:", {
			paymentId,
			amount,
			memo,
			user,
			isAdmin,
			metadata,
		});

		// Verify payment exists and is valid
		const verifyResponse = await fetch(
			`https://api.minepi.com/v2/payments/${paymentId}`,
			{
				method: "GET",
				headers: {
					Authorization: `Key ${PI_API_KEY}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!verifyResponse.ok) {
			console.error(
				"[Pi Payment API] Payment verification failed:",
				verifyResponse.status,
			);
			return NextResponse.json(
				{
					error: "Payment verification failed",
					details: "Invalid or expired payment ID",
				},
				{ status: 400 },
			);
		}

		const paymentData = await verifyResponse.json();
		console.log("[Pi Payment API] Payment verified:", paymentData);

		// Validate payment details
		if (amount && paymentData.amount !== amount) {
			return NextResponse.json(
				{
					error: "Amount mismatch",
					expected: paymentData.amount,
					received: amount,
				},
				{ status: 400 },
			);
		}

		// Admin override logic
		if (isAdmin && metadata?.adminOverride) {
			console.log(
				"[Pi Payment API] Admin override applied for payment:",
				paymentId,
			);
		}

		// Approve the payment
		const approveResponse = await fetch(
			`https://api.minepi.com/v2/payments/${paymentId}/approve`,
			{
				method: "POST",
				headers: {
					Authorization: `Key ${PI_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					// Additional approval metadata can be added here
				}),
			},
		);

		if (!approveResponse.ok) {
			console.error(
				"[Pi Payment API] Payment approval failed:",
				approveResponse.status,
			);
			return NextResponse.json(
				{
					error: "Payment approval failed",
					details: await approveResponse.text(),
				},
				{ status: 400 },
			);
		}

		const approvalData = await approveResponse.json();
		console.log("[Pi Payment API] Payment approved:", approvalData);

		return NextResponse.json({
			success: true,
			paymentId,
			status: "approved",
			data: approvalData,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[Pi Payment API] Approval error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
