/**
 * Stellar Integration Index
 * 
 * Unified exports for:
 * - SCP Auto-Update: Automatic Stellar Consensus Protocol synchronization
 * - Stellar Pi Coin SDK: Bridge between Pi Network and Stellar blockchain
 * - Smart Contract Integration: Full contract lifecycle with payments
 */

// SCP Auto-Update
export {
  SCPAutoUpdate,
  getSCPAutoUpdate,
  initializeSCPAutoUpdate,
  createSCPSmartContractBinding,
  type SCPState,
  type SCPUpdateEvent,
  type ValidatorInfo,
} from "./scp-auto-update";

// Stellar Pi Coin SDK
export {
  StellarPiCoinSDK,
  getStellarPiCoinSDK,
  type PiCoinConfig,
  type PiPaymentProof,
  type StellarPaymentResult,
  type SmartContractPayment,
  type PaymentCondition,
  type EscrowState,
} from "./stellar-pi-coin-sdk";

// Smart Contract Integration
export {
  SmartContractManager,
  getSmartContractManager,
  initializeSmartContractSystem,
  type SmartContractConfig,
  type ContractExecutionResult,
  type ContractPaymentStatus,
} from "./smart-contract-integration";

/**
 * Initialize all Stellar integrations
 * Call during application startup
 */
export async function initializeStellarIntegration(): Promise<{
  scp: import("./scp-auto-update").SCPAutoUpdate;
  piCoinSdk: import("./stellar-pi-coin-sdk").StellarPiCoinSDK;
  contractManager: import("./smart-contract-integration").SmartContractManager;
}> {
  const { initializeSCPAutoUpdate } = await import("./scp-auto-update");
  const { getStellarPiCoinSDK } = await import("./stellar-pi-coin-sdk");
  const { initializeSmartContractSystem } = await import("./smart-contract-integration");

  const scp = await initializeSCPAutoUpdate();
  const piCoinSdk = getStellarPiCoinSDK();
  const contractManager = await initializeSmartContractSystem();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("   STELLAR INTEGRATION INITIALIZED");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("   ✅ SCP Auto-Update: Active");
  console.log("   ✅ Pi Coin SDK: Ready");
  console.log("   ✅ Smart Contracts: Ready");
  console.log(`   📊 Current Ledger: ${scp.getState()?.latestLedger || "Syncing..."}`);
  console.log("═══════════════════════════════════════════════════════════════");

  return { scp, piCoinSdk, contractManager };
}
