/**
 * @fileoverview Web3 Core — Unified decentralized infrastructure layer
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Provides: Pi Stellar wallet operations, on-chain identity, decentralized
 * message signing/verification, DID (Decentralized Identifier) primitives,
 * and cross-service Web3 context for the entire Triumph Synergy ecosystem.
 */

export { Web3Provider, useWeb3, type Web3Context } from "./web3-provider";
export { StellarWallet, type WalletState } from "./stellar-wallet";
export { Web3Auth, type Web3Session } from "./web3-auth";
export { DecentralizedIdentity, type DID } from "./did";
export { OnChainVerifier } from "./on-chain-verifier";
export { Web3MessageBus, type Web3Event } from "./message-bus";
export {
  DecentralizedStorage,
  deriveContentID,
  type ContentID,
  type StoredObject,
} from "./decentralized-storage";
