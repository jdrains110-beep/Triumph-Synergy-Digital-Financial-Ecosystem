/**
 * Pi-Nexus Autonomous Banking Network
 * 
 * Integration module for Kosasih's pi-nexus-autonomous-banking-network
 * 
 * This module provides seamless integration of Pi-Nexus smart contracts
 * while maintaining their integrity and respecting their licenses.
 * 
 * @module lib/smart-contracts/external/pi-nexus-autonomous-banking-network
 * @version 1.0.0
 */

export * from "./config";
export * from "./integration";
export {
  piNexusIntegration,
  loadPiNexusContract,
  loadAllPiNexusContracts,
  getPiNexusDeploymentInstructions,
  getPiNexusIntegrationStatus,
} from "./integration";
