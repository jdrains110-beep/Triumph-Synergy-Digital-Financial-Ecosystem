/**
 * Token Reward System API
 * 
 * Endpoints for token management:
 * - GET: Get wallet, balances, transactions
 * - POST: Create wallet, reward activity, transfer, stake, swap
 */

import { NextResponse } from "next/server";
import {
  tokenRewardSystem,
  activityEngagement,
  initializeUser,
  getUserEngagementProfile,
  tokensToPi,
  piToTokens,
  type TokenType,
  type ActivityType,
} from "@/lib/tokens";

// ============================================================================
// GET - Query token data
// ============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const walletId = searchParams.get("walletId");
    const userId = searchParams.get("userId");

    switch (action) {
      case "wallet": {
        if (!walletId) {
          return NextResponse.json(
            { error: "walletId required" },
            { status: 400 }
          );
        }
        const wallet = tokenRewardSystem.getWallet(walletId);
        if (!wallet) {
          return NextResponse.json(
            { error: "Wallet not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ wallet });
      }

      case "balances": {
        if (!walletId) {
          return NextResponse.json(
            { error: "walletId required" },
            { status: 400 }
          );
        }
        const balances = tokenRewardSystem.getBalances(walletId);
        return NextResponse.json({ balances });
      }

      case "transactions": {
        if (!walletId) {
          return NextResponse.json(
            { error: "walletId required" },
            { status: 400 }
          );
        }
        const limit = parseInt(searchParams.get("limit") || "50");
        const transactions = tokenRewardSystem.getTransactions(walletId, limit);
        return NextResponse.json({ transactions });
      }

      case "staking": {
        if (!walletId) {
          return NextResponse.json(
            { error: "walletId required" },
            { status: 400 }
          );
        }
        const positions = tokenRewardSystem.getStakingPositions(walletId);
        return NextResponse.json({ positions });
      }

      case "engagement": {
        if (!userId || !walletId) {
          return NextResponse.json(
            { error: "userId and walletId required" },
            { status: 400 }
          );
        }
        const profile = getUserEngagementProfile(userId, walletId);
        return NextResponse.json({ profile });
      }

      case "streak": {
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const streak = activityEngagement.getStreak(userId);
        return NextResponse.json({ streak: streak || null });
      }

      case "statistics": {
        const stats = tokenRewardSystem.getStatistics();
        return NextResponse.json({ statistics: stats });
      }

      case "convert": {
        const tokenType = searchParams.get("tokenType") as TokenType;
        const amount = parseFloat(searchParams.get("amount") || "0");
        const direction = searchParams.get("direction"); // "toPi" or "toTokens"

        if (!tokenType || !amount || !direction) {
          return NextResponse.json(
            { error: "tokenType, amount, and direction required" },
            { status: 400 }
          );
        }

        const result =
          direction === "toPi"
            ? { pi: tokensToPi(tokenType, amount) }
            : { tokens: piToTokens(tokenType, amount) };

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: wallet, balances, transactions, staking, engagement, streak, statistics, convert" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Token API GET error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Token operations
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "initialize": {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const result = initializeUser(userId);
        return NextResponse.json({ success: true, ...result });
      }

      case "createWallet": {
        const { walletId, type = "individual" } = body;
        if (!walletId) {
          return NextResponse.json(
            { error: "walletId required" },
            { status: 400 }
          );
        }
        const wallet = tokenRewardSystem.createWallet(walletId, type);
        return NextResponse.json({ success: true, wallet });
      }

      case "reward": {
        const { walletId, activityType, activityId, multiplier } = body;
        if (!walletId || !activityType) {
          return NextResponse.json(
            { error: "walletId and activityType required" },
            { status: 400 }
          );
        }
        const reward = tokenRewardSystem.rewardActivity({
          walletId,
          activityType: activityType as ActivityType,
          activityId,
          multiplier,
        });
        return NextResponse.json({ success: true, reward });
      }

      case "transfer": {
        const { fromWalletId, toWalletId, tokenType, amount, memo } = body;
        if (!fromWalletId || !toWalletId || !tokenType || !amount) {
          return NextResponse.json(
            { error: "fromWalletId, toWalletId, tokenType, and amount required" },
            { status: 400 }
          );
        }
        const tx = tokenRewardSystem.transferTokens({
          fromWalletId,
          toWalletId,
          tokenType,
          amount,
          memo,
        });
        return NextResponse.json({ success: true, transaction: tx });
      }

      case "stake": {
        const { walletId, tokenType, amount, lockDays } = body;
        if (!walletId || !tokenType || !amount) {
          return NextResponse.json(
            { error: "walletId, tokenType, and amount required" },
            { status: 400 }
          );
        }
        const position = tokenRewardSystem.stakeTokens({
          walletId,
          tokenType,
          amount,
          lockDays,
        });
        return NextResponse.json({ success: true, position });
      }

      case "unstake": {
        const { positionId } = body;
        if (!positionId) {
          return NextResponse.json(
            { error: "positionId required" },
            { status: 400 }
          );
        }
        const rewards = tokenRewardSystem.unstakeTokens(positionId);
        return NextResponse.json({ success: true, rewards });
      }

      case "swap": {
        const { walletId, tokenType, tokenAmount } = body;
        if (!walletId || !tokenType || !tokenAmount) {
          return NextResponse.json(
            { error: "walletId, tokenType, and tokenAmount required" },
            { status: 400 }
          );
        }
        const result = tokenRewardSystem.swapToPi({
          walletId,
          tokenType,
          tokenAmount,
        });
        return NextResponse.json({ success: true, ...result });
      }

      case "addLiquidity": {
        const { walletId, tokenType, tokenAmount, piAmount } = body;
        if (!walletId || !tokenType || !tokenAmount || !piAmount) {
          return NextResponse.json(
            { error: "walletId, tokenType, tokenAmount, and piAmount required" },
            { status: 400 }
          );
        }
        const result = tokenRewardSystem.addLiquidity({
          walletId,
          tokenType,
          tokenAmount,
          piAmount,
        });
        return NextResponse.json({ success: true, lpTokens: result });
      }

      case "dailyCheckIn": {
        const { userId, walletId } = body;
        if (!userId || !walletId) {
          return NextResponse.json(
            { error: "userId and walletId required" },
            { status: 400 }
          );
        }
        const result = activityEngagement.dailyCheckIn(userId, walletId);
        return NextResponse.json({ success: true, ...result });
      }

      // Video engagement
      case "startVideo": {
        const { userId, walletId, videoId, videoTitle, category, duration } = body;
        if (!userId || !walletId || !videoId || !duration) {
          return NextResponse.json(
            { error: "userId, walletId, videoId, and duration required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.startVideo({
          userId,
          walletId,
          videoId,
          videoTitle: videoTitle || "Video",
          category: category || "entertainment",
          duration,
        });
        return NextResponse.json({ success: true, session });
      }

      case "updateVideo": {
        const { sessionId, watchedSeconds } = body;
        if (!sessionId || watchedSeconds === undefined) {
          return NextResponse.json(
            { error: "sessionId and watchedSeconds required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.updateVideoProgress(sessionId, watchedSeconds);
        return NextResponse.json({ success: true, session });
      }

      case "endVideo": {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: "sessionId required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.endVideo(sessionId);
        return NextResponse.json({ success: true, session });
      }

      // Game engagement
      case "startGame": {
        const { userId, walletId, gameId, gameName, category } = body;
        if (!userId || !walletId || !gameId) {
          return NextResponse.json(
            { error: "userId, walletId, and gameId required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.startGame({
          userId,
          walletId,
          gameId,
          gameName: gameName || "Game",
          category: category || "casual",
        });
        return NextResponse.json({ success: true, session });
      }

      case "updateGame": {
        const { sessionId, score, level, achievements } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: "sessionId required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.updateGameProgress(sessionId, {
          score,
          level,
          achievements,
        });
        return NextResponse.json({ success: true, session });
      }

      case "endGame": {
        const { sessionId, won } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: "sessionId required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.endGame(sessionId, won ?? false);
        return NextResponse.json({ success: true, session });
      }

      // Learning engagement
      case "startLearning": {
        const { userId, walletId, type, contentId, contentTitle, category } = body;
        if (!userId || !walletId || !contentId) {
          return NextResponse.json(
            { error: "userId, walletId, and contentId required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.startLearning({
          userId,
          walletId,
          type: type || "lesson",
          contentId,
          contentTitle: contentTitle || "Lesson",
          category: category || "general",
        });
        return NextResponse.json({ success: true, session });
      }

      case "completeLearning": {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: "sessionId required" },
            { status: 400 }
          );
        }
        const session = activityEngagement.completeLearning(sessionId);
        return NextResponse.json({ success: true, session });
      }

      // Social actions
      case "socialAction": {
        const { userId, walletId, actionType, targetId, description } = body;
        if (!userId || !walletId || !actionType) {
          return NextResponse.json(
            { error: "userId, walletId, and actionType required" },
            { status: 400 }
          );
        }
        const action = activityEngagement.recordSocialAction({
          userId,
          walletId,
          actionType,
          targetId,
          description: description || "",
        });
        return NextResponse.json({ success: true, action });
      }

      default:
        return NextResponse.json(
          {
            error: `Invalid action. Available: initialize, createWallet, reward, transfer, 
                    stake, unstake, swap, addLiquidity, dailyCheckIn, 
                    startVideo, updateVideo, endVideo, startGame, updateGame, endGame,
                    startLearning, completeLearning, socialAction`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Token API POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
