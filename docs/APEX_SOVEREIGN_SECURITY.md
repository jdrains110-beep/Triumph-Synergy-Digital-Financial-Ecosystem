# Triumph Synergy — Apex Sovereign Security Architecture

> Status: **ACTIVE**
> Profile: **APEX / SOVEREIGN / QUANTUM-RESISTANT**
> Last hardened: see `git log lib/security/`

This document is the operational map of the **military-grade, sovereign,
quantum-resistant** security envelope wrapping the entire Triumph Synergy
ecosystem. It is intentionally dense — every primitive listed exists in
the codebase as enforced code, not aspiration.

---

## 1. Defense-in-depth layers

| Layer | Mechanism | File |
|-------|-----------|------|
| L0 — Network | HSTS preload (2y), upgrade-insecure-requests, CSP3 with per-request nonce, COOP/COEP/CORP isolation, NEL + Report-To | `middleware.ts` |
| L1 — Edge | Rate limit (per-IP, per-route, 60s window), CSRF Origin/Referer allowlist, Vercel-preview→PiNet redirect | `lib/security/api-guard.ts`, `middleware.ts` |
| L2 — Request | **Idempotency keys mandatory** for all mutating sensitive routes (24h TTL, body-fingerprint conflict detection) | `lib/security/idempotency.ts` |
| L3 — Identity | Supabase SSR session refresh on every request; wallet-bound headers (`X-Wallet-PublicKey`, `X-Wallet-DID`) propagated to APIs | `middleware.ts`, `lib/security/api-guard.ts` |
| L4 — Authorization | RLS-locked tables (`profiles`, `payments`, `audit_events`, `idempotency_cache`); service-role-only writes on audit + idempotency | `lib/db/migrations/0001_apex_audit_and_rls.sql` |
| L5 — Cryptographic receipts | **ML-DSA-65** (NIST FIPS 204 / Dilithium3) post-quantum signatures on every payment receipt, public key exposed at `/api/security/pq-pubkey` | `lib/security/pq-receipts.ts` |
| L6 — Tamper evidence | SHA-256 hash chain over all security events; append-only via DB trigger; verifiable end-to-end | `lib/security/audit-chain.ts` |
| L7 — Anomaly detection | Rolling-window counters → webhook on auth-burst, ratelimit-storm, replay-block, amount-mismatch, CSP-violation flood | `lib/security/anomaly-monitor.ts` |
| L8 — Key custody | Rotation script generates 256-bit entropy for PQ seed, Stellar seed, NextAuth secret, internal HMAC; Vercel push optional | `scripts/rotate-secrets.sh` |

---

## 2. Sovereign loopholes (escape hatches under our control)

These are **intentional capabilities** the operator (you) retains that no
external party — including Pi Core, Vercel, Supabase — can override:

1. **Receipt independence.** Every payment receipt is signed with a
   keypair generated locally from `PQ_RECEIPT_SEED`. If Pi Core ever
   disputes or loses a record, the receipt + audit-chain hash + Stellar
   anchor (optional) is sufficient proof on its own.
2. **Audit chain self-anchoring.** Periodically post `getCurrentHead()` to
   a public Stellar memo or Pi Network message. Once anchored, the full
   chain becomes externally provable without Supabase trust.
3. **Idempotency body-fingerprint conflict.** A 409 Conflict on key reuse
   with mismatched body proves an out-of-band tamper attempt. Logged.
4. **Multisig escrow path.** Production Stellar accounts SHOULD use
   2-of-3 multisig (operator + cold key + delayed recovery). Even if the
   hot key leaks, no funds move without the second signer.
5. **CSP nonce + strict-dynamic.** `'unsafe-inline'` is fully removed.
   Any injected `<script>` without our per-request nonce cannot execute,
   and `script-src-attr 'none'` blocks inline event handlers entirely.
6. **Append-only DB invariant.** `audit_events` has a trigger that
   raises on UPDATE/DELETE. Even a service-role compromise cannot
   silently rewrite history without leaving the trigger error in logs.
7. **Cross-Origin isolation.** COOP `same-origin` + COEP `credentialless`
   + CORP `same-origin` block Spectre-class side-channels and prevent
   any third-party from reading our window state.
8. **Ephemeral dev keys, mandatory prod keys.** The PQ key generator
   refuses to start in production without `PQ_RECEIPT_SEED` set,
   eliminating accidental key drift between deploys.

---

## 3. Operational runbook

### First-time bootstrap
```bash
# 1. Generate sovereign secrets
./scripts/rotate-secrets.sh
# → writes .env.rotation.<ts>; copy values into Vercel env (or use --push)

# 2. Apply DB migration (audit chain + RLS)
psql "$DATABASE_URL" -f lib/db/migrations/0001_apex_audit_and_rls.sql

# 3. Set ALERT_WEBHOOK_URL in Vercel env (Slack/Discord/PagerDuty webhook)

# 4. Wire audit chain to Supabase service-role client at boot:
#    import { configureAuditChain } from "@/lib/security/audit-chain"
#    import { createClient } from "@supabase/supabase-js"
#    configureAuditChain(createClient(URL, SERVICE_ROLE_KEY))

# 5. Deploy
vercel --prod
```

### Quarterly rotation
```bash
./scripts/rotate-secrets.sh --push vercel
vercel --prod   # forces all instances to load new secrets
```
Also rotate manually: `PI_API_KEY` (develop.pi portal),
`SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard), DB password.

### Verifying a receipt offline
```ts
import { verifyReceipt } from "@/lib/security/pq-receipts";
// receipt is the JSON returned in /api/pi_payment/complete response
const ok = verifyReceipt(receipt);
```

### Verifying the audit chain
```ts
import { verifyChain } from "@/lib/security/audit-chain";
const events = await db.select().from("audit_events").orderBy("id");
const brokenAt = verifyChain(events);   // -1 = intact
```

---

## 4. Threat model coverage (OWASP Top 10 + Web3)

| Threat | Mitigation |
|--------|------------|
| A01 Broken Access Control | Supabase RLS, service-role separation, `requireAuth` in `api-guard` |
| A02 Cryptographic Failures | ML-DSA-65 receipts, HSTS preload, COOP/COEP isolation |
| A03 Injection | CSP3 strict-dynamic + nonces, `script-src-attr 'none'`, parameterized DB |
| A04 Insecure Design | Idempotency mandatory; append-only audit; receipts independent of DB |
| A05 Security Misconfiguration | Headers enforced in middleware; CSP-violation reports auto-audited |
| A06 Vulnerable Components | `@noble/post-quantum` (audited), no `'unsafe-eval'` anywhere |
| A07 Auth Failures | Rate limit + anomaly monitor on `auth.failure`; webhook alert |
| A08 Software/Data Integrity | Hash-chained audit log, PQ-signed receipts |
| A09 Logging Failures | All security events flow through `appendAuditEvent` |
| A10 SSRF | Outbound calls allowlisted (`api.minepi.com`, Supabase, Stellar Horizon) |
| Web3-1 Replay attacks | Idempotency-Key required + body-fingerprint conflict |
| Web3-2 Front-running | Receipts include server timestamp + audit prev-hash |
| Web3-3 Quantum break (5–15y) | ML-DSA-65 signatures (NIST FIPS 204 ratified) |

---

## 5. What an attacker would have to do

To forge a single fraudulent payment receipt and have it accepted by any
third-party verifier:

1. Steal `PQ_RECEIPT_SEED` (32 bytes, never sent to client, rotated quarterly)
2. **AND** steal Supabase service-role key (rotated quarterly)
3. **AND** rewrite or insert into `audit_events` past the append-only
   trigger (requires DB superuser, leaves trigger-error trail)
4. **AND** match the SHA-256 prev_hash chain perfectly
5. **AND** evade the anomaly monitor webhook firing on the unusual
   service-role write pattern
6. **AND** evade the Stellar/Pi anchor of `getCurrentHead()` if enabled

That is the apex bar. Maintain key rotation discipline and the bar holds.
