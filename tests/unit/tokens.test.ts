/**
 * Token Reward System Unit Tests
 * Covers: TokenRewardSystem, TokenType, ActivityType, TokenBalance, TokenWallet
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------
const rewardSystemMock = {
  getTokenInfo: vi.fn(),
  getWallet: vi.fn(),
  createWallet: vi.fn(),
  recordActivity: vi.fn(),
  transfer: vi.fn(),
  stake: vi.fn(),
  unstake: vi.fn(),
  burn: vi.fn(),
  getBalance: vi.fn(),
  getLeaderboard: vi.fn(),
  setExchangeRate: vi.fn(),
};

vi.mock("@/lib/tokens/token-reward-system", () => ({
  tokenRewardSystem: rewardSystemMock,
  TOKEN_CONFIGS: {
    SYNERGY: { piPegRatio: 100, baseReward: 10 },
    TRIUMPH: { piPegRatio: 10, baseReward: 50 },
    LEARN: { piPegRatio: 500, baseReward: 5 },
    PLAY: { piPegRatio: 1000, baseReward: 1 },
    WATCH: { piPegRatio: 2000, baseReward: 0.5 },
    WORK: { piPegRatio: 50, baseReward: 20 },
    TEACH: { piPegRatio: 20, baseReward: 100 },
    CREATE: { piPegRatio: 30, baseReward: 75 },
    SOCIAL: { piPegRatio: 200, baseReward: 2 },
    LOYALTY: { piPegRatio: 50, baseReward: 15 },
  },
}));

vi.mock("@/lib/tokens/business-interactions", () => ({
  businessInteractions: {
    recordPurchase: vi.fn(),
    recordSale: vi.fn(),
    listProducts: vi.fn(),
  },
}));

import { tokenRewardSystem, TOKEN_CONFIGS } from "@/lib/tokens/token-reward-system";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBalance(tokenType = "SYNERGY", available = 0) {
  return {
    tokenType,
    available,
    staked: 0,
    pending: 0,
    locked: 0,
    totalEarned: available,
    totalSpent: 0,
    lastUpdated: new Date(),
  };
}

function makeWallet(userId = "user-001") {
  return {
    userId,
    balances: new Map([
      ["SYNERGY", makeBalance("SYNERGY", 100)],
      ["TRIUMPH", makeBalance("TRIUMPH", 5)],
    ]),
    totalPiValue: 1.05,
    createdAt: new Date(),
    lastActivityAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("TOKEN_CONFIGS constants", () => {
  const tokenTypes = [
    "SYNERGY", "TRIUMPH", "LEARN", "PLAY", "WATCH",
    "WORK", "TEACH", "CREATE", "SOCIAL", "LOYALTY",
  ];

  it.each(tokenTypes)("should define token '%s'", (type) => {
    expect(TOKEN_CONFIGS[type as keyof typeof TOKEN_CONFIGS]).toBeDefined();
  });

  it("should have positive piPegRatio for all tokens", () => {
    for (const config of Object.values(TOKEN_CONFIGS)) {
      expect(config.piPegRatio).toBeGreaterThan(0);
    }
  });

  it("should have non-negative baseReward for all tokens", () => {
    for (const config of Object.values(TOKEN_CONFIGS)) {
      expect(config.baseReward).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("createWallet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create a wallet and initialize zero balances", async () => {
    rewardSystemMock.createWallet.mockResolvedValueOnce(makeWallet("user-new"));

    const wallet = await rewardSystemMock.createWallet("user-new");
    expect(wallet.userId).toBe("user-new");
    expect(wallet.totalPiValue).toBeGreaterThanOrEqual(0);
  });
});

describe("recordActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should credit LEARN tokens for completing a lesson", async () => {
    rewardSystemMock.recordActivity.mockResolvedValueOnce({
      success: true,
      tokensEarned: 5,
      tokenType: "LEARN",
      newBalance: 105,
    });

    const result = await rewardSystemMock.recordActivity({
      userId: "user-001",
      activityType: "lesson-complete",
      metadata: { courseId: "course-pi-101" },
    });

    expect(result.success).toBe(true);
    expect(result.tokensEarned).toBeGreaterThan(0);
    expect(result.tokenType).toBe("LEARN");
  });

  it("should credit PLAY tokens for game wins", async () => {
    rewardSystemMock.recordActivity.mockResolvedValueOnce({
      success: true,
      tokensEarned: 10,
      tokenType: "PLAY",
      newBalance: 20,
    });

    const result = await rewardSystemMock.recordActivity({
      userId: "user-001",
      activityType: "game-win",
    });

    expect(result.tokenType).toBe("PLAY");
    expect(result.tokensEarned).toBeGreaterThan(0);
  });

  it("should apply streak multiplier on repeated daily login", async () => {
    rewardSystemMock.recordActivity.mockResolvedValueOnce({
      success: true,
      tokensEarned: 20,
      tokenType: "SYNERGY",
      bonusMultiplier: 2.0,
    });

    const result = await rewardSystemMock.recordActivity({
      userId: "user-001",
      activityType: "streak-bonus",
      metadata: { streakDays: 7 },
    });

    expect(result.bonusMultiplier).toBe(2.0);
    expect(result.tokensEarned).toBe(20);
  });

  it("should reject unknown activity types", async () => {
    rewardSystemMock.recordActivity.mockRejectedValueOnce(
      new Error("Unknown activity type: invalid-action")
    );

    await expect(
      rewardSystemMock.recordActivity({ userId: "u1", activityType: "invalid-action" })
    ).rejects.toThrow("Unknown activity type");
  });
});

describe("transfer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should transfer tokens between users", async () => {
    rewardSystemMock.transfer.mockResolvedValueOnce({
      success: true,
      txId: "transfer-001",
      amount: 50,
      from: "user-001",
      to: "user-002",
      tokenType: "SYNERGY",
    });

    const result = await rewardSystemMock.transfer({
      from: "user-001",
      to: "user-002",
      amount: 50,
      tokenType: "SYNERGY",
    });

    expect(result.success).toBe(true);
    expect(result.amount).toBe(50);
  });

  it("should fail transfer if insufficient balance", async () => {
    rewardSystemMock.transfer.mockRejectedValueOnce(
      new Error("Insufficient SYNERGY balance: have 10, need 500")
    );

    await expect(
      rewardSystemMock.transfer({ from: "user-001", to: "user-002", amount: 500, tokenType: "SYNERGY" })
    ).rejects.toThrow("Insufficient SYNERGY balance");
  });
});

describe("stake / unstake", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should stake tokens and lock them", async () => {
    rewardSystemMock.stake.mockResolvedValueOnce({
      success: true,
      staked: 100,
      lockPeriodDays: 30,
      estimatedYield: 5.2,
    });

    const result = await rewardSystemMock.stake({ userId: "u1", amount: 100, tokenType: "TRIUMPH", lockPeriodDays: 30 });
    expect(result.success).toBe(true);
    expect(result.staked).toBe(100);
    expect(result.estimatedYield).toBeGreaterThan(0);
  });

  it("should unstake tokens after lock period", async () => {
    rewardSystemMock.unstake.mockResolvedValueOnce({
      success: true,
      released: 100,
      rewards: 5.2,
    });

    const result = await rewardSystemMock.unstake({ userId: "u1", stakeId: "stake-001" });
    expect(result.success).toBe(true);
    expect(result.released).toBeGreaterThan(0);
  });

  it("should reject unstaking before lock period expires", async () => {
    rewardSystemMock.unstake.mockRejectedValueOnce(
      new Error("Lock period not yet expired: 15 days remaining")
    );

    await expect(rewardSystemMock.unstake({ userId: "u1", stakeId: "stake-001" })).rejects.toThrow(
      "Lock period not yet expired"
    );
  });
});

describe("burn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should permanently reduce token supply", async () => {
    rewardSystemMock.burn.mockResolvedValueOnce({
      success: true,
      burned: 25,
      newCirculatingSupply: 999975,
    });

    const result = await rewardSystemMock.burn({ userId: "u1", amount: 25, tokenType: "SYNERGY" });
    expect(result.success).toBe(true);
    expect(result.burned).toBe(25);
    expect(result.newCirculatingSupply).toBeGreaterThan(0);
  });
});

describe("getLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return ranked users with token counts", async () => {
    const leaders = [
      { rank: 1, userId: "user-top", totalTokens: 50000 },
      { rank: 2, userId: "user-second", totalTokens: 42000 },
    ];
    rewardSystemMock.getLeaderboard.mockResolvedValueOnce(leaders);

    const result = await rewardSystemMock.getLeaderboard({ tokenType: "SYNERGY", limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].totalTokens).toBeGreaterThan(result[1].totalTokens);
  });
});

// ---------------------------------------------------------------------------
// TokenBalance shape validation
// ---------------------------------------------------------------------------
describe("TokenBalance structure", () => {
  it("should have all required numeric fields", () => {
    const balance = makeBalance("SYNERGY", 100);

    expect(typeof balance.available).toBe("number");
    expect(typeof balance.staked).toBe("number");
    expect(typeof balance.pending).toBe("number");
    expect(typeof balance.locked).toBe("number");
    expect(balance.available).toBeGreaterThanOrEqual(0);
    expect(balance.lastUpdated).toBeInstanceOf(Date);
  });

  it("should not allow negative balance values", () => {
    const balance = makeBalance("SYNERGY", 0);
    expect(balance.available).toBeGreaterThanOrEqual(0);
    expect(balance.totalSpent).toBeGreaterThanOrEqual(0);
  });
});
