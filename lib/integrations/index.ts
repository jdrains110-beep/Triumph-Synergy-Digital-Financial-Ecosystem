/**
 * Triumph Synergy - Integrations Module Index
 *
 * Unified financial integration hub exports
 * 
 * Powered by:
 * - Pi Network Blockchain
 * - Chainlink Oracle Network
 * - Stellar Consensus Protocol
 * - Enterprise Infrastructure
 */

export {
  type FinancialDashboard,
  // Hub
  FinancialIntegrationHub,
  financialHub,
  getDashboard,
  type KYCStatus,
  // Functions
  onboardNewUser,
  processDistributions,
  type TransactionSource,
  type TransactionType,
  type TriumphFeatures,
  // Types
  type TriumphUser,
  type UnifiedTransaction,
} from "./financial-hub";

// ============================================================================
// CHAINLINK ORACLE INTEGRATION
// ============================================================================

export {
  // Price Feeds
  type ChainlinkPriceFeed,
  type PriceFeedConfig,
  CHAINLINK_PRICE_FEEDS,
  getChainlinkPrice,
  getChainlinkPrices,
  // VRF (Verifiable Randomness)
  type VRFRequestConfig,
  type VRFRandomness,
  CHAINLINK_VRF_CONFIG,
  requestChainlinkVRF,
  getVRFRandomness,
  // Chainlink Automation (Keepers)
  type AutomationRegistration,
  CHAINLINK_AUTOMATIONS,
  registerChainlinkAutomation,
  checkAutomationUpkeep,
  // CCIP (Cross-Chain)
  type CrossChainMessage,
  sendCrossChainMessage,
  receiveCrossChainMessage,
  // Trust & Health
  type ChainlinkTrustMetrics,
  CHAINLINK_TRUST_METRICS,
  getChainlinkTrustMetrics,
  checkChainlinkHealth,
  // Initialization
  initializeChainlinkIntegration,
  CHAINLINK_INTEGRATION_SUMMARY,
} from "./chainlink-oracle";
