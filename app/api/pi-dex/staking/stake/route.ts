/**
 * app/api/pi-dex/staking/stake/route.ts
 * Stake tokens endpoint
 */

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { tokenId, amount, lockupPeriod } = await request.json();

    // Validation
    if (!tokenId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const amountNum = BigInt(amount);
    if (amountNum <= 0n) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const validLockupPeriods = [7, 30, 90, 180, 365];
    if (!validLockupPeriods.includes(lockupPeriod)) {
      return NextResponse.json(
        {
          error: `Invalid lockup period. Must be one of: ${validLockupPeriods.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const minStakeAmount = BigInt(100);
    if (amountNum < minStakeAmount) {
      return NextResponse.json(
        { error: `Minimum stake amount is ${minStakeAmount}` },
        { status: 400 }
      );
    }

    // Get APY for lockup period
    const rewardRates = [5, 7.5, 10, 12.5, 15]; // annual percentages
    const lockupIndex = validLockupPeriods.indexOf(lockupPeriod);
    const apy = rewardRates[lockupIndex];

    const unlocksAt = new Date();
    unlocksAt.setDate(unlocksAt.getDate() + lockupPeriod);

    // TODO: Save staking position to database
    // const stakingPosition = await db.stakingPositions.create({
    //   tokenId,
    //   amount: amountNum,
    //   lockupPeriod,
    //   apy,
    //   userId: user.id,
    //   stakedAt: new Date(),
    //   unlocksAt,
    // });

    const stakingPosition = {
      id: `stake_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: "current_user",
      tokenId,
      amount,
      lockupPeriod,
      apy,
      rewardsEarned: "0",
      stakedAt: new Date().toISOString(),
      unlocksAt: unlocksAt.toISOString(),
    };

    return NextResponse.json(stakingPosition, { status: 201 });
  } catch (error) {
    console.error("Staking error:", error);
    return NextResponse.json(
      { error: "Failed to stake tokens" },
      { status: 500 }
    );
  }
}
