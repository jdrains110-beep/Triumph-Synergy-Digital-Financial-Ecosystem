import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { paymentId, reason } = body;

		if (!paymentId) {
			return NextResponse.json(
				{ error: "Payment ID required" },
				{ status: 400 },
			);
		}

		console.log("[Pi Payment] Incomplete payment reported:", {
			paymentId,
			reason,
		});

		// TODO: Implement incomplete payment recovery logic
		// Could mark payment as incomplete, schedule retry, notify user, etc.

		return NextResponse.json({
			success: true,
			message: "Incomplete payment logged for recovery",
			paymentId,
			status: "incomplete",
		});
	} catch (error) {
		console.error("[Pi Payment] Incomplete handling failed:", error);
		return NextResponse.json(
			{ error: "Failed to process incomplete payment" },
			{ status: 500 },
		);
	}
}
