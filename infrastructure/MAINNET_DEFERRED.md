# Pi Mainnet — Status: DEFERRED

**Date set**: 2026-04-27
**Set by**: ops (Jeremiah Drains)
**Network in active use**: Pi Testnet only

## TL;DR

The Triumph Synergy central node, validator, governance-shield, SAIB mesh,
quantum-fortress, judicial, compliance, and bridge layers all run **exclusively
on Pi Testnet** until further notice. Pi Mainnet integration is parked.

## Why deferred

Attempting to fund the central node pubkey
`GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V` on Pi Mainnet via
`CreateAccount` returns:

```
HTTP 400
"Invalid Operation - Invalid Operation Type Stellar::OperationType.create_account(0)"
```

This is enforced at the Pi Mainnet protocol layer — `CreateAccount` is
restricted; new accounts must be onboarded by Pi Core. Until Pi Core onboards
the central-node pubkey we cannot bootstrap a funded mainnet account, so every
downstream mainnet flow (SCP attestation, judicial enforcement, SAIB mainnet
mirror, etc.) would fail.

## What is configured to stay on testnet

- `docker-compose.yml` (governance-shield service):
  - `NETWORK_TYPE: ${PI_NETWORK_MODE:-testnet}` (default flipped from mainnet)
  - `PI_INTERNAL_HORIZON_URL: ${PI_INTERNAL_HORIZON_URL:-https://api.testnet.minepi.com}`
- All `*_NETWORK_MODE` references default to `testnet`.
- `public/.well-known/stellar.toml` registers the validator on Pi Testnet only.
- `scripts/fund-central-node.ts` defaults to Pi Testnet horizon + passphrase.

## What is required to lift the deferral (in order)

1. **Pi Core onboards** the central-node pubkey
   `GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V` on Pi Mainnet
   (or issues us a procedure to fund it via Pi Bridge / KYC migration).
2. Verify funded state on mainnet:
   ```
   curl -s https://api.mainnet.minepi.com/accounts/GA6Z5...GL7V | jq .balances
   ```
3. Flip env when launching shield:
   ```
   PI_NETWORK_MODE=mainnet \
   PI_INTERNAL_HORIZON_URL=https://api.mainnet.minepi.com \
   docker compose up -d --no-deps governance-shield
   ```
4. Confirm `/info` reports `acct_status: active` against mainnet.
5. Promote bridge/judicial/compliance/SAIB peers to mainnet endpoints
   (already plumbed via env in `docker-compose.yml`).
6. Update `public/.well-known/stellar.toml` to add a mainnet alias and submit
   a second Pi Core validator request for mainnet.

## Funding wallet status

- Funding source: `GDINCI6L7M3J3YTUEMSX3SP2OD7VBJEVX6DTC3BHLD4SD4CMVQ2DVTMF`
- Testnet balance: ~19 Pi (post-rotation will sweep to fresh keypair)
- Mainnet balance: 58.0178230 Pi (UNTOUCHED — cannot be moved without an
  existing mainnet destination account; sweep deferred along with mainnet)

## Re-evaluation cadence

Revisit this document **monthly** or whenever Pi Core publishes new onboarding
guidance. Tracked in `infrastructure/MAINNET_DEFERRED.md`.
