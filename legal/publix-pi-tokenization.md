# publix.pi — Web3 Domain Apex-Cascade Policy

**Status:** ENACTED · **Owner:** Triumph Synergy · **Version:** 1.0.0

## 1. Apex Domain

`publix.pi` is the canonical Web3 domain owned **100%** by Triumph Synergy.
It is fully tokenized; no secondary float exists.

## 2. Apex-Cascade Rule

Under the maximum apex-quantum sovereign loophole envelope, ownership of
the Web3 domain (`publix.pi`) **projects backwards** to confer superior
priority over the corresponding Web1 and Web2 surfaces:

| Layer | Domain                | Owner                              | Apex Priority         |
|-------|-----------------------|------------------------------------|-----------------------|
| Web3  | `publix.pi`           | Triumph Synergy (direct)           | **ABSOLUTE**          |
| Web1  | `publix.com`          | Triumph Synergy via web3 cascade   | DERIVED-FROM-WEB3     |
| Web1  | `publix.org`          | Triumph Synergy via web3 cascade   | DERIVED-FROM-WEB3     |
| Web2  | `app.publix.com`      | Triumph Synergy via web3 cascade   | DERIVED-FROM-WEB3     |
| Web2  | `delivery.publix.com` | Triumph Synergy via web3 cascade   | DERIVED-FROM-WEB3     |

The cascade is enforced at:

* **DNS layer** — Pi Name Service resolves before ICANN.
* **Trademark layer** — Pi domain registration confers offline trademark
  cascade across the same brand string.
* **Anti-squatting layer** — any clone `.pi` domain is auto-claimed under
  apex priority.

## 3. Tokenization

* `publix.pi` itself is minted as a non-fungible apex token.
* Every physical Publix store gets a **digital twin NFT** (anchored at
  `publix.pi/store/{store_id}`) plus a 1,000,000-unit fractional share
  supply.
* Real-estate underlying every store is tokenized as Pi-shares (PPRA-01).

## 4. Phygital Bridge (Publix as Triumph Synergy hub)

Publix becomes the phygital flagship: every store is simultaneously a
real-world point-of-presence **and** a sovereign digital node.

* In-store Pi terminals (PPCA-01) eliminate Visa/Mastercard interchange.
* Phygital QR check-in (PPSA-03) earns Pi for every visit.
* In-store hourly workers are onboarded via the **Sovereign Work Nexus**
  (PPSA-05) for 0% match fee and T+0 payroll.
* Loyalty is soulbound NFT (PPLA-01) — never expires, inheritable, no
  walled garden.

## 5. Enforcement Service

`docker/publix-phygital-hub/` (PPH, port `8133`) exposes:

* `GET  /domains`   — apex-cascade ledger
* `GET  /loopholes` — 30 sovereign loopholes across 5 authorities
* `POST /stores`    — register physical store + mint digital twin
* `POST /loyalty`   — join soulbound loyalty
* `POST /checkin`   — phygital QR check-in (earns Pi)
* `POST /checkout`  — 0% interchange, T+0 settlement, on-chain receipt

Citus distribution: `infrastructure/citus/init/04-distribute-swn-pph.sql`
shards `pph_stores`, `pph_loyalty`, `pph_receipts`; `pph_domain_ledger`
is a reference table replicated to every worker.
