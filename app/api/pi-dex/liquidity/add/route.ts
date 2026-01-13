/**
 * app/api/pi-dex/liquidity/add/route.ts
 * Add liquidity endpoint
 */

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { tokenAId, tokenBId, amountA, amountB } = await request.json();

		// Validation
		if (!tokenAId || !tokenBId) {
			return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
		}

		if (tokenAId === tokenBId) {
			return NextResponse.json(
				{ error: "Cannot add liquidity with same token" },
				{ status: 400 },
			);
		}

		const amountANum = BigInt(amountA);
		const amountBNum = BigInt(amountB);
		const minLiquidity = BigInt(100);

		if (amountANum < minLiquidity || amountBNum < minLiquidity) {
			return NextResponse.json(
				{ error: `Minimum liquidity amount is ${minLiquidity}` },
				{ status: 400 },
			);
		}

		// TODO: Create liquidity pool/position in database
		// const lpPosition = await db.liquidityPositions.create({
		//   tokenAId,
		//   tokenBId,
		//   amountA: amountANum,
		//   amountB: amountBNum,
		//   lpTokens: amountANum + amountBNum,
		//   userId: user.id,
		//   timestamp: new Date(),
		// });

		const lpPosition = {
			id: `lp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
			userId: "current_user",
			tokenAId,
			tokenBId,
			amountA,
			amountB,
			lpTokens: (Number(amountANum) + Number(amountBNum)).toString(),
			sharePercentage: 100,
			rewardsEarned: "0",
			createdAt: new Date().toISOString(),
		};

		return NextResponse.json(lpPosition, { status: 201 });
	} catch (error) {
		console.error("Add liquidity error:", error);
		return NextResponse.json(
			{ error: "Failed to add liquidity" },
			{ status: 500 },
		);
	}
}
