/**
 * Superior Pi SDK — browser/client module.
 *
 * Single unified entry-point for everything Pi-Browser-side: auth, payments,
 * incomplete payment recovery, and TRISYN-asset helpers. Forwards the
 * X-Pi-Network header to /api/pi/* so the server resolves the same network
 * the client booted under.
 *
 * Replaces (still re-exported for compat): lib/pi-sdk-2026.ts
 */

"use client";

export type PiNetwork = "mainnet" | "testnet";

export interface PiUser {
  uid: string;
  username: string;
  roles?: string[];
}
export interface PiAuthResult {
  user: PiUser;
  accessToken: string;
}

export interface PiPaymentInput {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
}
export interface PiPaymentResult {
  success: boolean;
  paymentId?: string;
  txid?: string;
  error?: unknown;
  cancelled?: boolean;
}
export interface PiPaymentCallbacks {
  onApproved?: (paymentId: string) => void;
  onCompleted?: (paymentId: string, txid: string) => void;
  onCancel?: (paymentId: string) => void;
  onError?: (error: unknown) => void;
}

export class PiNotAvailableError extends Error {
  constructor() {
    super("Pi SDK not available — open this page in the Pi Browser.");
    this.name = "PiNotAvailableError";
  }
}
export class PiServerApprovalError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Server approval failed (${status}): ${body}`);
    this.name = "PiServerApprovalError";
    this.status = status;
    this.body = body;
  }
}
export class PiServerCompletionError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Server completion failed (${status}): ${body}`);
    this.name = "PiServerCompletionError";
    this.status = status;
    this.body = body;
  }
}

type TelemetryEvent =
  | { type: "sdk_ready"; network: PiNetwork }
  | { type: "auth_start"; scopes: string[] }
  | { type: "auth_ok"; uid: string; username: string }
  | { type: "auth_err"; error: unknown }
  | { type: "payment_create"; amount: number; memo: string }
  | { type: "payment_approve_request"; paymentId: string }
  | { type: "payment_approve_ok"; paymentId: string }
  | { type: "payment_approve_err"; paymentId: string; error: unknown }
  | { type: "payment_complete_request"; paymentId: string; txid: string }
  | { type: "payment_complete_ok"; paymentId: string; txid: string }
  | { type: "payment_complete_err"; paymentId: string; txid: string; error: unknown }
  | { type: "payment_cancel"; paymentId: string }
  | { type: "payment_err"; error: unknown }
  | { type: "incomplete_found"; paymentId: string };

let telemetry: ((e: TelemetryEvent) => void) | null = null;
export function setPiTelemetry(fn: (e: TelemetryEvent) => void): void {
  telemetry = fn;
}
function tap(e: TelemetryEvent) {
  try {
    telemetry?.(e);
  } catch {
    /* never let telemetry break a flow */
  }
}

interface PiSdkWindow extends Window {
  Pi?: {
    init: (opts: { version: string; sandbox?: boolean }) => void;
    authenticate: (
      scopes: string[],
      onIncompletePaymentFound: (payment: unknown) => void,
    ) => Promise<PiAuthResult>;
    createPayment: (
      data: { amount: number; memo: string; metadata: Record<string, unknown> },
      callbacks: {
        onReadyForServerApproval: (paymentId: string) => void;
        onReadyForServerCompletion: (paymentId: string, txid: string) => void;
        onCancel: (paymentId: string) => void;
        onError: (error: Error, payment?: unknown) => void;
      },
    ) => void;
  };
  __piInitialization?: Promise<void> | undefined;
}

let activeNetwork: PiNetwork | null = null;
let cachedAuth: PiAuthResult | null = null;

function loadSdkScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new PiNotAvailableError());
    if ((window as PiSdkWindow).Pi) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="sdk.minepi.com/pi-sdk.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new PiNotAvailableError()), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sdk.minepi.com/pi-sdk.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new PiNotAvailableError());
    document.head.appendChild(s);
  });
}

/**
 * Boot the SDK once. Idempotent. Stores the active network so subsequent
 * /api/pi/* requests carry the right X-Pi-Network header.
 */
export async function ensurePiReady(network: PiNetwork = "mainnet"): Promise<void> {
  if (typeof window === "undefined") throw new PiNotAvailableError();
  const w = window as PiSdkWindow;
  if (activeNetwork === network && w.Pi) return;

  await loadSdkScript();
  if (!w.Pi) throw new PiNotAvailableError();

  w.Pi.init({ version: "2.0", sandbox: network === "testnet" });
  activeNetwork = network;
  tap({ type: "sdk_ready", network });
}

export function getActivePiNetwork(): PiNetwork | null {
  return activeNetwork;
}

function netHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(activeNetwork ? { "X-Pi-Network": activeNetwork } : {}),
  };
}

/**
 * Authenticate with the Pi user. Recovers any incomplete payment by POSTing
 * to /api/pi/complete on the user's behalf so we never strand a txid.
 */
export async function piAuthenticate(
  scopes: string[] = ["username", "payments"],
): Promise<PiAuthResult> {
  if (cachedAuth) return cachedAuth;
  await ensurePiReady(activeNetwork ?? "mainnet");
  const w = window as PiSdkWindow;
  if (!w.Pi) throw new PiNotAvailableError();

  tap({ type: "auth_start", scopes });
  try {
    const result = await w.Pi.authenticate(scopes, async (payment) => {
      const p = payment as { identifier?: string; transaction?: { txid?: string } };
      if (p?.identifier && p?.transaction?.txid) {
        tap({ type: "incomplete_found", paymentId: p.identifier });
        await fetch("/api/pi/complete", {
          method: "POST",
          headers: netHeaders(),
          body: JSON.stringify({ paymentId: p.identifier, txid: p.transaction.txid }),
        }).catch(() => {});
      }
    });
    cachedAuth = result;
    tap({ type: "auth_ok", uid: result.user.uid, username: result.user.username });
    return result;
  } catch (err) {
    tap({ type: "auth_err", error: err });
    throw err;
  }
}

export function clearPiAuth(): void {
  cachedAuth = null;
}
export function getCachedPiAuth(): PiAuthResult | null {
  return cachedAuth;
}

/**
 * Create a Pi payment with full Phase I/II/III lifecycle.
 *
 * Network header `X-Pi-Network` is propagated to /api/pi/approve and
 * /api/pi/complete so the server resolves the same network we booted under.
 */
export async function piPay(
  input: PiPaymentInput,
  callbacks: PiPaymentCallbacks = {},
): Promise<PiPaymentResult> {
  await ensurePiReady(activeNetwork ?? "mainnet");
  const w = window as PiSdkWindow;
  if (!w.Pi) throw new PiNotAvailableError();

  const metadata = {
    ...(input.metadata ?? {}),
    network: activeNetwork ?? "mainnet",
    created_at: new Date().toISOString(),
  };

  tap({ type: "payment_create", amount: input.amount, memo: input.memo });

  return new Promise<PiPaymentResult>((resolve) => {
    let captured: string | null = null;
    w.Pi!.createPayment(
      { amount: input.amount, memo: input.memo, metadata },
      {
        onReadyForServerApproval: async (paymentId) => {
          captured = paymentId;
          tap({ type: "payment_approve_request", paymentId });
          try {
            const r = await fetch("/api/pi/approve", {
              method: "POST",
              headers: netHeaders(),
              body: JSON.stringify({ paymentId, ...input, metadata }),
            });
            if (!r.ok) {
              const body = await r.text();
              const err = new PiServerApprovalError(r.status, body);
              tap({ type: "payment_approve_err", paymentId, error: err });
              callbacks.onError?.(err);
              resolve({ success: false, paymentId, error: err });
              return;
            }
            tap({ type: "payment_approve_ok", paymentId });
            callbacks.onApproved?.(paymentId);
          } catch (err) {
            tap({ type: "payment_approve_err", paymentId, error: err });
            callbacks.onError?.(err);
            resolve({ success: false, paymentId, error: err });
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          tap({ type: "payment_complete_request", paymentId, txid });
          try {
            const r = await fetch("/api/pi/complete", {
              method: "POST",
              headers: netHeaders(),
              body: JSON.stringify({ paymentId, txid, ...input, metadata }),
            });
            if (!r.ok) {
              const body = await r.text();
              const err = new PiServerCompletionError(r.status, body);
              tap({ type: "payment_complete_err", paymentId, txid, error: err });
              callbacks.onError?.(err);
              resolve({ success: false, paymentId, txid, error: err });
              return;
            }
            tap({ type: "payment_complete_ok", paymentId, txid });
            callbacks.onCompleted?.(paymentId, txid);
            resolve({ success: true, paymentId, txid });
          } catch (err) {
            tap({ type: "payment_complete_err", paymentId, txid, error: err });
            callbacks.onError?.(err);
            resolve({ success: false, paymentId, txid, error: err });
          }
        },
        onCancel: (paymentId) => {
          tap({ type: "payment_cancel", paymentId });
          callbacks.onCancel?.(paymentId);
          resolve({ success: false, paymentId, cancelled: true });
        },
        onError: (error) => {
          tap({ type: "payment_err", error });
          callbacks.onError?.(error);
          resolve({ success: false, paymentId: captured ?? undefined, error });
        },
      },
    );
  });
}

/**
 * TRISYN-asset convenience wrapper. Adds the asset binding into metadata so
 * the server-side bridge knows to settle in TRISYN rather than raw Pi.
 */
export interface PiTrisynInput {
  amount: number;
  memo: string;
  recipient?: string;
  metadata?: Record<string, unknown>;
}
export async function piPayTrisyn(
  input: PiTrisynInput,
  callbacks: PiPaymentCallbacks = {},
): Promise<PiPaymentResult> {
  return piPay(
    {
      amount: input.amount,
      memo: input.memo,
      metadata: {
        ...(input.metadata ?? {}),
        asset: "TRISYN",
        recipient: input.recipient ?? null,
      },
    },
    callbacks,
  );
}

/**
 * Backwards-compat shim. Keeps the public surface of lib/pi-sdk-2026.ts
 * working while callers migrate to piPay.
 */
export const piSDK2026 = {
  pay: (
    args: { amount: number; memo: string; metadata: Record<string, unknown> },
    cb?: {
      onSuccess?: (paymentId: string, txid: string) => void;
      onError?: (error: unknown) => void;
      onCancel?: (paymentId: string) => void;
    },
  ) =>
    piPay(args, {
      onCompleted: (id, txid) => cb?.onSuccess?.(id, txid),
      onError: (e) => cb?.onError?.(e),
      onCancel: (id) => cb?.onCancel?.(id),
    }),
};

// ─── KYC client helpers ──────────────────────────────────────────────────────

export type KycLevelClient = "phone" | "basic" | "enhanced" | "institutional";

export interface KycStatusResponse {
  applicationId?: string;
  status:
    | "not_started"
    | "in_progress"
    | "pending_review"
    | "approved"
    | "rejected"
    | "expired";
  level: "unverified" | KycLevelClient;
  riskScore?: number;
  reasons?: string[];
  redirectUrl?: string | null;
  sdkToken?: string | null;
}

/** Current KYC status for the signed-in Pi user. null if not signed in. */
export async function piGetKycStatus(): Promise<KycStatusResponse | null> {
  const auth = getCachedPiAuth();
  if (!auth) return null;
  const r = await fetch(
    `/api/pi/kyc/status?externalId=${encodeURIComponent(auth.user.uid)}`,
    { headers: netHeaders() },
  );
  if (!r.ok) return null;
  return (await r.json()) as KycStatusResponse;
}

/** Start a KYC flow for the signed-in user. Caller picks how to render the SDK token / redirectUrl. */
export async function piStartKyc(opts?: {
  requestedLevel?: KycLevelClient;
  email?: string;
  phone?: string;
  countryCode?: string;
  fullName?: string;
  dateOfBirth?: string;
}): Promise<KycStatusResponse> {
  const auth = await piAuthenticate(["username", "payments"]);
  const r = await fetch("/api/pi/kyc/start", {
    method: "POST",
    headers: netHeaders(),
    body: JSON.stringify({ externalId: auth.user.uid, ...opts }),
  });
  if (!r.ok) throw new Error(`piStartKyc failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as KycStatusResponse;
}

/**
 * Gate a UI action behind KYC. Returns true if allowed at minLevel.
 * Calls onNeedsKyc(current) with the current status if not allowed.
 */
export async function piRequireKyc(
  minLevel: KycLevelClient,
  onNeedsKyc?: (current: KycStatusResponse | null) => void,
): Promise<boolean> {
  const auth = await piAuthenticate(["username", "payments"]);
  const r = await fetch(
    `/api/pi/kyc/status?externalId=${encodeURIComponent(auth.user.uid)}&minLevel=${minLevel}`,
    { headers: netHeaders() },
  );
  if (r.ok) return true;
  if (r.status === 403) {
    const current = await piGetKycStatus().catch(() => null);
    onNeedsKyc?.(current);
    return false;
  }
  throw new Error(`piRequireKyc failed: ${r.status} ${await r.text()}`);
}
