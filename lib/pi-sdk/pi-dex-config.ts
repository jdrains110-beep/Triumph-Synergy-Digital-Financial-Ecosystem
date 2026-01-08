/**
 * lib/pi-sdk/pi-dex-config.ts
 * Pi Dex Configuration - Decentralized Exchange capabilities
 */

export const PI_DEX_CONFIG = {
  // Dex Identity
  dexId: "triumph-synergy-dex",
  dexName: "Triumph Synergy DEX",
  dexVersion: "1.0.0",
  description: "Advanced decentralized exchange powered by Pi Network",

  // Supported Operations
  operations: {
    createToken: true,
    trade: true,
    liquidity: true,
    staking: true,
    swaps: true,
    marketplace: true,
  },

  // Token Configuration
  tokens: {
    maxSupply: 1_000_000_000, // 1 billion tokens max
    decimals: 8,
    burnEnabled: true,
    mintEnabled: true,
    freezeEnabled: false,
  },

  // Trading Configuration
  trading: {
    minTradeAmount: 0.1,
    maxTradeAmount: 1_000_000,
    feePercentage: 0.25, // 0.25% trading fee
    settlementTime: 5, // seconds
    maxSlippage: 5, // 5% max slippage
  },

  // Liquidity Configuration
  liquidity: {
    minLiquidityAmount: 100,
    maxLiquidityLock: 365 * 24, // 1 year in hours
    autoReinvest: true,
    rewardPercentage: 2, // 2% yearly rewards
  },

  // Smart Contract Configuration
  smartContract: {
    enabled: true,
    maxGasLimit: 3_000_000,
    gasPrice: 1, // wei per unit
    contractTimeout: 30, // seconds
  },

  // Marketplace Configuration
  marketplace: {
    enabled: true,
    commissionPercentage: 2.5, // 2.5% commission
    categoryLimit: 50,
    listingFeeFlat: 1, // 1 Pi flat fee
    listingFeePct: 0.1, // 0.1% of listing amount
  },

  // API Endpoints
  apiEndpoints: {
    tokens: "/api/pi-dex/tokens",
    createToken: "/api/pi-dex/tokens/create",
    getToken: "/api/pi-dex/tokens/get",
    listTokens: "/api/pi-dex/tokens/list",
    deleteToken: "/api/pi-dex/tokens/delete",

    trading: "/api/pi-dex/trading",
    placeOrder: "/api/pi-dex/trading/order",
    getOrders: "/api/pi-dex/trading/orders",
    cancelOrder: "/api/pi-dex/trading/cancel",
    executeSwap: "/api/pi-dex/trading/swap",

    liquidity: "/api/pi-dex/liquidity",
    addLiquidity: "/api/pi-dex/liquidity/add",
    removeLiquidity: "/api/pi-dex/liquidity/remove",
    getLiquidityPools: "/api/pi-dex/liquidity/pools",

    marketplace: "/api/pi-dex/marketplace",
    listItem: "/api/pi-dex/marketplace/list",
    buyItem: "/api/pi-dex/marketplace/buy",
    getListings: "/api/pi-dex/marketplace/listings",

    staking: "/api/pi-dex/staking",
    stake: "/api/pi-dex/staking/stake",
    unstake: "/api/pi-dex/staking/unstake",
    getStakes: "/api/pi-dex/staking/stakes",
  },

  // User Roles
  roles: {
    admin: "admin",
    tokenCreator: "tokenCreator",
    trader: "trader",
    liquidityProvider: "liquidityProvider",
    stakeholder: "stakeholder",
    user: "user",
  },

  // Supported Token Standards
  tokenStandards: ["PT20", "PT721", "PT1155"], // Pi Token standards

  // Network Configuration
  network: {
    chainId: process.env.NEXT_PUBLIC_PI_SANDBOX === "true" ? 2 : 1, // 2 for testnet, 1 for mainnet
    chainName:
      process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
        ? "Pi Testnet"
        : "Pi Mainnet",
    rpcUrl:
      process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
        ? "https://testnet-rpc.minepi.com"
        : "https://mainnet-rpc.minepi.com",
    explorerUrl:
      process.env.NEXT_PUBLIC_PI_SANDBOX === "true"
        ? "https://testnet-explorer.minepi.com"
        : "https://explorer.minepi.com",
  },

  // Whitelist Configuration
  whitelist: {
    enabled: true,
    maxWhitelistSize: 10_000,
    whitelistBonus: 10, // 10% bonus for whitelisted users
  },

  // Staking Configuration
  staking: {
    enabled: true,
    minStakeAmount: 100,
    lockupPeriods: [7, 30, 90, 180, 365], // days
    rewardRates: [5, 7.5, 10, 12.5, 15], // annual percentages
    compoundFrequency: 86_400, // daily in seconds
  },

  // Fee Structure
  fees: {
    tokenCreation: 10, // 10 Pi to create token
    tradingFee: 0.25, // 0.25% per trade
    liquidityFee: 0.1, // 0.1% for liquidity provision
    marketplaceListing: 1, // 1 Pi base fee
    withdrawalFee: 0.5, // 0.5% withdrawal fee
  },

  // Security
  security: {
    requireKYC: false,
    requireAudit: false,
    enableRateLimit: true,
    rateLimitPerMinute: 60,
    enableDDoSProtection: true,
  },

  // Maintenance
  maintenance: {
    enabled: false,
    maintenanceMessage: "Pi Dex is under maintenance",
  },
};

// Helper function to get configuration by environment
export function getDexConfig(sandbox?: boolean) {
  const isSandbox = sandbox ?? process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
  return {
    ...PI_DEX_CONFIG,
    network: {
      ...PI_DEX_CONFIG.network,
      chainId: isSandbox ? 2 : 1,
      chainName: isSandbox ? "Pi Testnet" : "Pi Mainnet",
    },
  };
}

// Helper function to format token amount with decimals
export function formatTokenAmount(
  amount: number,
  decimals: number = PI_DEX_CONFIG.tokens.decimals
): string {
  return (amount / 10 ** decimals).toFixed(decimals);
}

// Helper function to parse token amount from user input
export function parseTokenAmount(
  amount: string,
  decimals: number = PI_DEX_CONFIG.tokens.decimals
): bigint {
  const num = Number.parseFloat(amount);
  return BigInt(Math.floor(num * 10 ** decimals));
}

// Helper function to calculate trading fee
export function calculateTradingFee(amount: number): number {
  return amount * (PI_DEX_CONFIG.trading.feePercentage / 100);
}

// Helper function to calculate marketplace commission
export function calculateMarketplaceCommission(amount: number): number {
  return amount * (PI_DEX_CONFIG.marketplace.commissionPercentage / 100);
}

// Helper function to calculate staking reward
export function calculateStakingReward(
  amount: number,
  lockupDays: number
): number {
  const lockupIndex = PI_DEX_CONFIG.staking.lockupPeriods.indexOf(lockupDays);
  if (lockupIndex === -1) {
    return 0;
  }

  const annualRate = PI_DEX_CONFIG.staking.rewardRates[lockupIndex] / 100;
  const dailyRate = annualRate / 365;
  return amount * dailyRate * lockupDays;
}

// Export configuration
export default PI_DEX_CONFIG;
