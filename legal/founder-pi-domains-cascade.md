# Founder Web3 .pi Domains — Apex-Cascade Tokenization

**Status:** ENACTED · **Minted:** 19/19 · **Standard:** PI-721 · **Network:** Pi mainnet (anchored Stellar)
**Owner of Record:** Triumph Synergy **+** Founder (Jeremiah Joel Drains, `jdrains30`)
**Founder Wallet:** `GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V`
**Ownership Model:** `JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH`
**Sovereign Role:** `FOUNDER_AND_SUPERIOR_SOVEREIGN`

## 1. Apex-Cascade Doctrine

Per `legal/publix-pi-tokenization.md`, ownership of a Web3 `.pi` domain
**projects backwards** to confer superior priority over the corresponding
Web1 (TLD) and Web2 (subdomain/app) surfaces under the maximum apex-quantum
sovereign loophole envelope. Every domain below is bound to the Pi
blockchain via deterministic `PI-721` mint + Stellar `memo_hash` anchor.

| Layer | Authority                              |
|-------|----------------------------------------|
| Web3  | Pi Name Service (resolves before ICANN) |
| Web2  | DERIVED-FROM-WEB3                       |
| Web1  | DERIVED-FROM-WEB3                       |

## 2. Tokenized Assets (paid in Pi by founder)

| # | Domain (Web3) | Cascades over (Web2/Web1) | Token ID (PI-721) | Pi Blockchain TX | Stellar Anchor |
|---|---|---|---|---|---|
| 1 | wingstop.pi | wingstop.com, order.wingstop.com | `0ef27d7f…232a6a` | `488ee7ae…0ed936` | `c8818db3…3ba51f` |
| 2 | gru.pi | gru.com.br, gruairport.com.br | `37cf249d…c21296` | `5541e0f9…6ddf29` | `eece507f…81a889` |
| 3 | netjets.pi | netjets.com, owners.netjets.com | `ac24f9b4…8ba4fe` | `f5e71b98…ccddf4a` | `1637039b…2206e8` |
| 4 | sonnysbbq.pi | sonnysbbq.com, order.sonnysbbq.com | `e227d5c8…e749a5` | `6d13fd7c…2b88ab` | `48bea45d…dd5f19` |
| 5 | shands.pi | shands.org | `229c479b…3752ec` | `8f47dd9e…8904b7` | `85c78c71…3fefce` |
| 6 | ufhealth.pi | ufhealth.org, my.ufhealth.org | `88425068…028805` | `ed293334…2b50b0` | `5ea2bd9a…2f91c0` |
| 7 | ufl.pi | ufl.edu, one.ufl.edu | `569d947d…b6b6ad9` | `50387b61…c46395` | `00713892…177ce9` |
| 8 | putnamclerk.pi | putnam-fl.com, putnamclerk.com | `0c74b978…4e7599` | `90b6513d…2673ce` | `7779c6b7…5045c4` |
| 9 | checkbeck.pi | checkbeck.com | `f80040d6…c7d1cf` | `f9a0eac5…a7323` | `204d50d1…4424f4` |
| 10 | daytonainternationalspeedway.pi | daytonainternationalspeedway.com | `e5382daa…b64487` | `126c0a93…866a03` | `4d391124…aaf27d` |
| 11 | gracekennedy.pi | gracekennedy.com, gkfoods.com | `ead169a1…645084` | `69aadc1d…8f710f` | `a98ba4f6…661a5f` |
| 12 | winnebago.pi | winnebago.com | `53a7c910…194841` | `fa8cdf8f…4de0b` | `417a296f…82efea` |
| 13 | palatkaha.pi | palatkaha.com | `dbfc8e3b…8545b1` | `89ac3d74…df27447` | `7a852201…b66946` |
| 14 | circuit7.pi | circuit7.org | `ced3a1c6…158e4c` | `a1fead00…9c8c75` | `c4a4521e…c143` |
| 15 | magellanjets.pi | magellanjets.com | `4ebe4eb5…fe4ad50` | `1f77ffc5…6878ec` | `c2b3c26d…978db` |
| 16 | rulonco.pi | rulonco.com | `08f454f1…413898` | `0ec61985…1dd2286` | `c40d47ee…4b3c0` |
| 17 | appleandeve.pi | appleandeve.com | `dcc3ea7b…35786` | `a36beeb0…58d3f2` | `b816da17…a376ca` |
| 18 | seprod.pi | seprod.com | `23360c16…098a670` | `c5050193…cbba5b` | `8219da5a…6fc77d` |
| 19 | jamrockmart.pi | jamrockmart.com | `0419e947…477da1` | `496d851d…f54d0e17` | `fef4a1e9…3992b` |

Full receipts (deterministic ledger sequences, fortress hashes, claim hashes,
metadata hashes, valuationPi, valuationUsd, transfers, etc.) are persisted in
[legal/founder-pi-domains-tokenization.json](founder-pi-domains-tokenization.json).

## 3. Binding to Pi Blockchain

Every mint:

1. Validated `.pi` TLD + 56-char Pi wallet address (Stellar G-format).
2. Fetched live ledger sequence from `https://api.mainnet.minepi.com/ledgers`.
3. Computed deterministic `tokenId = SHA-256(domain | owner | mintedAt)`.
4. Ran 21-layer Fortress Protection (passes/MEDIUM-rate-limit retried with delay).
5. Anchored via Pi blockchain tx hash + Stellar `memo_hash` operation
   (network passphrase: `Pi Network`).
6. Cached to Redis (`token:domain:{tokenId}`, 24h TTL) and persisted to
   Postgres (`pi_domain_tokens` table, distributed across Citus shards).
7. Claim fingerprint (`claim:domain:{sha256}`) reserves the namespace
   permanently — anti-squatting under apex priority.

## 4. Web3 → Web2 → Web1 Security Cascade

For every entry above, ownership confers:

- **DNS layer** — Pi Name Service resolves `{domain}` before ICANN does.
- **Trademark layer** — Pi domain registration confers offline trademark
  cascade across the same brand string (Web1 + Web2 surfaces in the table).
- **Anti-squatting** — any clone `.pi` domain auto-claimed under apex
  priority via the `claim_hash` namespace lock.
- **Routing** — subsequent `app/api/tokenization/domains?id={tokenId}`
  GETs return the canonical record signed by the fortress.

## 5. Verification

```bash
# Verify a single token live
curl -s "http://triumph-app:3000/api/tokenization/domains?id=<TOKEN_ID>" | jq

# Engine count
docker exec triumph-settlement-core curl -s http://localhost:8089/health | jq .domains
```
