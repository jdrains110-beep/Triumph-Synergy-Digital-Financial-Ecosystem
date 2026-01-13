/**
 * Pi Stable Revoluter Core - Type Definitions
 * 
 * TypeScript types for the Pi Stable Revoluter Core smart contracts
 * integrated into the Triumph-Synergy ecosystem.
 * 
 * @module lib/smart-contracts/pi-stable-revoluter-core/types
 * @version 1.0.0
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type Address = string;
export type BigNumber = string | number;
export type TransactionHash = string;

// ============================================================================
// STABLECOIN TYPES
// ============================================================================

export interface StableCoinConfig {
  name: string;
  symbol: string;
  initialSupply: BigNumber;
  feeRecipient: Address;
  transactionFee: number; // Percentage (0-100)
}

export interface StableCoinState {
  totalSupply: BigNumber;
  transactionFee: number;
  feeRecipient: Address;
  isPaused: boolean;
  currentSnapshotId: number;
}

export interface TransferResult {
  success: boolean;
  txHash: TransactionHash;
  from: Address;
  to: Address;
  amount: BigNumber;
  fee: BigNumber;
}

// ============================================================================
// RESERVE MANAGER TYPES
// ============================================================================

export interface Reserve {
  asset: Address;
  amount: BigNumber;
  ratio: number;
}

export interface ReserveManagerState {
  totalReserves: BigNumber;
  reserves: Reserve[];
  reserveCount: number;
}

export interface AddReserveParams {
  asset: Address;
  amount: BigNumber;
  ratio: number;
}

export interface RemoveReserveParams {
  asset: Address;
  amount: BigNumber;
}

// ============================================================================
// GOVERNANCE TYPES
// ============================================================================

export enum ProposalStatus {
  Pending = 0,
  Active = 1,
  Executed = 2,
  Canceled = 3,
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  endTime: Date;
  status: ProposalStatus;
  proposer: Address;
}

export interface GovernanceState {
  proposalCount: number;
  quorum: number;
  proposals: Proposal[];
}

export interface CreateProposalParams {
  title: string;
  description: string;
}

export interface VoteParams {
  proposalId: number;
  support: boolean;
}

// ============================================================================
// CONTRACT INTERACTION TYPES
// ============================================================================

export interface ContractCall<T = any> {
  method: string;
  params: any[];
  result?: T;
  error?: Error;
}

export interface ContractTransaction {
  txHash: TransactionHash;
  blockNumber: number;
  timestamp: Date;
  gasUsed: BigNumber;
  status: "pending" | "success" | "failed";
}

export interface DeploymentConfig {
  network: "pi-mainnet" | "pi-testnet" | "ethereum-mainnet" | "ethereum-sepolia";
  deployer: Address;
  gasLimit?: BigNumber;
  gasPrice?: BigNumber;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface StableCoinEvent {
  type: "Transfer" | "FeeRecipientChanged" | "TransactionFeeChanged" | "Paused" | "Unpaused";
  data: Record<string, any>;
  blockNumber: number;
  transactionHash: TransactionHash;
}

export interface ReserveManagerEvent {
  type: "ReserveAdded" | "ReserveRemoved" | "ReserveRatioUpdated" | "EmergencyWithdrawal";
  data: Record<string, any>;
  blockNumber: number;
  transactionHash: TransactionHash;
}

export interface GovernanceEvent {
  type: "ProposalCreated" | "Voted" | "ProposalExecuted" | "ProposalCanceled" | "QuorumChanged";
  data: Record<string, any>;
  blockNumber: number;
  transactionHash: TransactionHash;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export interface PiStableRevoluterCore {
  stableCoin: {
    address: Address | null;
    config: StableCoinConfig;
    state: StableCoinState | null;
  };
  reserveManager: {
    address: Address | null;
    state: ReserveManagerState | null;
  };
  governance: {
    address: Address | null;
    state: GovernanceState | null;
  };
  deployment: {
    network: string;
    deployedAt: Date | null;
    version: string;
  };
}

export interface ContractMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository: string;
  tags: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface ContractCallResponse<T = any> extends ApiResponse<T> {
  gasEstimate?: BigNumber;
  txHash?: TransactionHash;
}
