/**
 * Travel Rule — FATF Recommendation 16 implementation using IVMS-101 v1.1.1
 * payload format. Two transport adapters: TRP (Travel Rule Protocol — synchronous
 * REST) and openVASP (async signed messages). Mock adapter for tests.
 *
 * Refs:
 *   IVMS-101 schema: https://intervasp.org/wp-content/uploads/2020/05/IVMS101-interVASP-data-model-standard-issue-1-FINAL.pdf
 *   TRP spec:        https://www.travelruleprotocol.org/
 *   openVASP spec:   https://www.openvasp.org/
 */

import crypto from "node:crypto";

// ─── IVMS-101 minimal types ──────────────────────────────────────────────────

export interface IvmsNaturalPerson {
  naturalPersonName: {
    nameIdentifier: Array<{
      primaryIdentifier: string;
      secondaryIdentifier?: string;
      nameIdentifierType: "LEGL" | "BIRT" | "MAID" | "MISC";
    }>;
  };
  geographicAddress?: Array<{
    addressType: "HOME" | "BIZZ" | "GEOG";
    townName?: string;
    country?: string; // ISO-3166-1 alpha-2
    addressLine?: string[];
  }>;
  nationalIdentification?: {
    nationalIdentifier: string;
    nationalIdentifierType: "ARNU" | "CCPT" | "RAID" | "DRLC" | "FIIN" | "TXID" | "SOCS" | "IDCD" | "LEIX" | "MISC";
    countryOfIssue?: string;
  };
  dateAndPlaceOfBirth?: { dateOfBirth: string; placeOfBirth?: string };
  countryOfResidence?: string;
}

export interface IvmsLegalPerson {
  legalPersonName: {
    nameIdentifier: Array<{
      legalPersonName: string;
      legalPersonNameIdentifierType: "LEGL" | "SHRT" | "TRAD";
    }>;
  };
  geographicAddress?: IvmsNaturalPerson["geographicAddress"];
  nationalIdentification?: { nationalIdentifier: string; nationalIdentifierType: "LEIX" | "RAID" | "MISC"; countryOfIssue?: string };
  countryOfRegistration?: string;
}

export interface IvmsVasp {
  name: string;
  /** Legal Entity Identifier (ISO-17442) — preferred. */
  lei?: string;
  /** Bech32 address used for openVASP discovery. */
  vaspIdentifier?: string;
  country?: string;
}

export interface IvmsTransaction {
  originatingVASP: IvmsVasp;
  beneficiaryVASP: IvmsVasp;
  originator: { person: IvmsNaturalPerson | IvmsLegalPerson; accountNumber: string[] };
  beneficiary: { person: IvmsNaturalPerson | IvmsLegalPerson; accountNumber: string[] };
  transaction: {
    amount: string;
    assetType: string; // e.g. "BTC" | "TRISYN" | "PI"
    transactionIdentifier?: string;
    dateTimeOfTransaction?: string;
    network?: string; // mainnet | testnet | stellar | …
  };
}

// ─── Threshold ───────────────────────────────────────────────────────────────

/**
 * FATF default trigger is USD/EUR 1,000. Per-jurisdiction overrides via env:
 *   TRAVEL_RULE_THRESHOLD_DEFAULT=1000
 *   TRAVEL_RULE_THRESHOLD_CH=0
 *   TRAVEL_RULE_THRESHOLD_US=3000
 */
export function travelRuleThreshold(jurisdiction?: string): number {
  if (jurisdiction) {
    const v = process.env[`TRAVEL_RULE_THRESHOLD_${jurisdiction.toUpperCase()}`];
    if (v !== undefined) return Number(v);
  }
  return Number(process.env.TRAVEL_RULE_THRESHOLD_DEFAULT || "1000");
}

export interface TravelRuleApplicabilityInput {
  amountUsd: number;
  originatorJurisdiction?: string;
  beneficiaryJurisdiction?: string;
}

export function isTravelRuleApplicable(input: TravelRuleApplicabilityInput): {
  applies: boolean;
  threshold: number;
  jurisdiction: string;
} {
  const j =
    input.originatorJurisdiction?.toUpperCase() ||
    input.beneficiaryJurisdiction?.toUpperCase() ||
    "DEFAULT";
  const threshold = Math.min(
    travelRuleThreshold(input.originatorJurisdiction),
    travelRuleThreshold(input.beneficiaryJurisdiction),
  );
  return { applies: input.amountUsd >= threshold, threshold, jurisdiction: j };
}

// ─── Envelope (signed transport-agnostic message) ────────────────────────────

export interface TravelRuleEnvelope {
  id: string;
  /** ISO-8601 */
  createdAt: string;
  protocol: "TRP" | "OPENVASP" | "MOCK";
  originatorVaspId: string;
  beneficiaryVaspId: string;
  payload: IvmsTransaction;
  /** ECDSA / Ed25519 signature over canonical JSON of payload, hex. */
  signature?: string;
  algorithm?: "ed25519" | "ecdsa-p256" | "none";
}

function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((obj as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function signEnvelope(env: TravelRuleEnvelope, privateKeyPem: string): TravelRuleEnvelope {
  const data = canonical(env.payload);
  const sig = crypto.sign(null, Buffer.from(data), crypto.createPrivateKey(privateKeyPem)).toString("hex");
  return { ...env, signature: sig, algorithm: "ed25519" };
}

export function verifyEnvelope(env: TravelRuleEnvelope, publicKeyPem: string): boolean {
  if (!env.signature) return false;
  const data = canonical(env.payload);
  try {
    return crypto.verify(
      null,
      Buffer.from(data),
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(env.signature, "hex"),
    );
  } catch {
    return false;
  }
}

// ─── Transport adapter interface ─────────────────────────────────────────────

export interface TravelRuleTransport {
  name: "TRP" | "OPENVASP" | "MOCK";
  /** Send an envelope to the beneficiary VASP. Returns the remote receipt id. */
  send(env: TravelRuleEnvelope, beneficiaryEndpoint: string): Promise<{ receiptId: string }>;
  /** Resolve a beneficiary VASP endpoint by their identifier (LEI / openVASP id / inbox URL). */
  discover(beneficiaryVaspId: string): Promise<string | null>;
}

// ─── Mock transport (in-memory inbox; for tests & local dev) ─────────────────

const mockInbox: TravelRuleEnvelope[] = [];

export const mockTravelRuleTransport: TravelRuleTransport = {
  name: "MOCK",
  async send(env) {
    mockInbox.push(env);
    return { receiptId: `mock-${env.id}` };
  },
  async discover() {
    return "mock://inbox";
  },
};

export function _peekMockInbox(): TravelRuleEnvelope[] {
  return mockInbox.slice();
}

// ─── TRP transport (HTTP POST JSON to beneficiary inbox) ─────────────────────

export const trpTransport: TravelRuleTransport = {
  name: "TRP",
  async send(env, beneficiaryEndpoint) {
    const resp = await fetch(beneficiaryEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-TRP-Version": "3.0.0" },
      body: JSON.stringify(env),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`TRP ${resp.status} ${await resp.text()}`);
    const data = (await resp.json()) as { receiptId?: string };
    return { receiptId: data.receiptId ?? env.id };
  },
  async discover(beneficiaryVaspId) {
    // Static directory lookup via env: TRP_DIRECTORY=<json map of vaspId→endpoint>
    const dir = process.env.TRP_DIRECTORY;
    if (!dir) return null;
    try {
      const map = JSON.parse(dir) as Record<string, string>;
      return map[beneficiaryVaspId] ?? null;
    } catch {
      return null;
    }
  },
};

// ─── Orchestrator ────────────────────────────────────────────────────────────

function pickTransport(): TravelRuleTransport {
  const t = (process.env.TRAVEL_RULE_TRANSPORT || "mock").toLowerCase();
  if (t === "trp") return trpTransport;
  return mockTravelRuleTransport;
}

export interface TravelRuleSubmitInput {
  payload: IvmsTransaction;
  beneficiaryVaspId: string;
  beneficiaryEndpoint?: string; // override directory lookup
  privateKeyPem?: string;
}

export async function submitTravelRule(input: TravelRuleSubmitInput): Promise<{
  envelope: TravelRuleEnvelope;
  receiptId: string;
  transport: string;
}> {
  const transport = pickTransport();
  const endpoint =
    input.beneficiaryEndpoint ?? (await transport.discover(input.beneficiaryVaspId));
  if (!endpoint) {
    throw new Error(`travel-rule: no endpoint for beneficiary ${input.beneficiaryVaspId}`);
  }
  let env: TravelRuleEnvelope = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    protocol: transport.name,
    originatorVaspId: input.payload.originatingVASP.lei || input.payload.originatingVASP.vaspIdentifier || "self",
    beneficiaryVaspId: input.beneficiaryVaspId,
    payload: input.payload,
    algorithm: "none",
  };
  const key = input.privateKeyPem || process.env.TRAVEL_RULE_PRIVATE_KEY;
  if (key) env = signEnvelope(env, key);
  const { receiptId } = await transport.send(env, endpoint);
  return { envelope: env, receiptId, transport: transport.name };
}
