import { createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

// Lazy Redis client to avoid build-time connection attempts
let redis: ReturnType<typeof createClient> | null = null;
function getRedis() {
	if (!redis) {
		redis = createClient({
			url: process.env.REDIS_URL || "redis://localhost:6379",
		});
		redis.connect().catch(console.error);
	}
	return redis;
}

/**
 * GitHub Webhook Handler for Smart Contracts
 * POST /api/contracts/webhook
 */
export async function POST(request: NextRequest) {
	try {
		const signature = request.headers.get("x-hub-signature-256");
		const body = await request.text();

		// Verify GitHub signature
		const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
		const hmac = createHmac("sha256", secret);
		const digest = `sha256=${hmac.update(body).digest("hex")}`;

		if (signature !== digest && process.env.NODE_ENV === "production") {
			console.error("Invalid webhook signature");
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}

		const payload = JSON.parse(body);

		// Handle push events
		if (payload.commits && Array.isArray(payload.commits)) {
			const contractFiles: Array<{
				file: string;
				commit_id: string;
				message: string;
			}> = [];

			for (const commit of payload.commits) {
				// Check for smart contract files
				const files = [...(commit.added || []), ...(commit.modified || [])];

				for (const file of files) {
					if (
						file.endsWith(".rs") ||
						file.endsWith(".sol") ||
						file.endsWith(".move") ||
						file.includes("contracts/")
					) {
						contractFiles.push({
							file,
							commit_id: commit.id,
							message: commit.message,
						});
					}
				}
			}

			if (contractFiles.length > 0) {
				console.log(`📄 Found ${contractFiles.length} contract files`);

				// Queue for processing
				const job = {
					job_id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					repository: payload.repository.full_name,
					branch: payload.ref.replace("refs/heads/", ""),
					contracts: contractFiles,
					pusher: payload.pusher.name,
					timestamp: new Date().toISOString(),
				};

				const redisClient = getRedis();
				await redisClient.lPush("contract_jobs", JSON.stringify(job));

				return NextResponse.json({
					success: true,
					message: "Contract deployment queued",
					job_id: job.job_id,
					contracts: contractFiles.length,
				});
			}
		}

		return NextResponse.json({
			success: true,
			message: "No contracts to process",
		});
	} catch (error) {
		console.error("Webhook error:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 },
		);
	}
}

/**
 * Get Contract Deployment Status
 * GET /api/contracts/webhook?job_id=xxx
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const job_id = searchParams.get("job_id");

		if (!job_id) {
			return NextResponse.json({ error: "job_id required" }, { status: 400 });
		}

		const redisClient = getRedis();
		const status = await redisClient.get(`contract_status:${job_id}`);

		if (!status) {
			return NextResponse.json({ error: "Job not found" }, { status: 404 });
		}

		return NextResponse.json(JSON.parse(status));
	} catch (error) {
		console.error("Status check error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch status" },
			{ status: 500 },
		);
	}
}
