/**
 * Profile & Commerce System
 * 
 * Unified exports for the profile and commerce management systems.
 */

// Profile System
export {
  profileSystem,
  ProfileSystemManager,
  type EntityType,
  type BusinessType,
  type VerificationLevel,
  type ProfileStatus,
  type MerchantCategory,
  type BaseProfile,
  type IndividualProfile,
  type BusinessProfile,
  type MerchantProfile,
  type AnyProfile,
} from "./profile-system";

// Commerce System
export {
  commerceSystem,
  CommerceSystemManager,
  type TransactionType,
  type TransactionStatus,
  type PaymentMethod,
  type DisputeReason,
  type Product,
  type ProductVariant,
  type Service,
  type OrderItem,
  type Order,
  type Invoice,
  type Dispute,
  type EscrowTransaction,
  type Review,
} from "./commerce-system";
