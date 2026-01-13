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
	// Chainlink Automation (Keepers)
	type AutomationRegistration,
	CHAINLINK_AUTOMATIONS,
	CHAINLINK_INTEGRATION_SUMMARY,
	CHAINLINK_PRICE_FEEDS,
	CHAINLINK_TRUST_METRICS,
	CHAINLINK_VRF_CONFIG,
	// Price Feeds
	type ChainlinkPriceFeed,
	// Trust & Health
	type ChainlinkTrustMetrics,
	// CCIP (Cross-Chain)
	type CrossChainMessage,
	checkAutomationUpkeep,
	checkChainlinkHealth,
	getChainlinkPrice,
	getChainlinkPrices,
	getChainlinkTrustMetrics,
	getVRFRandomness,
	// Initialization
	initializeChainlinkIntegration,
	type PriceFeedConfig,
	receiveCrossChainMessage,
	registerChainlinkAutomation,
	requestChainlinkVRF,
	sendCrossChainMessage,
	type VRFRandomness,
	// VRF (Verifiable Randomness)
	type VRFRequestConfig,
} from "./chainlink-oracle";
