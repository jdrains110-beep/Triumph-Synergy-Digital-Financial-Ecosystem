/**
 * Superior Pi SDK — server module.
 *
 * Single source of truth for talking to the Pi Platform API from Next.js
 * route handlers. Handles dual-network resolution (mainnet/testnet) with
 * automatic key fallback on 404 and re-pinning to whatever the Platform
 * reports for the payment.
 *
 * Used by:
 *   - app/api/pi/approve/route.ts
 *   - app/api/pi/complete/route.ts
 *   - app/api/pi/verify/route.ts
 *   - app/api/pi/cancel/route.ts
 */

import { resolveFromRequest, type PiNetworkResolved } from "@/lib/pi/network";

export interface PiPaymentStatus {
  developer_approved?: boolean;
  developer_completed?: boolean;
  cancelled?: boolean;
  user_cancelled?: boolean;
  transaction_verified?: boolean;
}

export interface PiPaymentRecord {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  to_address: string;
  created_at: string;
  status: PiPaymentStatus;
  transaction: { txid?: string; verified?: boolean; _link?: string } | null;
  sandbox?: boolean;
  network?: "mainnet" | "testnet";
}

export interface VerifyResult {
  payment: PiPaymentRecord;
  resolved: PiNetworkResolved;
}

/**
 * Look up a payment by id, with automatic key fallback when the first attempt
 * returns 404 (covers the case where a sandbox payment was opened without
 * X-Pi-Network: testnet).
 *
 * Always re-pins resolved.network to paymentData.sandbox when present.
 */
export async function verifyPayment(
  paymentId: string,
  req: Request,
): Promise<VerifyResult | { error: string; status: number; network: string }> {
  let resolved = resolveFromRequest(req);

  let resp = await fetch(`${resolved.piApiBase}/v2/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Key ${resolved.piApiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok && resp.status === 404) {
    const alt = resolveFromRequest(req, resolved.network === "mainnet");
    if (alt.piApiKey && alt.piApiKey !== resolved.piApiKey) {
      const retry = await fetch(`${alt.piApiBase}/v2/payments/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Key ${alt.piApiKey}`,
          "Content-Type": "application/json",
        },
      });
      if (retry.ok) {
        resolved = alt;
        resp = retry;
      }
    }
  }

  if (!resp.ok) {
    return {
      error: resp.status === 404 ? "Invalid or expired payment ID" : await resp.text(),
      status: resp.status,
      network: resolved.network,
    };
  }

  const payment = (await resp.json()) as PiPaymentRecord;

  if (typeof payment?.sandbox === "boolean") {
    resolved = resolveFromRequest(req, payment.sandbox);
  }

  return { payment, resolved };
}

export async function approvePayment(
  paymentId: string,
  resolved: PiNetworkResolved,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  const resp = await fetch(`${resolved.piApiBase}/v2/payments/${paymentId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Key ${resolved.piApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!resp.ok) return { ok: false, error: await resp.text(), status: resp.status };
  return { ok: true, data: await resp.json() };
}

export async function completePayment(
  paymentId: string,
  txid: string,
  resolved: PiNetworkResolved,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  const resp = await fetch(`${resolved.piApiBase}/v2/payments/${paymentId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Key ${resolved.piApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ txid }),
  });
  if (!resp.ok) return { ok: false, error: await resp.text(), status: resp.status };
  return { ok: true, data: await resp.json() };
}

export async function cancelPayment(
  paymentId: string,
  resolved: PiNetworkResolved,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  const resp = await fetch(`${resolved.piApiBase}/v2/payments/${paymentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Key ${resolved.piApiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) return { ok: false, error: await resp.text(), status: resp.status };
  return { ok: true, data: await resp.json() };
}

export interface PiUser {
  uid: string;
  username: string;
  roles?: string[];
  credentials?: { scopes?: string[]; valid_until?: { timestamp?: number } };
}

/**
 * Verify a Pi accessToken by calling /v2/me. Tries both network keys on 401.
 */
export async function verifyAccessToken(
  accessToken: string,
  req: Request,
): Promise<{ user: PiUser; resolved: PiNetworkResolved } | { error: string; status: number; network: string }> {
  let resolved = resolveFromRequest(req);

  let resp = await fetch(`${resolved.piApiBase}/v2/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok && (resp.status === 401 || resp.status === 403)) {
    const alt = resolveFromRequest(req, resolved.network === "mainnet");
    if (alt.piApiKey && alt.piApiKey !== resolved.piApiKey) {
      const retry = await fetch(`${alt.piApiBase}/v2/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (retry.ok) {
        resolved = alt;
        resp = retry;
      }
    }
  }

  if (!resp.ok) {
    return {
      error: await resp.text(),
      status: resp.status,
      network: resolved.network,
    };
  }
  return { user: (await resp.json()) as PiUser, resolved };
}
