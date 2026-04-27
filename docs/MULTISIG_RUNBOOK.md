# Multisig Runbook — Pi Testnet 2-of-3 Central Account

Convert `GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V` from
single-key control to 2-of-3 multisig so **no single key can sign for the
account**. The Stellar protocol enforces this — Pi Network inherits it
automatically.

> ⚠️ Setting `MASTER_WEIGHT=0` in the setup tx is **irreversible**. Read the
> entire runbook, do `DRY_RUN=1` first, and verify all 3 cosigners can sign a
> dummy tx before running for real.

---

## 0. Prerequisites

- Stack: this repo, Node 20+, `npm i` already run.
- Hardware:
  - Cosigner A — your Mac with the existing master key (will be retired).
  - Cosigner B — Ledger Nano S Plus / Nano X / Stax with the **Stellar app** installed (Ledger Live → Manager → Stellar).
  - Cosigner C — second Ledger / Trezor Safe 3 / Keystone (different vendor preferred), OR a fresh hot software key in a separate offline location.
- Each device unboxed direct from manufacturer (never Amazon/eBay).
- 24-word recovery phrase for each hardware wallet written on metal/paper, stored in a different physical location than the device.

---

## 1. Generate / record the 3 cosigner pubkeys

### Cosigner A — your existing master key (already known)
Pubkey: `GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V`

(After multisig is live, this key's `master_weight` becomes 0 and it is no
longer a valid signer. It is replaced by 3 brand-new signers — A2, B, C.)

### Cosigner A2 — fresh hot key on your Mac (replaces the master)
```sh
docker run --rm node:20-alpine sh -c '
  npm i -s @stellar/stellar-sdk >/dev/null 2>&1 &&
  node -e "const {Keypair}=require(\"@stellar/stellar-sdk\");const k=Keypair.random();
  console.log(\"PUBLIC:\",k.publicKey());console.log(\"SECRET:\",k.secret());"'
```
Record SECRET in macOS Keychain (or `op` 1Password CLI). DO NOT commit.

### Cosigner B — Ledger
```sh
# Plug in Ledger, unlock, open Stellar app
npx tsx scripts/sign-with-ledger.ts --pubkey
# -> prints G... — record it
```

### Cosigner C — second hardware wallet (or fresh hot key in a different location)
Same procedure as A2 or B. Store offline, ideally in a different physical
location than your home.

---

## 2. Smoke-test each cosigner can sign a dummy tx

Build a no-op dummy bump-sequence tx and have each cosigner sign + verify the
signature. (Skip this only if you're 100% confident in your hardware.)

```sh
# (optional) build a dummy tx targeting cosigner A's address:
node -e '
const {TransactionBuilder,Account,Operation,Networks}=require("@stellar/stellar-sdk");
const a=new Account("GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V","104797124712988672");
const tx=new TransactionBuilder(a,{fee:"1000000",networkPassphrase:"Pi Testnet"})
  .addOperation(Operation.bumpSequence({bumpTo:"104797124712988673"}))
  .setTimeout(300).build();
console.log(tx.toEnvelope().toXDR("base64"));' > /tmp/dummy.xdr

# Sign with Ledger:
npx tsx scripts/sign-with-ledger.ts --in /tmp/dummy.xdr --out /tmp/dummy.sig.xdr
# (DO NOT submit — this is just signature verification.)
```

If the Ledger screen shows the correct tx hash and you can produce
`/tmp/dummy.sig.xdr` without error, that cosigner is good.

---

## 3. Build the multisig SetOptions transaction (DRY RUN)

```sh
DRY_RUN=1 \
  ACCOUNT=GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
  SIGNER_A=<G... cosigner A2 pubkey> \
  SIGNER_B=<G... Ledger pubkey> \
  SIGNER_C=<G... second device pubkey> \
  THRESHOLD=2 \
  MASTER_WEIGHT=0 \
  HORIZON_URL=https://api.testnet.minepi.com \
  NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-setup.ts
```

Read the printed plan carefully. Confirm:
- Account is the central node.
- Three signers, weights all 1.
- THRESHOLD=2, MASTER_WEIGHT=0.

---

## 4. Build the real envelope (no DRY_RUN)

```sh
ACCOUNT=GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
  SIGNER_A=<...> SIGNER_B=<...> SIGNER_C=<...> \
  THRESHOLD=2 MASTER_WEIGHT=0 \
  npx tsx scripts/multisig-setup.ts --out /tmp/multisig-setup.xdr
```

This envelope still needs ONE signature: the **current master key**
(`GA6Z5...GL7V`'s existing secret), because at this point the account is still
single-sig and the master is the sole authority.

---

## 5. Sign the envelope with the current master

```sh
read -s SIGNER_SECRET && export SIGNER_SECRET     # paste current master S...
NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-cosign.ts \
  --in /tmp/multisig-setup.xdr \
  --out /tmp/multisig-setup.signed.xdr
unset SIGNER_SECRET
```

(If the master key is already on a hardware wallet, use
`scripts/sign-with-ledger.ts --in /tmp/multisig-setup.xdr --out /tmp/multisig-setup.signed.xdr`
instead.)

---

## 6. Submit and verify

```sh
HORIZON_URL=https://api.testnet.minepi.com \
NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-submit.ts --in /tmp/multisig-setup.signed.xdr
```

Expect `SUCCESS` with a tx hash. Then verify on-chain:

```sh
curl -s https://api.testnet.minepi.com/accounts/GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
  | python3 -c "import json,sys;d=json.load(sys.stdin);
print('thresholds:',d['thresholds']);
print('signers:');
for s in d['signers']: print(' ',s)"
```

You should see:
```
thresholds: {'low_threshold': 2, 'med_threshold': 2, 'high_threshold': 2}
signers:
  {'weight': 0, 'key': 'GA6Z5...GL7V', 'type': 'ed25519_public_key'}   <- master DISABLED
  {'weight': 1, 'key': '<SIGNER_A>', ...}
  {'weight': 1, 'key': '<SIGNER_B>', ...}
  {'weight': 1, 'key': '<SIGNER_C>', ...}
```

🎉 The account is now 2-of-3 multisig. **The original master secret is no
longer sufficient on its own** — even if it leaks, an attacker can't move funds
without a second cosigner.

---

## 7. Going forward — co-signing any future tx

1. Anyone builds the tx (any tool that produces an unsigned XDR works).
2. Cosigner B signs:
   `scripts/sign-with-ledger.ts --in tx.xdr --out tx.b.xdr`
3. Cosigner C signs the result:
   `scripts/sign-with-ledger.ts --in tx.b.xdr --out tx.bc.xdr`
   (or `multisig-cosign.ts` if a software signer)
4. Submit:
   `scripts/multisig-submit.ts --in tx.bc.xdr`

Two signatures → tx accepted. One signature → tx rejected with `tx_bad_auth`.

---

## 8. Disaster recovery

| Scenario | Recovery |
|---|---|
| Lose 1 of 3 signers (device dead, secret lost) | Use the remaining 2 to add a new 4th signer + remove the lost one (still 2-of-3) |
| Lose 2 of 3 signers | Funds permanently locked — recover only via 24-word seed restore of one of the lost devices |
| Suspect 1 signer compromised | Use other 2 to immediately remove the compromised signer + add a fresh one |

Always keep at least one cosigner's seed phrase in a geographically separate
location from the device.

---

## 9. Mainnet (when Pi Core onboards GA6Z5...GL7V)

Repeat the entire runbook with:
```
HORIZON_URL=https://api.mainnet.minepi.com
NETWORK_PASSPHRASE="Pi Network"
```
Use the SAME 3 hardware signers. They're network-agnostic — one Ledger key
secures both Pi Testnet and Pi Mainnet copies of the account.

---

## Quick reference — env cheat-sheet

```sh
# Pi Testnet
export HORIZON_URL=https://api.testnet.minepi.com
export NETWORK_PASSPHRASE="Pi Testnet"

# Pi Mainnet
export HORIZON_URL=https://api.mainnet.minepi.com
export NETWORK_PASSPHRASE="Pi Network"
```
