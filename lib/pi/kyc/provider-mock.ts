/**
 * Mock KYC provider — used in dev/test and as the default when KYC_PROVIDER is
 * unset. Persists nothing on its own; the orchestrator handles storage.
 *
 * Decision policy (deterministic per externalId so smoke tests are stable):
 *   - id starts with "reject-" → rejected
 *   - id starts with "review-" → pending_review
 *   - otherwise              → approved (level = requested)
 */

import crypto from "node:crypto";
import type {
  KycProvider,
  KycResult,
  KycStartResult,
  KycSubject,
  KycWebhookEvent,
  KybSubject,
  KycLevel,
} from "./types";

const store = new Map<string, KycResult>();

function decide(externalId: string, level: KycLevel): { status: KycResult["status"]; riskScore: number; reasons: string[] } {
  if (externalId.startsWith("reject-")) {
    return { status: "rejected", riskScore: 95, reasons: ["mock:hard-reject"] };
  }
  if (externalId.startsWith("review-")) {
    return { status: "pending_review", riskScore: 55, reasons: ["mock:manual-review"] };
  }
  const seed = parseInt(crypto.createHash("sha256").update(externalId).digest("hex").slice(0, 2), 16);
  return { status: "approved", riskScore: seed % 30, reasons: [] };
}

function make(applicationId: string, externalId: string, level: KycLevel): KycStartResult {
  const d = decide(externalId, level);
  const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  store.set(applicationId, {
    applicationId,
    externalId,
    status: d.status,
    level,
    riskScore: d.riskScore,
    reasons: d.reasons,
    reviewedAt: d.status === "approved" || d.status === "rejected" ? new Date().toISOString() : null,
    expiresAt,
    raw: { provider: "mock" },
  });
  return {
    applicationId,
    status: d.status,
    redirectUrl: null,
    sdkToken: `mock-sdk-${applicationId}`,
    expectedLevel: level,
    provider: "mock",
  };
}

export const mockKycProvider: KycProvider = {
  name: "mock",

  async startKyc(subject: KycSubject, opts) {
    const id = `mock-kyc-${crypto.randomUUID()}`;
    return make(id, subject.externalId, opts?.requestedLevel ?? "basic");
  },

  async startKyb(subject: KybSubject, opts) {
    const id = `mock-kyb-${crypto.randomUUID()}`;
    return make(id, subject.externalId, opts?.requestedLevel ?? "enhanced");
  },

  async getStatus(applicationId: string) {
    return store.get(applicationId) ?? null;
  },

  async parseWebhook(body): Promise<KycWebhookEvent> {
    const parsed = typeof body === "string" ? JSON.parse(body) : JSON.parse(body.toString("utf8"));
    return {
      applicationId: String(parsed.applicationId ?? ""),
      externalId: String(parsed.externalId ?? ""),
      status: (parsed.status ?? "pending_review") as KycWebhookEvent["status"],
      level: (parsed.level ?? "basic") as KycLevel,
      riskScore: Number(parsed.riskScore ?? 0),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
      raw: parsed,
    };
  },
};
