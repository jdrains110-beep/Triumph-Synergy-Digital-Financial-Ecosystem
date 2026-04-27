# Pi Core Team — Validator Quorum Inclusion Request

**Submit via**: Pi Core Team Discord / GitHub issue on `pi-network-pi-core` /
`pi-network/pi-stellar-core` / official validator-onboarding form. Copy the body
below.

---

## Subject
Request: Add Triumph Synergy testnet validator to Pi Testnet quorum

## Body

Hi Pi Core Team,

We operate **Triumph Synergy**, a Pi Network ecosystem application
(`triumph-synergy.vercel.app`, app id `triumph-synergy`) and have been running a
full Pi Stellar Core node ("testnet2", build v22.1.0) on Pi Testnet as part of
our integration. We have promoted it from watcher to validator and would like
to request consideration for inclusion in the Pi Testnet validator quorum.

### Validator details

| Field             | Value |
|-------------------|-------|
| **Alias**         | `triumph-synergy-testnet` |
| **Display name**  | Triumph Synergy Testnet Validator |
| **Public key**    | `GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V` |
| **Network**       | Pi Testnet (`Pi Testnet`) |
| **Build**         | stellar-core v22.1.0, Pi distribution |
| **Home domain**   | `triumph-synergy-testnet.vercel.app` |
| **stellar.toml**  | https://triumph-synergy-testnet.vercel.app/.well-known/stellar.toml |
| **Peer address**  | `triumph-synergy-testnet.vercel.app:31402` (NAT, currently outbound-only — port-forward in progress) |
| **History archive** | https://history.triumph-synergy.vercel.app/ (provisioning) |

### Current quorum slice

We follow the official `pi-core-team` quorum:

```
[[HOME_DOMAINS]]
HOME_DOMAIN = "pi-core-team"
QUALITY = "MEDIUM"

[[VALIDATORS]] NAME=validator1 PUBLIC_KEY=GDFDDPMC... ADDRESS=34.152.3.42:31402
[[VALIDATORS]] NAME=validator2 PUBLIC_KEY=GDOJPADI... ADDRESS=35.228.163.61:31402
[[VALIDATORS]] NAME=validator3 PUBLIC_KEY=GAOBNDXT... ADDRESS=34.79.206.31:31402
```

`/quorum` currently shows: `agree: ["validator3", "GA6Z5", "validator1", "validator2"]`
and we are voting in SCP (`EXTERNALIZE` phase observed on every ledger).

### What we run

- **stellar-core v22.1.0** validator on Pi Testnet, voting and externalizing every ledger.
- **Horizon** at `:8000` indexing the ledger live.
- **Triumph Synergy Central Node** (`governance-shield`) which uses the same
  pubkey as a funded on-chain account on Pi Testnet.
- **Pi Bridge Connector** that submits transactions back through the Pi node to
  the network — currently `sync_lag_seconds: 0.3`.

### What we are asking

1. Acceptance of `GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V`
   into the Pi Testnet validator set, with `HOME_DOMAIN=triumph-synergy-testnet.vercel.app`
   and an appropriate `QUALITY` tier.
2. Guidance on:
   - Required SLA for QUALITY=LOW vs MEDIUM tiers.
   - Whether you require us to host a public history archive (we are
     provisioning one) and any specific layout you expect.
   - Inbound peer reachability requirements (we are behind NAT and can
     port-forward `:31402` if required).

### Contact

- GitHub: https://github.com/jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem
- Email: ops@triumph-synergy.vercel.app

Happy to provide logs, peer counts, sync metrics, or do a live walkthrough.

Thank you,
Jeremiah Drains
Triumph Synergy
