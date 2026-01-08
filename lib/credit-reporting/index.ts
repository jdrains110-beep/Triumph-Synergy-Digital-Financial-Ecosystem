/**
 * Triumph Synergy - Credit Reporting Module Index
 *
 * Credit bureau integration and reporting system exports
 */

export {
  type AccountStatus,
  type AccountType,
  type Address,
  type AlertType,
  type CollectionAccount,
  type ConsumerInfo,
  type CreditAlert,
  // Types
  type CreditBureau,
  // Engine
  CreditBureauIntegration,
  type CreditInquiry,
  type CreditReport,
  type CreditReportingPayload,
  type CreditSummary,
  creditBureauEngine,
  type DisputeReason,
  type DisputeRequest,
  type DisputeStatus,
  disputeCreditItem,
  type Employer,
  type PaymentHistoryEntry,
  type PiNetworkCreditActivity,
  type PositivePaymentData,
  type PublicRecord,
  // Functions
  pullCreditReports,
  reportPaymentToBureaus,
  reportPiPayments,
  type ScoreModel,
  type Tradeline,
} from "./credit-bureau-integration";
