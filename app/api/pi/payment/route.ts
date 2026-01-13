import { type NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { createClient } from "redis";

// Lazy initialization to avoid build-time connection attempts
let redis: ReturnType<typeof createClient> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

function getRedis() {
	if (!redis) {
		redis = createClient({
			url: process.env.REDIS_URL || "redis://localhost:6379",
		});
		redis.connect().catch(console.error);
	}
	return redis;
}

function getSql() {
	if (!sql) {
		sql = postgres(process.env.POSTGRES_URL || "", {
			max: 20,
		});
	}
	return sql;
}

/**
 * Create Pi Payment
 * POST /api/pi/payment
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { user_id, amount, memo, metadata } = body;

		// Validate input
		if (!user_id || !amount || amount <= 0) {
			return NextResponse.json(
				{ error: "Invalid payment data" },
				{ status: 400 },
			);
		}

		// Generate payment ID
		const payment_id = `pi_pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const payment = {
			payment_id,
			user_id,
			amount: Number.parseFloat(amount),
			metadata: {
				memo,
				...metadata,
				ip:
					request.headers.get("x-forwarded-for") ||
					request.headers.get("x-real-ip"),
				user_agent: request.headers.get("user-agent"),
			},
		};

		// Queue payment for processing
		const sqlClient = getSql();
		const redisClient = getRedis();

		await sqlClient`
      INSERT INTO pi_payments (payment_id, user_id, amount, status, metadata, created_at)
      VALUES (${payment.payment_id}, ${payment.user_id}, ${payment.amount}, 'pending', ${JSON.stringify(payment.metadata)}, NOW())
    `;

		await redisClient.lPush("payment_queue", JSON.stringify(payment));

		console.log(`✅ Payment queued: ${payment_id}`);

		return NextResponse.json({
			success: true,
			payment_id,
			status: "pending",
			message: "Payment queued for processing",
		});
	} catch (error) {
		console.error("Payment creation error:", error);
		return NextResponse.json(
			{ error: "Failed to create payment" },
			{ status: 500 },
		);
	}
}

/**
 * Get Payment Status
 * GET /api/pi/payment?payment_id=xxx
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const payment_id = searchParams.get("payment_id");

		if (!payment_id) {
			return NextResponse.json(
				{ error: "payment_id required" },
				{ status: 400 },
			);
		}

		// Try cache first
		const sqlClient = getSql();
		const redisClient = getRedis();

		const cached = await redisClient.get(`payment:${payment_id}`);
		if (cached) {
			return NextResponse.json(JSON.parse(cached));
		}

		// Query database
		const result = await sqlClient`
      SELECT payment_id, user_id, amount, status, pi_transaction_id, metadata, created_at, processed_at
      FROM pi_payments WHERE payment_id = ${payment_id}
    `;

		if (result.length === 0) {
			return NextResponse.json({ error: "Payment not found" }, { status: 404 });
		}

		const payment = result[0];

		// Cache for 5 minutes
		await redisClient.setEx(
			`payment:${payment_id}`,
			300,
			JSON.stringify(payment),
		);

		return NextResponse.json(payment);
	} catch (error) {
		console.error("Payment status error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch payment status" },
			{ status: 500 },
		);
	}
}
