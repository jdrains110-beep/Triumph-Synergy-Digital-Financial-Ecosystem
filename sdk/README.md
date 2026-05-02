# Sovereign Gaming Nexus — Studio SDKs

Drop-in clients that AAA studios can embed to mint Pi rewards into the
**Sovereign Gaming Nexus (SGN)** rail of the Triumph Synergy ecosystem.

| Engine        | File                                                 | Type                         |
| ------------- | ---------------------------------------------------- | ---------------------------- |
| Unity 2021+   | [`unity/SovereignGamingNexus.cs`](unity/SovereignGamingNexus.cs)   | Single-file C# class         |
| Unreal 5      | [`unreal/SovereignGamingNexus.h`](unreal/SovereignGamingNexus.h)   | Header-only C++ singleton    |

Both SDKs target the same SGN HTTP surface:

- `POST /earn` — single rewards event (signed)
- `POST /studios`, `POST /titles`, `POST /players` — onboarding
- `POST /tournaments`, `POST /tournaments/{id}/payout` — competitive payouts

## Recommended deployment

1. **Server-authoritative (default)** — Your dedicated game server holds the
   studio HMAC secret and posts `/earn` events on behalf of players. The SDK
   can be configured with `overrideEarnUrl` to forward through your own
   backend if you prefer to mediate every call.
2. **Client-direct (advanced)** — Your backend mints short-lived ephemeral
   per-player signing tokens; the SDK signs and posts directly to SGN. Lower
   latency but requires your backend to enforce anti-fraud on token issuance.

## Onboarding flow

```bash
# 1. Apply
curl -X POST https://sgn.triumph-synergy.example/onboarding/apply \
  -H 'content-type: application/json' \
  -d '{"studio_name":"Acme Games","contact_email":"ops@acme.gg",
       "country":"US","pi_treasury_address":"GACME...",
       "primary_titles":["Acme Royale"],"engineer_headcount":48}'

# 2. Verify with the code returned (or sent via email in prod)
curl -X POST .../onboarding/verify \
  -d '{"token":"<token>","verification_code":"<code>"}'

# 3. Triumph admin approves (or auto-approve via SGN_ONBOARDING_AUTO_APPROVE=true)
curl -X POST .../onboarding/approve \
  -H 'x-sgn-admin-token: <admin>' -d '{"token":"<token>"}'

# 4. Pick up your one-time HMAC secret (delivered ONCE)
curl .../onboarding/secret/<delivery_token>
```

Stash the `hmac_secret` in your studio's secret manager (KMS, HashiCorp
Vault, AWS Secrets Manager, …). It is never re-issued — re-onboard if lost.

## Security notes

- All `/earn` events are signed with **HMAC** (algorithm advertised via
  `SGN_HMAC_VERSION`; current default `v1` = HMAC-SHA3-512 → 96 hex chars).
- SGN enforces nonce replay protection and per-player daily Pi caps.
- Every accepted event also receives a quantum-shadow signature
  (`qsig:mldsa87:...`) for post-quantum auditability.
- Citus shards earn events by `player_id` so a player's full history lives
  on a single worker for fast lookups.

## License

PiOS — see repo root [`LICENSE-PIOS`](../LICENSE-PIOS).
