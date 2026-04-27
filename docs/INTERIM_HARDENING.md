# Interim Hardening — No-Hardware-Wallet Phase

This runbook covers the **3 actions you can take today** while waiting on
hardware wallets to arrive:

| # | Action | Outcome |
|---|---|---|
| 2 | Software 2-of-3 multisig (master + Mac key + iPhone key) | Single-device compromise can no longer move funds |
| 3 | Master secret → macOS Keychain | Secret no longer readable by `cat` / shell history / Time Machine |
| 5 | Background tx monitor with optional Discord/Slack/ntfy alerts | Any unauthorized tx surfaces in <30 seconds |

Run them in this order: **3 → 5 → 2**. (Move secret to Keychain first so the
2-of-3 setup can pull it from there. Start the monitor before the multisig
setup so you can see the SetOptions tx land in real time.)

---

## Step 3 — Move master secret into macOS Keychain

### 3.1 Stash it

```sh
# silent prompt — paste the master S... and hit enter
security add-generic-password \
  -a "$USER" \
  -s pi-central-master \
  -U \
  -w
```

The `-U` flag lets it overwrite an existing entry. The shell never sees the
secret — it goes straight into the Keychain over an encrypted local socket.

### 3.2 Verify it

```sh
security find-generic-password -a "$USER" -s pi-central-master -w
# -> prints the secret. If you see it, the stash worked. (Touch ID may prompt.)
```

### 3.3 Use it (one-shot, never persisted to disk)

```sh
export MASTER_SECRET="$(security find-generic-password -a "$USER" -s pi-central-master -w)"
# ...do stuff (sign a tx, run multisig setup, etc.)
unset MASTER_SECRET
```

### 3.4 Delete every plaintext copy

```sh
# search the repo for accidental copies
grep -RIn --exclude-dir=node_modules --exclude-dir=.git "S[A-Z2-7]\{55\}" . || echo "none"

# nuke any .env files that might contain it
ls -la .env* 2>/dev/null
# rm any that have it (after confirming they're not in .gitignore-already-tracked state)

# clear current shell history of any prior paste
history -c 2>/dev/null  # zsh: needs `fc -p` followed by exiting; or just close the terminal
```

Then run `scripts/final-scrub.sh` after closing VS Code (item 2 of the original
follow-ups).

---

## Step 5 — Start the transaction monitor

### 5.1 (Optional but recommended) set up a webhook

Pick whichever you'll actually look at:

| Service | Free tier | Setup |
|---|---|---|
| **ntfy.sh** | Yes, no account | Pick any topic name — `https://ntfy.sh/triumph-pi-alerts-XXXX`, install ntfy iOS app, subscribe to the topic |
| **Discord** | Yes | Server settings → Integrations → Webhooks → New Webhook → Copy URL |
| **Slack** | Yes | api.slack.com/apps → Incoming Webhooks → Add to Workspace |

Pick a hard-to-guess topic/URL — the URL itself is the secret.

### 5.2 Smoke-test the script in the foreground

```sh
ACCOUNT=GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
HORIZON_URL=https://api.testnet.minepi.com \
WEBHOOK_URL="https://ntfy.sh/triumph-pi-alerts-XXXX" \
  bash scripts/tx-monitor.sh
```

You should see something like:
```
[2026-04-27T...Z] watching GA6Z5...GL7V on https://api.testnet.minepi.com (poll=30s, webhook=yes)
[2026-04-27T...Z] initial head=abc123def456…  (will alert on anything newer)
```

Hit Ctrl-C. If you see the initial head line, it works.

### 5.3 Install as a launchd daemon (auto-start, auto-restart)

```sh
# 1. edit infrastructure/launchd/com.triumph.tx-monitor.plist and put your
#    real WEBHOOK_URL into the empty <string></string> under WEBHOOK_URL.
$EDITOR infrastructure/launchd/com.triumph.tx-monitor.plist

# 2. install
mkdir -p ~/Library/LaunchAgents
cp infrastructure/launchd/com.triumph.tx-monitor.plist ~/Library/LaunchAgents/

# 3. load
launchctl load -w ~/Library/LaunchAgents/com.triumph.tx-monitor.plist

# 4. verify
launchctl list | grep triumph
tail -f /tmp/triumph-tx-monitor.log
```

It'll now restart automatically on logout/login and reboot. To stop:
```sh
launchctl unload ~/Library/LaunchAgents/com.triumph.tx-monitor.plist
```

### 5.4 Self-test — fire a real alert

Send 0.0001 Pi to yourself (or any innocuous tx) on the central account. The
log file `/tmp/triumph-tx-monitor.log` should print a NEW TX line within 30s
and your phone/Discord should ping. If not, recheck `WEBHOOK_URL`.

---

## Step 2 — Software 2-of-3 multisig (interim)

Goal: add **two new signers** (one in Mac Keychain, one on iPhone) while
keeping the master enabled at weight 1. Threshold = 2. Result: any tx needs
**any 2 of {master, mac-key, iphone-key}**.

### 2.1 Generate the Mac signer (stored in Keychain)

```sh
npx tsx scripts/generate-signer.ts --keychain pi-signer-mac
# Prints PUBLIC key (G...). Record it. Secret is in Keychain only.
```

Verify retrieval works:
```sh
security find-generic-password -a "$USER" -s pi-signer-mac -w >/dev/null && echo "OK"
```

### 2.2 Generate the iPhone signer

```sh
npx tsx scripts/generate-signer.ts
# Prints both PUBLIC and SECRET. Record PUBLIC, then transfer SECRET to iPhone.
```

**Get the SECRET onto your iPhone (pick ONE):**

| Method | Steps | Security |
|---|---|---|
| **Apple Passwords app** (iOS 18+) | iCloud Passwords sync → on iPhone, Settings → Apple Account → iCloud → Passwords → ON. On Mac: Passwords app → + → New Password → "Pi iPhone Signer", paste secret as Password. Syncs to iPhone Keychain via E2EE. | Best — same security as your iCloud Keychain (E2EE, no plaintext on Apple servers) |
| **1Password / Bitwarden** | Create a Secure Note "Pi iPhone Signer", paste secret, save. Install the iOS app, log in. | Best if you already use a vault |
| **Apple Notes (locked note)** | Notes app → New Note → File menu → Lock Note (sets a password). Paste secret. Save. Syncs via iCloud. | Decent — note body is E2EE if "Advanced Data Protection" is enabled |

After it's confirmed on iPhone:
```sh
# clear the SECRET from Mac terminal scrollback
clear; printf '\e[3J'
```

### 2.3 Verify all three keys can be referenced

```sh
echo "Master pub:  GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
echo "Mac signer:  <paste from 2.1>"
echo "iPhone signer: <paste from 2.2>"
```

### 2.4 DRY RUN the multisig setup tx

```sh
DRY_RUN=1 \
  ACCOUNT=GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
  SIGNER_A=<MAC SIGNER PUB> \
  SIGNER_B=<IPHONE SIGNER PUB> \
  SIGNER_C=                  \
  THRESHOLD=2 \
  MASTER_WEIGHT=1 \
  HORIZON_URL=https://api.testnet.minepi.com \
  NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-setup.ts
```

> Note: the script accepts SIGNER_C blank — it just adds whichever signers you
> set. With `MASTER_WEIGHT=1` + 2 new signers + threshold=2, you get
> **2-of-3** (master, mac, iphone — pick any 2).

Confirm the printed plan shows:
- `Master weight: 1` (NOT 0 — we're keeping the master usable for now)
- 2 new signers, weight 1 each
- Thresholds 2/2/2

### 2.5 Build the real envelope

```sh
ACCOUNT=GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
SIGNER_A=<MAC PUB> SIGNER_B=<IPHONE PUB> \
THRESHOLD=2 MASTER_WEIGHT=1 \
HORIZON_URL=https://api.testnet.minepi.com \
NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-setup.ts --out /tmp/multisig-interim.xdr
```

### 2.6 Sign with the master (from Keychain)

```sh
export SIGNER_SECRET="$(security find-generic-password -a "$USER" -s pi-central-master -w)"
NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-cosign.ts \
  --in /tmp/multisig-interim.xdr \
  --out /tmp/multisig-interim.signed.xdr
unset SIGNER_SECRET
```

### 2.7 Submit

```sh
HORIZON_URL=https://api.testnet.minepi.com \
NETWORK_PASSPHRASE="Pi Testnet" \
  npx tsx scripts/multisig-submit.ts --in /tmp/multisig-interim.signed.xdr
```

Expect SUCCESS + a hash. Within 30 seconds your tx-monitor (Step 5) should
ping you. That's your end-to-end self-test of both Step 2 AND Step 5.

### 2.8 Verify on-chain

```sh
curl -s https://api.testnet.minepi.com/accounts/GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V \
  | python3 -c "import json,sys;d=json.load(sys.stdin);
print('thresholds:',d['thresholds']);
print('signers:');
[print(' ',s) for s in d['signers']]"
```

Expected:
```
thresholds: {'low_threshold': 2, 'med_threshold': 2, 'high_threshold': 2}
signers:
  {'weight': 1, 'key': 'GA6Z5...GL7V', ...}   <- master, still active
  {'weight': 1, 'key': '<MAC PUB>', ...}
  {'weight': 1, 'key': '<IPHONE PUB>', ...}
```

🎉 You're now interim 2-of-3. A single compromised device cannot move funds.

---

## What this DOES and DOESN'T cover

✅ Single MacBook compromise → can't sign alone (needs iPhone OR master)
✅ Stolen MacBook → FileVault + Keychain protect both master and Mac signer
✅ Apple ID phish on Mac alone → still need iPhone separately
✅ Any unauthorized tx → alert in <30s

⚠️  Both Mac + iPhone in same iCloud account = single Apple ID compromise = both keys gone. Mitigations:
  - Enable **Advanced Data Protection** on iCloud (Settings → Apple Account → iCloud → Advanced Data Protection)
  - Use a **hardware security key** (YubiKey) for your Apple ID 2FA
  - Don't store the master in iCloud — keep it Mac-Keychain-only

⚠️  This is **not** a substitute for hardware wallets. As soon as the Ledgers
arrive, re-run `scripts/multisig-setup.ts` with the 3 hardware pubkeys and
`MASTER_WEIGHT=0` per `docs/MULTISIG_RUNBOOK.md`.

---

## Rollback

If anything goes wrong with the interim multisig and you still have the master
secret + 1 of {Mac, iPhone} signers, you can sign a new SetOptions tx that
removes the bad signer and/or resets thresholds to 1 (single-sig). Build it
with `multisig-setup.ts` patterns or the Stellar Lab UI. Don't lose the master
secret until you're on full hardware multisig.
