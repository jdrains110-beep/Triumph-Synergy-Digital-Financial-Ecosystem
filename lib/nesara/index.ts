/**
 * Triumph Synergy - NESARA Module Index
 *
 * NESARA/GESARA compliance and benefit system exports
 * Enhanced for superior NESARA/GESARA implementation
 */

// =============================================================================
// CORE NESARA/GESARA ENGINE
// =============================================================================
export {
  type AssetBackedAccount,
  activateProsperity,
  type BirthCertificateBondRecord,
  type ComplianceEvent,
  checkGESARACompliance,
  type DebtForgivenessRecord,
  type DistributionScheduleEntry,
  type GESARACountryStatus,
  NESARAGESARAEngine,
  type NESARAProfile,
  type NESARAStatus,
  nesaraEngine,
  type ProsperityFundsRecord,
  processDebtForgiveness,
  registerNESARA,
  submitDebtForgiveness,
  type TaxReformRecord,
} from "./nesara-gesara-system";

// =============================================================================
// QUANTUM FINANCIAL SYSTEM
// =============================================================================
export {
  type QFSAccount,
  type QFSAccountType,
  type QFSCurrency,
  type QFSLedgerEntry,
  type QFSTransaction,
  type QFSTransactionType,
  QuantumFinancialSystem,
  qfs,
} from "./quantum-financial-system";

// =============================================================================
// BIRTH CERTIFICATE BONDS
// =============================================================================
export {
  type BirthCertificateBond,
  BirthCertificateBondSystem,
  birthBondSystem,
  type BondStatus,
  calculateBondValue,
  type RedemptionRequest,
  type RedemptionStatus,
} from "./birth-certificate-bonds";

// =============================================================================
// GESARA GLOBAL COMPLIANCE
// =============================================================================
export {
  type ComplianceStatus,
  type CountryCompliance,
  type CurrencyStatus,
  gesaraCompliance,
  GESARAGlobalCompliance,
  type GESARAPhase,
  type GlobalStats,
  type TreatyRecord,
} from "./gesara-global-compliance";

// =============================================================================
// RESTITUTION SYSTEM
// =============================================================================
export {
  type ClaimStatus,
  restitutionSystem,
  type RestitutionCategory,
  type RestitutionClaim,
  type RestitutionEstimate,
  type RestitutionProfile,
  RestitutionSystem,
} from "./restitution-system";
