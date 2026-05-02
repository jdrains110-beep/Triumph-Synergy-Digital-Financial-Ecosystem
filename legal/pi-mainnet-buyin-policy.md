# Pi Mainnet Buy-In Policy

**Author:** Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy
**Effective:** Pi Network Open Mainnet
**Status:** ACTIVE
**License:** PiOS

---

## Statement

After **Pi Network Open Mainnet**, individuals who did **not mine** Pi during
the Enclosed-Mainnet / mining era may acquire Pi only through a
**Buy-In** mechanism — at either an **internal** or **external** denominated
value, as set by the Triumph Synergy sovereign rails and Pi Network's own
mainnet economics.

**Mining remains available** to existing and new Pioneers **until the desired
expansion formula** for Pi Network's pioneer base has been satisfied. The
Buy-In and the active mining rails coexist; they are not mutually exclusive.

## Two-Tier Acquisition

| Tier | Audience | Acquisition Path | Rate Reference |
|------|----------|------------------|----------------|
| **Mining (active Pioneers)** | Existing Pioneers + new Pioneers admitted before the expansion formula is satisfied | Continue mining via the official Pi Network app and consensus circles | Pi Network mainnet emission schedule |
| **Buy-In — Internal** | Non-miners participating inside the Triumph Synergy sovereign ecosystem | Internal liquidity desks, sovereign treasury settlements, in-app purchase rails | **Internal Pioneer rate** — currently `$314,159 USD / π` (sovereign gold standard, immutable) |
| **Buy-In — External** | Non-miners on external venues (regulated exchanges, OTC, neobank rails) | External market venues integrated with Pi mainnet | **External Pioneer rate** — currently `$314.159 USD / π` (1000× lower than internal) |

The internal rate intentionally exceeds the external rate by a 1000× factor.
This preserves the value of the Pioneer-mined supply, prevents non-miner
arbitrage of the sovereign treasury, and channels external Buy-In demand
into Pi Network's stated economic model rather than draining it.

## Expansion Formula Termination of Mining

Mining will be sunset **only when the Pi Network expansion formula** —
defined and published by the Pi Core Team — has been formally reached. Until
that public threshold is met, **mining remains the canonical, non-purchase
path** to acquire Pi for any individual eligible under Pi Network's own
KYC and pioneer-onboarding rules.

When the expansion formula is satisfied:

1. New mining circles will close in the order published by the Pi Core Team.
2. Existing mined balances are unaffected and remain the property of the
   Pioneer.
3. Buy-In becomes the sole acquisition path for new participants.
4. The internal vs. external two-tier rate structure persists.

## Triumph Synergy Enforcement Hooks

The following ecosystem services enforce or reference this policy:

- **`triumph-pi-bridge-connector`** — gates non-Pioneer acquisition through
  the Buy-In rails; will not settle non-mined Pi acquisitions outside the
  sanctioned internal/external desks.
- **`triumph-tokenization-engine`** — applies the internal-vs-external rate
  band when minting on-chain Pi-denominated obligations.
- **`triumph-settlement-core`** — labels every settlement with its tier
  (`mined`, `buyin_internal`, `buyin_external`) for downstream auditability.
- **SAIB metrics** — `saib_pi_external_rate_usd` (external) and
  `saib_pi_internal_rate_usd` (internal) gauges expose the active rates.

## Sovereign Mandate

This Buy-In policy serves Pi Network Pioneers first. The two-tier rate
structure is a permanent sovereign protection — not a market price discovery
mechanism. It cannot be overridden by external venues, market makers, or
secondary liquidity providers operating outside the Triumph Synergy
sovereign envelope.

> **Pioneers earn. Non-Pioneers buy in.
> Mining persists until the Pi Network expansion formula is reached.
> The internal sovereign rate is immutable. The external rate is the floor.**

---

*Codified per the Founder's directive of May 2, 2026.*
