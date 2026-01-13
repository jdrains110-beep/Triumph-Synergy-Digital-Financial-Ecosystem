/**
 * Pi Network Next.js SDK
 * Provides route handlers for Pi payment approval and completion
 */

import { type NextRequest, NextResponse } from "next/server";

const PI_API_BASE_URL = process.env.PI_API_URL || "https://api.minepi.com";

export interface PiPaymentResponse {
	identifier: string;
	user_uid: string;
	amount: number;
	memo: string;
	metadata: Record<string, unknown>;
	status: {
		developer_approved: boolean;
		transaction_verified: boolean;
		developer_completed: boolean;
		cancelled: boolean;
		user_cancelled: boolean;
	};
	transaction?: {
		txid: string;
		verified: boolean;
	};
}

/**
 * Helper to get the API key
 */
function getApiKey(): string {
	const apiKey = process.env.PI_API_KEY;
	if (!apiKey) {
		throw new Error("PI_API_KEY environment variable is not set");
	}
	return apiKey;
}

/**
 * Approve payment POST handler for Next.js App Router
 */
export async function approvePOST(req: NextRequest): Promise<NextResponse> {
	try {
		const body = await req.json();
		const { paymentId } = body;

		if (!paymentId) {
			return NextResponse.json(
				{ error: "paymentId is required" },
				{ status: 400 },
			);
		}

		const apiKey = getApiKey();

		const response = await fetch(
			`${PI_API_BASE_URL}/v2/payments/${paymentId}/approve`,
			{
				method: "POST",
				headers: {
					Authorization: `Key ${apiKey}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json(
				{ error: `Failed to approve payment: ${error}` },
				{ status: response.status },
			);
		}

		const data: PiPaymentResponse = await response.json();
		return NextResponse.json({ success: true, payment: data });
	} catch (error) {
		console.error("Pi payment approval error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}

/**
 * Complete payment POST handler for Next.js App Router
 */
export async function completePOST(req: NextRequest): Promise<NextResponse> {
	try {
		const body = await req.json();
		const { paymentId, txid } = body;

		if (!paymentId || !txid) {
			return NextResponse.json(
				{ error: "paymentId and txid are required" },
				{ status: 400 },
			);
		}

		const apiKey = getApiKey();

		const response = await fetch(
			`${PI_API_BASE_URL}/v2/payments/${paymentId}/complete`,
			{
				method: "POST",
				headers: {
					Authorization: `Key ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ txid }),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json(
				{ error: `Failed to complete payment: ${error}` },
				{ status: response.status },
			);
		}

		const data: PiPaymentResponse = await response.json();
		return NextResponse.json({ success: true, payment: data });
	} catch (error) {
		console.error("Pi payment completion error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}

/**
 * Get payment status
 */
export async function getPayment(
	paymentId: string,
): Promise<PiPaymentResponse> {
	const apiKey = getApiKey();

	const response = await fetch(`${PI_API_BASE_URL}/v2/payments/${paymentId}`, {
		headers: {
			Authorization: `Key ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to get payment: ${await response.text()}`);
	}

	return response.json();
}
