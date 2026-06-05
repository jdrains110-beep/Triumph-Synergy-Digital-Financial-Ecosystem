#!/usr/bin/env node
// ==============================================================================
// TRIUMPH UBUNTU ADMIN — pi-admin.js
// Command-line admin utility for Pi Network mainnet (SCP Protocol 24)
// Talks to: SAIB Enforcer, Pi Horizon, Triumph App
// GCV = $314,159.00 / π
// ==============================================================================
"use strict";

const https = require("https");
const http  = require("http");

const SAIB   = process.env.SAIB_ENFORCER_URL  || "http://triumph-saib-enforcer:8210";
const HORIZON= process.env.STELLAR_HORIZON_URL || "https://api.mainnet.minepi.com";
const GCV    = 314_159.00;

const [,, cmd, ...args] = process.argv;

function fetchJSON(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { ...opts, timeout: 15000 }, res => {
      let buf = "";
      res.on("data", c => buf += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

const COMMANDS = {
  help() {
    console.log(`
Triumph Synergy Pi Admin CLI — Protocol 24 / GCV $314,159/π

Usage: node pi-admin.js <command> [args]

Commands:
  help                     Show this help
  live-ledger [limit]      Show latest Pi mainnet transactions from SAIB (default 10)
  live-ledger-cats         Show GCV transaction categories breakdown
  horizon                  Check Pi mainnet Horizon status + latest ledger
  account <address>        Look up Pi mainnet account balance
  ledger [seq]             Fetch a specific ledger (default: latest)
  txns <address> [limit]   Transactions for a Pi account
  duties                   Show SAIB duty engine status
  receipts [limit]         Show SAIB action receipts
  gcv <pi_amount>          Convert π to USD at GCV
  health                   Check all Triumph services

Env vars:
  SAIB_ENFORCER_URL        default: http://triumph-saib-enforcer:8210
  STELLAR_HORIZON_URL      default: https://api.mainnet.minepi.com
`);
  },

  async "live-ledger"() {
    const limit = Number(args[0] || 10);
    const r = await fetchJSON(`${SAIB}/live-ledger?limit=${limit}`);
    if (r.status !== 200) { console.error("SAIB error:", r.body); process.exit(1); }
    const d = r.body;
    console.log(`\n══ SAIB Live Ledger — Pi mainnet GCV Feed ══`);
    console.log(`  Protocol:   ${d.protocol}`);
    console.log(`  GCV Rate:   $${d.gcv_rate_usd_per_pi.toLocaleString()}/π`);
    console.log(`  Latest Seq: ${d.latest_ledger_seq}`);
    console.log(`  Last Poll:  ${d.last_poll_at || "pending"}`);
    console.log(`  π Volume:   ${d.totals.pi_volume.toFixed(4)} π`);
    console.log(`  GCV Volume: $${d.totals.usd_volume_gcv.toFixed(2)}`);
    console.log(`  Captured:   ${d.totals.transactions_captured} txns\n`);
    for (const tx of (d.transactions || [])) {
      console.log(
        `  [${tx.created_at?.slice(0,19)}] ledger=${tx.ledger} ` +
        `${tx.pi_amount.toFixed(4)}π = $${tx.gcv_usd.toFixed(2)} ` +
        `[${tx.category}] ${tx.memo ? `memo="${tx.memo}"` : "(no memo)"} ` +
        `${tx.successful ? "✓" : "✗"}`
      );
    }
    if (!d.transactions?.length) console.log("  (no transactions captured yet — waiting for ledger poll)");
  },

  async "live-ledger-cats"() {
    const r = await fetchJSON(`${SAIB}/live-ledger?limit=500`);
    if (r.status !== 200) { console.error("SAIB error:", r.body); process.exit(1); }
    const txns = r.body.transactions || [];
    const cats = {};
    let totalPi = 0;
    let totalUsd = 0;
    for (const tx of txns) {
      cats[tx.category] = cats[tx.category] || { count: 0, pi: 0, usd: 0 };
      cats[tx.category].count++;
      cats[tx.category].pi += tx.pi_amount;
      cats[tx.category].usd += tx.gcv_usd;
      totalPi += tx.pi_amount;
      totalUsd += tx.gcv_usd;
    }
    console.log(`\n══ GCV Category Breakdown (${txns.length} transactions) ══`);
    console.log(`  Total π: ${totalPi.toFixed(4)} = $${totalUsd.toFixed(2)} GCV\n`);
    for (const [cat, v] of Object.entries(cats).sort((a,b) => b[1].count - a[1].count)) {
      console.log(`  ${cat.padEnd(14)} ${String(v.count).padStart(5)} txns  ${v.pi.toFixed(4)}π  $${v.usd.toFixed(2)}`);
    }
  },

  async horizon() {
    const r = await fetchJSON(HORIZON);
    if (r.status !== 200) { console.error("Horizon unreachable"); process.exit(1); }
    const d = r.body;
    console.log(`\n══ Pi mainnet Horizon Status ══`);
    console.log(`  Network:          ${d.network_passphrase || "Pi Network"}`);
    console.log(`  Latest Ledger:    ${d.history_latest_ledger}`);
    console.log(`  Horizon Version:  ${d.horizon_version}`);
    console.log(`  Core Version:     ${d.core_version}`);
    console.log(`  Base Reserve:     ${d.base_reserve_in_stroops / 1e7} π`);
    console.log(`  Base Fee:         ${d.base_fee_in_stroops / 1e7} π`);
  },

  async account() {
    const addr = args[0];
    if (!addr) { console.error("Usage: node pi-admin.js account <stellar_address>"); process.exit(1); }
    const r = await fetchJSON(`${HORIZON}/accounts/${addr}`);
    if (r.status !== 200) { console.error("Account not found:", r.body?.detail); process.exit(1); }
    const d = r.body;
    const nativeBal = d.balances?.find(b => b.asset_type === "native");
    const pi = parseFloat(nativeBal?.balance || "0");
    console.log(`\n══ Pi Account: ${addr} ══`);
    console.log(`  π Balance:   ${pi.toFixed(7)} π`);
    console.log(`  GCV Value:   $${(pi * GCV).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    console.log(`  Sequence:    ${d.sequence}`);
    console.log(`  Subentries:  ${d.subentry_count}`);
    console.log(`  Home Domain: ${d.home_domain || "(none)"}`);
  },

  async ledger() {
    const seq = args[0] || "latest";
    const url = seq === "latest"
      ? `${HORIZON}/ledgers?order=desc&limit=1`
      : `${HORIZON}/ledgers/${seq}`;
    const r = await fetchJSON(url);
    if (r.status !== 200) { console.error("Ledger error:", r.body); process.exit(1); }
    const d = seq === "latest" ? r.body._embedded.records[0] : r.body;
    console.log(`\n══ Ledger ${d.sequence} ══`);
    console.log(`  Closed At:    ${d.closed_at}`);
    console.log(`  Transactions: ${d.transaction_count}`);
    console.log(`  Operations:   ${d.operation_count}`);
    console.log(`  Total Coins:  ${parseFloat(d.total_coins).toFixed(4)} π`);
    console.log(`  Total GCV:    $${(parseFloat(d.total_coins) * GCV).toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
    console.log(`  Base Fee:     ${d.base_fee_in_stroops / 1e7} π`);
  },

  async txns() {
    const addr = args[0];
    if (!addr) { console.error("Usage: node pi-admin.js txns <address> [limit]"); process.exit(1); }
    const limit = Number(args[1] || 10);
    const r = await fetchJSON(`${HORIZON}/accounts/${addr}/transactions?order=desc&limit=${limit}`);
    if (r.status !== 200) { console.error("Error:", r.body); process.exit(1); }
    const txns = r.body._embedded?.records || [];
    console.log(`\n══ Transactions for ${addr} (${txns.length}) ══`);
    for (const tx of txns) {
      console.log(`  [${tx.created_at?.slice(0,19)}] ${tx.hash.slice(0,16)}… ops=${tx.operation_count} fee=${tx.fee_charged / 1e7}π ${tx.memo ? `memo="${tx.memo}"` : ""}`);
    }
  },

  async duties() {
    const r = await fetchJSON(`${SAIB}/duties`);
    if (r.status !== 200) { console.error("SAIB error:", r.body); process.exit(1); }
    console.log(`\n══ SAIB Duty Engine ══`);
    for (const d of (r.body.duties || [])) {
      console.log(`  ${d.name.padEnd(22)} runs/${d.cadenceLabel || "?"} last=${d.lastRan || "never"} errors=${d.errors || 0}`);
    }
  },

  async receipts() {
    const limit = Number(args[0] || 20);
    const r = await fetchJSON(`${SAIB}/receipts?limit=${limit}`);
    if (r.status !== 200) { console.error("SAIB error:", r.body); process.exit(1); }
    for (const rec of (r.body.receipts || [])) {
      console.log(`  [${rec.ts?.slice(0,19)}] ${rec.action} by ${rec.actor} — ${rec.outcome || "ok"}`);
    }
  },

  gcv() {
    const pi = parseFloat(args[0]);
    if (isNaN(pi)) { console.error("Usage: node pi-admin.js gcv <amount>"); process.exit(1); }
    const usd = pi * GCV;
    console.log(`${pi} π × $${GCV.toLocaleString()}/π = $${usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  },

  async health() {
    const checks = [
      { name: "SAIB Enforcer",   url: `${SAIB}/health` },
      { name: "Pi Horizon",      url: `${HORIZON}` },
    ];
    console.log(`\n══ Triumph Service Health ══`);
    for (const c of checks) {
      try {
        const r = await fetchJSON(c.url);
        const ok = r.status < 400;
        console.log(`  ${ok ? "✓" : "✗"} ${c.name.padEnd(22)} HTTP ${r.status}`);
      } catch (e) {
        console.log(`  ✗ ${c.name.padEnd(22)} ERROR: ${e.message}`);
      }
    }
  },
};

(async () => {
  const fn = COMMANDS[cmd];
  if (!fn) {
    if (cmd) console.error(`Unknown command: "${cmd}"\n`);
    COMMANDS.help();
    process.exit(cmd ? 1 : 0);
  }
  await fn();
})().catch(e => { console.error(e.message); process.exit(1); });
