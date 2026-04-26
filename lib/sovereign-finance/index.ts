/**
 * @fileoverview Sovereign Finance — Barrel Export
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Pi Network + Triumph Synergy: the sovereign financial layer the world attaches to.
 */

// Universal Integration Gateway
export {
  UniversalGateway,
  GATEWAY_PROTOCOL_VERSION,
  PI_EXTERNAL_VALUE_USD,
  PI_INTERNAL_VALUE_USD,
  PI_VALUE_MULTIPLIER,
  MAX_DAILY_SETTLEMENT_PI,
  type ConnectorTier,
  type ConnectorStatus,
  type SettlementCurrency,
  type GatewayConnector,
  type SettlementRequest,
  type SettlementResult,
  type ExchangeRate,
} from "./universal-gateway";

// Global Reserve Protocol
export {
  GlobalReserveProtocol,
  REAL_WORLD_UTILITY_SECTORS,
  type UtilitySector,
  type ReserveStatus,
  type CurrencyProfile,
  type RealWorldUtilityMetrics,
  type ReserveSnapshot,
} from "./global-reserve-protocol";

// Interoperability Bridge
export {
  InteroperabilityBridge,
  type BridgeNetwork,
  type BridgeDirection,
  type BridgeStatus,
  type BridgeConfig,
  type BridgeTransaction,
} from "./interoperability-bridge";

// Sovereign Citizen Engine — Pi KYC → Queen/King auto-elevation
export {
  SovereignCitizenEngine,
  SOVEREIGN_TITLE_MALE,
  SOVEREIGN_TITLE_FEMALE,
  SOVEREIGN_TITLE_NEUTRAL,
  SOVEREIGNTY_MULTIPLIER,
  SOVEREIGN_PI_RATE,
  SOVEREIGN_PROSPERITY_BASE,
  type SovereignTitle,
  type SovereignTier,
  type OwnershipClass,
  type SovereignIdentity,
  type SovereignRights,
  type SovereignBenefits,
  type SovereignOwnership,
} from "./sovereign-citizen-engine";
