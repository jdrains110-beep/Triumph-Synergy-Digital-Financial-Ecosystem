/**
 * Sumsub provider stub — wire-protocol-correct, real network calls disabled
 * unless SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY are set. Until then, throws
 * a clear error so app code falls back to the mock provider.
 *
 * API reference: https://developers.sumsub.com/api-reference/
 * Webhook signing: HMAC-SHA256(secret, payload) compared to x-payload-digest
 */

import crypto from "node:crypto";
import type {
  KycProvider,
  KycResult,
  KycStartResult,
  KycSubject,
  KybSubject,
  KycLevel,
  KycWebhookEvent,
} from "./types";

const APP_TOKEN = process.env.SUMSUB_APP_TOKEN || "";
const SECRET = process.env.SUMSUB_SECRET_KEY || "";
const BASE = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";

function configured(): boolean {
  return Boolean(APP_TOKEN && SECRET);
}

/** Sumsub request signing — ts + httpMethod + url + body, HMAC-SHA256 hex. */
function sign(method: string, url: string, body: string, ts: number): string {
  const data = `${ts}${method.toUpperCase()}${url}${body}`;
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

async function call(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<unknown> {
  if (!configured()) {
    throw new Error("Sumsub not configured — set SUMSUB_APP_TOKEN + SUMSUB_SECRET_KEY");
  }
  const ts = Math.floor(Date.now() / 1000);
  const payload = body ? JSON.stringify(body) : "";
  const sig = sign(method, path, payload, ts);
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": APP_TOKEN,
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": String(ts),
    },
    body: payload || undefined,
  });
  if (!resp.ok) throw new Error(`Sumsub ${method} ${path} → ${resp.status} ${await resp.text()}`);
  return resp.json();
}

function levelToSumsubLevelName(level: KycLevel): string {
  switch (level) {
    case "phone": return process.env.SUMSUB_LEVEL_PHONE || "basic-kyc-level";
    case "basic": return process.env.SUMSUB_LEVEL_BASIC || "basic-kyc-level";
    case "enhanced": return process.env.SUMSUB_LEVEL_ENHANCED || "enhanced-kyc-level";
    case "institutional": return process.env.SUMSUB_LEVEL_INSTITUTIONAL || "institutional-kyc-level";
    default: return "basic-kyc-level";
  }
}

function normalizeStatus(reviewAnswer?: string, reviewStatus?: string): KycResult["status"] {
  if (reviewStatus === "init") return "not_started";
  if (reviewStatus === "pending") return "in_progress";
  if (reviewStatus === "queued" || reviewStatus === "onHold") return "pending_review";
  if (reviewAnswer === "GREEN") return "approved";
  if (reviewAnswer === "RED") return "rejected";
  return "in_progress";
}

export const sumsubProvider: KycProvider = {
  name: "sumsub",

  async startKyc(subject: KycSubject, opts) {
    const level = opts?.requestedLevel ?? "basic";
    const levelName = levelToSumsubLevelName(level);
    const applicant = (await call("POST", `/resources/applicants?levelName=${encodeURIComponent(levelName)}`, {
      externalUserId: subject.externalId,
      email: subject.email,
      phone: subject.phone,
      info: {
        country: subject.countryCode,
        firstName: subject.fullName?.split(" ").slice(0, -1).join(" ") || subject.fullName,
        lastName: subject.fullName?.split(" ").slice(-1).join(" "),
        dob: subject.dateOfBirth,
      },
    })) as { id: string };

    // Generate WebSDK access token for hosted flow
    const token = (await call(
      "POST",
      `/resources/accessTokens?userId=${encodeURIComponent(subject.externalId)}&levelName=${encodeURIComponent(levelName)}`,
    )) as { token: string };

    return {
      applicationId: applicant.id,
      status: "not_started",
      redirectUrl: null,
      sdkToken: token.token,
      expectedLevel: level,
      provider: "sumsub",
    };
  },

  async startKyb(subject: KybSubject, opts) {
    const level = opts?.requestedLevel ?? "enhanced";
    const levelName = levelToSumsubLevelName(level);
    const applicant = (await call("POST", `/resources/applicants?levelName=${encodeURIComponent(levelName)}`, {
      externalUserId: subject.externalId,
      type: "company",
      info: {
        companyInfo: {
          companyName: subject.legalName,
          registrationNumber: subject.registrationNumber,
          country: subject.jurisdiction,
          address: subject.registeredAddress,
          beneficiaries: subject.beneficialOwners?.map((b) => ({
            firstName: b.fullName.split(" ").slice(0, -1).join(" "),
            lastName: b.fullName.split(" ").slice(-1).join(" "),
            dob: b.dateOfBirth,
            shareSize: b.ownershipPct,
          })),
        },
      },
    })) as { id: string };

    const token = (await call(
      "POST",
      `/resources/accessTokens?userId=${encodeURIComponent(subject.externalId)}&levelName=${encodeURIComponent(levelName)}`,
    )) as { token: string };

    return {
      applicationId: applicant.id,
      status: "not_started",
      redirectUrl: null,
      sdkToken: token.token,
      expectedLevel: level,
      provider: "sumsub",
    };
  },

  async getStatus(applicationId: string): Promise<KycResult | null> {
    try {
      const applicant = (await call("GET", `/resources/applicants/${applicationId}/one`)) as {
        externalUserId: string;
        review?: { reviewAnswer?: string; reviewStatus?: string; reviewResult?: { rejectLabels?: string[] } };
      };
      const status = normalizeStatus(applicant.review?.reviewAnswer, applicant.review?.reviewStatus);
      return {
        applicationId,
        externalId: applicant.externalUserId,
        status,
        level: "basic",
        riskScore: status === "rejected" ? 90 : status === "approved" ? 10 : 50,
        reasons: applicant.review?.reviewResult?.rejectLabels ?? [],
        reviewedAt: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        raw: applicant,
      };
    } catch {
      return null;
    }
  },

  async parseWebhook(body, headers): Promise<KycWebhookEvent> {
    const raw = typeof body === "string" ? body : body.toString("utf8");
    const sig = (headers["x-payload-digest"] ?? headers["X-Payload-Digest"]) as string | undefined;
    if (!sig) throw new Error("Sumsub webhook: missing x-payload-digest");
    const expected = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new Error("Sumsub webhook: signature mismatch");
    }
    const parsed = JSON.parse(raw) as {
      applicantId: string;
      externalUserId: string;
      reviewResult?: { reviewAnswer?: string; rejectLabels?: string[] };
      reviewStatus?: string;
    };
    const status = normalizeStatus(parsed.reviewResult?.reviewAnswer, parsed.reviewStatus);
    return {
      applicationId: parsed.applicantId,
      externalId: parsed.externalUserId,
      status,
      level: "basic",
      riskScore: status === "rejected" ? 90 : status === "approved" ? 10 : 50,
      reasons: parsed.reviewResult?.rejectLabels ?? [],
      raw: parsed,
    };
  },
};

export const sumsubConfigured = configured;
