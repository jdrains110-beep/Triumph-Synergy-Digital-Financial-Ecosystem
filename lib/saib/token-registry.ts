/**
 * Token Registry & Conversion Mapping
 * 
 * SAIB token recognition system for:
 * - TriumphSynergy (TRISYN) tokens across all chains
 * - Pi Network tokens and representations
 * - Stablecoins used for bridging
 */

/**
 * Token metadata including address, decimals, and supported chains
 */
export const TOKEN_REGISTRY = {
  // TriumphSynergy Ecosystem Token
  TRISYN: {
    symbol: "TRISYN",
    name: "TriumphSynergy Ecosystem Token",
    decimals: 18,
    addresses: {
      // Base chain (primary)
      "8453": "0x0000000000000000000000000000000000000001",
      // Ethereum (if bridged)
      "1": "0x0000000000000000000000000000000000000002",
      // Optimism
      "10": "0x0000000000000000000000000000000000000003",
      // Polygon
      "137": "0x0000000000000000000000000000000000000004",
      // BSC
      "56": "0x0000000000000000000000000000000000000005",
      // Arbitrum
      "42161": "0x0000000000000000000000000000000000000006",
    },
    isEcosystemToken: true,
    priority: "CRITICAL", // Always accept and convert
  },

  // Pi Network (on-chain representations)
  PI_MAINNET: {
    symbol: "PI",
    name: "Pi Network Mainnet Token",
    decimals: 8,
    addresses: {
      // Stellar chain (native Pi settlement)
      "stellar": "GATQQ5EJFVJ35VHVBG7HSPVTZRVHV6Y3QLMZ3QKJIPQPWBV5MJVZ3T",
      // Base (wrapped Pi)
      "8453": "0x0000000000000000000000000000000000000100",
      // Ethereum (wrapped Pi)
      "1": "0x0000000000000000000000000000000000000101",
      // Optimism (wrapped Pi)
      "10": "0x0000000000000000000000000000000000000102",
    },
    isEcosystemToken: true,
    priority: "HIGH", // Accept Pi, enable conversion
  },

  // Stablecoins for bridging (accepted for conversion)
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    addresses: {
      "1": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "10": "0x0b2C639c533813f4Aa9D7837CAf62653d53F5FB8",
      "56": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      "137": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      "8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "42161": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
    isStablecoin: true,
  },

  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      "1": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "56": "0x55d398326f99059fF775485246999027B3197955",
      "137": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      "42161": "0xFd086bC7CD5C481DCC9C85Efe8d8EFF57b8486e0",
    },
    isStablecoin: true,
  },

  DAI: {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    addresses: {
      "1": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "10": "0xDA10009CBD5D07dd0CeCc66161FC93D7c9000da1",
      "137": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023D60d76541",
      "8453": "0x50c5725949A6F0c72E6C4a641F14122319047f17",
      "42161": "0xDA10009CBD5D07dd0CeCc66161FC93D7c9000da1",
    },
    isStablecoin: true,
  },
};

/**
 * Conversion paths defining how to convert between tokens
 * Priority order: direct swap > bridge > multi-hop
 */
export const CONVERSION_PATHS = {
  // TriSyn Conversions
  "TRISYN→PI": {
    sourceToken: "TRISYN",
    targetToken: "PI_MAINNET",
    primaryPath: "direct_dex", // Use 1inch/0x directly
    fallbackPath: "via_stablecoin", // Convert to USDC then to Pi
    bridgeSupported: true,
  },

  "PI→TRISYN": {
    sourceToken: "PI_MAINNET",
    targetToken: "TRISYN",
    primaryPath: "direct_dex",
    fallbackPath: "via_stablecoin",
    bridgeSupported: true,
  },

  // Stablecoin to TriSyn
  "USDC→TRISYN": {
    sourceToken: "USDC",
    targetToken: "TRISYN",
    primaryPath: "direct_dex",
    fallbackPath: "manual_treasury",
  },

  "USDT→TRISYN": {
    sourceToken: "USDT",
    targetToken: "TRISYN",
    primaryPath: "direct_dex",
    fallbackPath: "manual_treasury",
  },

  "DAI→TRISYN": {
    sourceToken: "DAI",
    targetToken: "TRISYN",
    primaryPath: "direct_dex",
    fallbackPath: "manual_treasury",
  },

  // Stablecoin to Pi
  "USDC→PI": {
    sourceToken: "USDC",
    targetToken: "PI_MAINNET",
    primaryPath: "stellar_payment_processor",
  },

  "USDT→PI": {
    sourceToken: "USDT",
    targetToken: "PI_MAINNET",
    primaryPath: "stellar_payment_processor",
  },

  "DAI→PI": {
    sourceToken: "DAI",
    targetToken: "PI_MAINNET",
    primaryPath: "stellar_payment_processor",
  },
};

/**
 * Lookup token metadata by address
 */
export function resolveTokenByAddress(chainId, address) {
  for (const [tokenKey, tokenMeta] of Object.entries(TOKEN_REGISTRY)) {
    const tokenAddresses = tokenMeta.addresses || {};
    if (tokenAddresses[chainId]?.toLowerCase() === address.toLowerCase()) {
      return { symbol: tokenKey, ...tokenMeta };
    }
  }
  return null;
}

/**
 * Lookup token metadata by symbol
 */
export function resolveTokenBySymbol(symbol) {
  return TOKEN_REGISTRY[symbol.toUpperCase()] || null;
}

/**
 * Get conversion path between two tokens
 */
export function getConversionPath(sourceSymbol, targetSymbol) {
  const pathKey = `${sourceSymbol}→${targetSymbol}`;
  return CONVERSION_PATHS[pathKey] || null;
}

/**
 * Check if token is part of Triumph Synergy ecosystem
 */
export function isEcosystemToken(tokenOrSymbol) {
  const token = typeof tokenOrSymbol === "string"
    ? resolveTokenBySymbol(tokenOrSymbol)
    : tokenOrSymbol;
  return token?.isEcosystemToken === true;
}

/**
 * Check if token is an accepted stablecoin
 */
export function isStablecoin(tokenOrSymbol) {
  const token = typeof tokenOrSymbol === "string"
    ? resolveTokenBySymbol(tokenOrSymbol)
    : tokenOrSymbol;
  return token?.isStablecoin === true;
}

/**
 * Get token decimals for amount normalization
 */
export function getTokenDecimals(chainId, addressOrSymbol) {
  let token;

  if (addressOrSymbol.startsWith("0x")) {
    token = resolveTokenByAddress(chainId, addressOrSymbol);
  } else {
    token = resolveTokenBySymbol(addressOrSymbol);
  }

  return token?.decimals || 18; // Default to 18 if unknown
}

/**
 * Normalize amount to token decimals
 */
export function normalizeAmount(rawAmount, decimals) {
  const divisor = Math.pow(10, decimals);
  return BigInt(rawAmount) / BigInt(divisor);
}

/**
 * Denormalize amount from token decimals
 */
export function denormalizeAmount(normalizedAmount, decimals) {
  const multiplier = Math.pow(10, decimals);
  return BigInt(normalizedAmount) * BigInt(multiplier);
}

/**
 * Check if conversion is supported
 */
export function isConversionSupported(sourceSymbol, targetSymbol) {
  const path = getConversionPath(sourceSymbol, targetSymbol);
  return path !== null;
}

/**
 * Get all supported target tokens for a source token
 */
export function getSupportedConversions(sourceSymbol) {
  return Object.keys(CONVERSION_PATHS)
    .filter((pathKey) => pathKey.startsWith(`${sourceSymbol}→`))
    .map((pathKey) => pathKey.split("→")[1]);
}
