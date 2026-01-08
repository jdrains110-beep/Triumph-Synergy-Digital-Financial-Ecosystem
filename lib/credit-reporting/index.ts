/**
 * Triumph Synergy - Credit Reporting Module Index
 * 
 * Credit bureau integration and reporting system exports
 */

export {
  // Engine
  CreditBureauIntegration,
  creditBureauEngine,
  
  // Functions
  pullCreditReports,
  reportPaymentToBureaus,
  disputeCreditItem,
  reportPiPayments,
  
  // Types
  type CreditBureau,
  type CreditReport,
  type ScoreModel,
  type Tradeline,
  type AccountType,
  type AccountStatus,
  type PaymentHistoryEntry,
  type DisputeStatus,
  type CreditInquiry,
  type PublicRecord,
  type CollectionAccount,
  type ConsumerInfo,
  type Address,
  type Employer,
  type CreditAlert,
  type AlertType,
  type CreditSummary,
  type CreditReportingPayload,
  type DisputeRequest,
  type DisputeReason,
  type PositivePaymentData,
  type PiNetworkCreditActivity,
} from "./credit-bureau-integration";
