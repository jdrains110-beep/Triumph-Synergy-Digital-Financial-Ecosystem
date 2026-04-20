/**
 * @fileoverview Sovereign Finance — Barrel Export
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
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
