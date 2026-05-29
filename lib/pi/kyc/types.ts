/**
 * KYC/KYB Provider Adapter — interface every provider must implement.
 *
 * Switch providers via env: KYC_PROVIDER=mock|sumsub|onfido|veriff|persona.
 * All adapters are pluggable behind this surface so app code never imports
 * a vendor SDK directly.
 */

export type KycLevel =
  | "unverified"
  | "phone"            // Pi Network phone verification
  | "basic"            // government ID + selfie liveness
  | "enhanced"         // + proof-of-address + source-of-funds
  | "institutional";   // + accredited investor / qualified purchaser

export type KycStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "expired";

export interface KycSubject {
  /** External user id (Pi uid, internal user uuid, etc.) */
  externalId: string;
  email?: string;
  phone?: string;
  countryCode?: string; // ISO-3166-1 alpha-2
  fullName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
}

export interface KybSubject {
  externalId: string;
  legalName: string;
  registrationNumber: string;
  jurisdiction: string; // ISO-3166-1 alpha-2
  registeredAddress?: string;
  beneficialOwners?: Array<{
    fullName: string;
    dateOfBirth?: string;
    ownershipPct?: number;
    isPep?: boolean;
  }>;
  directors?: Array<{ fullName: string; nationality?: string }>;
}

export interface KycStartResult {
  applicationId: string;
  status: KycStatus;
  /** URL or token the client redirects to (provider-hosted flow). null for fully server-side flows. */
  redirectUrl: string | null;
  /** Short-lived token for embedded SDK widget (Sumsub websdk, Onfido sdkToken, etc.). */
  sdkToken: string | null;
  expectedLevel: KycLevel;
  provider: string;
}

export interface KycResult {
  applicationId: string;
  externalId: string;
  status: KycStatus;
  level: KycLevel;
  riskScore: number; // 0-100, 100 = highest risk
  reasons: string[];
  reviewedAt: string | null;
  expiresAt: string | null;
  /** Raw provider payload (for audit). */
  raw?: unknown;
}

export interface KycWebhookEvent {
  applicationId: string;
  externalId: string;
  status: KycStatus;
  level: KycLevel;
  riskScore: number;
  reasons: string[];
  raw: unknown;
}

export interface KycProvider {
  name: string;

  /** Start a KYC flow for an individual. */
  startKyc(
    subject: KycSubject,
    opts?: { requestedLevel?: KycLevel },
  ): Promise<KycStartResult>;

  /** Start a KYB flow for a business. */
  startKyb(
    subject: KybSubject,
    opts?: { requestedLevel?: KycLevel },
  ): Promise<KycStartResult>;

  /** Fetch current status from the provider. */
  getStatus(applicationId: string): Promise<KycResult | null>;

  /** Parse a provider webhook into a normalized event. Throws if signature invalid. */
  parseWebhook(
    body: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<KycWebhookEvent>;
}
