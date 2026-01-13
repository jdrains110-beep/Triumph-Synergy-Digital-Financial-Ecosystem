/**
 * Pi Stable Revoluter Core - Configuration
 * 
 * Configuration settings for the Pi Stable Revoluter Core integration
 * 
 * @module lib/smart-contracts/pi-stable-revoluter-core/config
 */

export const PI_STABLE_CONFIG = {
  // Network configurations
  networks: {
    "pi-mainnet": {
      name: "Pi Network Mainnet",
      chainId: 314159, // Pi Network chain ID
      rpcUrl: process.env.PI_MAINNET_RPC_URL || "https://rpc.pi.network",
      explorerUrl: "https://explorer.pi.network",
      contracts: {
        stableCoin: process.env.PI_MAINNET_STABLECOIN_ADDRESS || null,
        reserveManager: process.env.PI_MAINNET_RESERVE_MANAGER_ADDRESS || null,
        governance: process.env.PI_MAINNET_GOVERNANCE_ADDRESS || null,
      },
    },
    "pi-testnet": {
      name: "Pi Network Testnet",
      chainId: 314159265, // Pi Network testnet chain ID
      rpcUrl: process.env.PI_TESTNET_RPC_URL || "https://testnet-rpc.pi.network",
      explorerUrl: "https://testnet-explorer.pi.network",
      contracts: {
        stableCoin: process.env.PI_TESTNET_STABLECOIN_ADDRESS || null,
        reserveManager: process.env.PI_TESTNET_RESERVE_MANAGER_ADDRESS || null,
        governance: process.env.PI_TESTNET_GOVERNANCE_ADDRESS || null,
      },
    },
    "ethereum-mainnet": {
      name: "Ethereum Mainnet",
      chainId: 1,
      rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR-PROJECT-ID",
      explorerUrl: "https://etherscan.io",
      contracts: {
        stableCoin: process.env.ETHEREUM_MAINNET_STABLECOIN_ADDRESS || null,
        reserveManager: process.env.ETHEREUM_MAINNET_RESERVE_MANAGER_ADDRESS || null,
        governance: process.env.ETHEREUM_MAINNET_GOVERNANCE_ADDRESS || null,
      },
    },
    "ethereum-sepolia": {
      name: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR-PROJECT-ID",
      explorerUrl: "https://sepolia.etherscan.io",
      contracts: {
        stableCoin: process.env.ETHEREUM_SEPOLIA_STABLECOIN_ADDRESS || null,
        reserveManager: process.env.ETHEREUM_SEPOLIA_RESERVE_MANAGER_ADDRESS || null,
        governance: process.env.ETHEREUM_SEPOLIA_GOVERNANCE_ADDRESS || null,
      },
    },
  },

  // StableCoin settings
  stableCoin: {
    name: "PiStable",
    symbol: "PST",
    decimals: 18,
    initialSupply: "1000000", // 1 million tokens (before decimals)
    targetPeg: "314159", // Target peg value in USD cents ($314,159)
    defaultTransactionFee: 5, // 5% default fee
    maxTransactionFee: 100, // 100% maximum fee
    minTransactionFee: 0, // 0% minimum fee
  },

  // Reserve Manager settings
  reserveManager: {
    minReserveRatio: 10, // Minimum 10% reserve ratio
    maxReserveRatio: 100, // Maximum 100% reserve ratio
    defaultReserveRatio: 50, // Default 50% reserve ratio
    emergencyWithdrawalDelay: 86400, // 24 hours in seconds
    supportedAssets: [
      {
        name: "Pi Coin",
        symbol: "PI",
        address: process.env.PI_TOKEN_ADDRESS || null,
        defaultRatio: 40,
      },
      {
        name: "Ethereum",
        symbol: "ETH",
        address: "0x0000000000000000000000000000000000000000", // Native ETH
        defaultRatio: 30,
      },
      {
        name: "USD Coin",
        symbol: "USDC",
        address: process.env.USDC_ADDRESS || null,
        defaultRatio: 30,
      },
    ],
  },

  // Governance settings
  governance: {
    defaultQuorum: 51, // 51% quorum required
    votingPeriod: 604800, // 7 days in seconds
    executionDelay: 86400, // 1 day delay before execution
    minVotingPower: "1000000000000000000", // 1 token minimum to vote
    proposalThreshold: "10000000000000000000000", // 10,000 tokens to create proposal
  },

  // Security settings
  security: {
    pauseEnabled: true,
    ownershipTransferDelay: 172800, // 2 days
    emergencyContactAddress: process.env.EMERGENCY_CONTACT_ADDRESS || null,
    multisigRequired: true,
    multisigThreshold: 3, // Require 3 signatures
    multisigSigners: process.env.MULTISIG_SIGNERS?.split(",") || [],
  },

  // Integration settings
  integration: {
    enablePiNexusIntegration: true,
    enablePiSupernodeIntegration: true,
    enableStellarBridge: true,
    enableCrossChainSwaps: false, // Not yet implemented
    enableYieldFarming: false, // Not yet implemented
  },

  // Monitoring and analytics
  monitoring: {
    enableEvents: true,
    enableMetrics: true,
    metricsEndpoint: process.env.METRICS_ENDPOINT || null,
    alertsEnabled: true,
    alertWebhook: process.env.ALERT_WEBHOOK_URL || null,
  },

  // Gas and transaction settings
  gas: {
    defaultGasLimit: "3000000",
    maxGasPrice: "500000000000", // 500 gwei
    defaultGasPrice: "50000000000", // 50 gwei
    priorityFee: "2000000000", // 2 gwei
  },

  // API settings
  api: {
    baseUrl: process.env.PI_STABLE_API_URL || "https://api.triumphsynergy.com/pi-stable",
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  },
} as const;

export type NetworkName = keyof typeof PI_STABLE_CONFIG.networks;

export function getNetworkConfig(network: NetworkName) {
  return PI_STABLE_CONFIG.networks[network];
}

export function getContractAddresses(network: NetworkName) {
  return PI_STABLE_CONFIG.networks[network].contracts;
}

export default PI_STABLE_CONFIG;
