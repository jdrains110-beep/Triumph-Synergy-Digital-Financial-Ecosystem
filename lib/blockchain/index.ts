/**
 * Blockchain Module Index
 *
 * Exports all blockchain services for the Triumph Synergy ecosystem:
 * - Tokenization Engine: tokenize products and companies
 * - Binding Manager: bind assets to Pi Network's blockchain
 * - Docker Node Bridge: live connectivity to Pi Node in Docker Desktop
 * - Allodial Deeds Connector: bridges deeds platform to tokenization & blockchain
 * - Blockchain Verification: verify transactions and addresses
 * - Pi Network Client: core blockchain interface
 */

// Tokenization Engine — core tokenization and on-chain binding
export {
  tokenizationEngine,
  TokenizationEngine,
  type TokenStandard,
  type TokenizationStatus,
  type AssetCategory,
  type CompanyTokenType,
  type TokenMetadata,
  type BlockchainBinding,
  type TokenizedProduct,
  type TokenizedCompany,
  type ProvenanceRecord,
  type ComplianceData,
  type TokenHolder,
  type TokenTransferRequest,
  type TokenTransferResult,
  type MintRequest,
  type BurnRequest,
} from "./tokenization-engine";

// Binding Manager — orchestrates company onboarding, batch tokenization, supply chain
export {
  blockchainBindingManager,
  BlockchainBindingManager,
  type BindingVerificationResult,
  type BatchTokenizationRequest,
  type BatchTokenizationResult,
  type SupplyChainAnchor,
  type CrossReference,
  type EcosystemStats,
} from "./binding-manager";

// Docker Node Bridge — live connectivity to Pi Node container (testnet2)
export {
  dockerNodeBridge,
  DockerNodeBridge,
  type NodeConnectionMode,
  type NodeHealth,
  type HorizonStatus,
  type StellarCoreStatus,
  type PeerInfo,
  type TransactionSubmission,
  type DockerNodeBridgeConfig,
} from "./docker-node-bridge";

// Allodial Deeds Connector — bridges deeds platform to tokenization & Docker node
export {
  allodialDeedsConnector,
  AllodialDeedsConnector,
  type DeedTokenizationResult,
  type DeedVerificationResult,
  type DeedTransferOnChain,
  type ConnectorStats,
  type DeedTokenMap,
} from "./allodial-deeds-connector";

// Blockchain Verification — transaction & address verification
export {
  PiBlockchainVerification,
  type BlockchainVerification,
  type AddressVerification,
  type TransactionVerification,
  type SmartContractVerification,
} from "./pi-blockchain-verification";

// Pi Network Blockchain Client
export { PiNetworkBlockchain } from "./pi-network-blockchain";
