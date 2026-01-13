/**
 * External Smart Contracts Index
 * 
 * Central registry for all external smart contracts integrated into Triumph-Synergy
 * 
 * @module lib/smart-contracts/external
 */

/**
 * External contract repositories available in Triumph-Synergy
 */
export const EXTERNAL_REPOSITORIES = {
  KOSASIH_PI_SUPERNODE: 'kosasih/pi-supernode',
} as const;

/**
 * Contract names for quick reference
 */
export const EXTERNAL_CONTRACTS = {
  PI_COIN: 'PiCoin',
  GOVERNANCE: 'Governance',
  STABLE_COIN: 'StableCoin',
  WRAPPED_PI_TOKEN: 'WrappedPiToken',
  MIGRATIONS: 'Migrations',
} as const;

/**
 * Get the full path to an external contract
 */
export function getExternalContractPath(
  repository: string,
  contractName: string
): string {
  return `lib/smart-contracts/external/${repository}/contracts/${contractName}.sol`;
}

/**
 * Get the repository path
 */
export function getRepositoryPath(repository: string): string {
  return `lib/smart-contracts/external/${repository}`;
}
