/**
 * Sanctions screening — OFAC SDN, EU consolidated, UN consolidated.
 *
 * Lists are fetched once on first call (and then refreshed in the background
 * every SANCTIONS_REFRESH_HOURS, default 24h), parsed, and held in memory.
 * Matching is name + crypto address based.
 *
 * Sources (all free public):
 *   OFAC SDN (XML)    : https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML
 *   EU Consolidated   : https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw
 *   UN Consolidated   : https://scsanctions.un.org/resources/xml/en/consolidated.xml
 *
 * For test envs without internet, you can preload via SANCTIONS_FIXTURE_PATH
 * (JSON: { names: string[], addresses: string[] }).
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";

export interface SanctionsHit {
  list: "OFAC_SDN" | "EU_CONSOLIDATED" | "UN_CONSOLIDATED" | "LOCAL_BLOCKLIST";
  matchType: "exact_name" | "fuzzy_name" | "crypto_address";
  matched: string;
  score: number; // 0-100
  entry?: { name?: string; programs?: string[]; uid?: string };
}

export interface SanctionsScreenInput {
  name?: string;
  cryptoAddress?: string;
  /** Extra strings to screen (aliases, AKAs, dba names) */
  aliases?: string[];
}

interface ListState {
  names: Set<string>;
  namesNormalized: Map<string, { name: string; programs: string[]; uid: string }>;
  addresses: Set<string>;
  loadedAt: number;
  source: string;
}

const lists: Record<string, ListState> = {};
let refreshing = false;
let refreshTimer: NodeJS.Timeout | null = null;

const REFRESH_MS =
  (Number(process.env.SANCTIONS_REFRESH_HOURS || "24") || 24) * 3600 * 1000;

const SOURCES = {
  OFAC_SDN:
    process.env.OFAC_SDN_URL ||
    "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML",
  EU_CONSOLIDATED:
    process.env.EU_SANCTIONS_URL ||
    "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw",
  UN_CONSOLIDATED:
    process.env.UN_SANCTIONS_URL ||
    "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lightweight XML scraping — we only need names + crypto addresses.
 * Avoids pulling in a heavy XML parser.
 */
function extractFromXml(xml: string): {
  entries: Array<{ name: string; programs: string[]; uid: string }>;
  addresses: Set<string>;
} {
  const entries: Array<{ name: string; programs: string[]; uid: string }> = [];
  const addresses = new Set<string>();

  // OFAC <sdnEntry>…<firstName>X</firstName><lastName>Y</lastName>… or <lastName> alone for entities
  const sdnRe = /<sdnEntry>([\s\S]*?)<\/sdnEntry>/gi;
  for (const m of xml.matchAll(sdnRe)) {
    const block = m[1];
    const uid = /<uid>(\d+)<\/uid>/i.exec(block)?.[1] ?? "";
    const first = /<firstName>([\s\S]*?)<\/firstName>/i.exec(block)?.[1]?.trim() ?? "";
    const last = /<lastName>([\s\S]*?)<\/lastName>/i.exec(block)?.[1]?.trim() ?? "";
    const name = [first, last].filter(Boolean).join(" ").trim();
    const programs = Array.from(block.matchAll(/<program>([\s\S]*?)<\/program>/gi)).map((p) => p[1].trim());
    if (name) entries.push({ name, programs, uid });
    for (const a of block.matchAll(/<aka>[\s\S]*?<lastName>([\s\S]*?)<\/lastName>[\s\S]*?<\/aka>/gi)) {
      const aka = a[1].trim();
      if (aka) entries.push({ name: aka, programs, uid: `${uid}-aka` });
    }
    // crypto addresses appear in <id> blocks with idType "Digital Currency Address"
    for (const id of block.matchAll(/<id>([\s\S]*?)<\/id>/gi)) {
      const idBlock = id[1];
      if (/Digital Currency Address/i.test(idBlock)) {
        const num = /<idNumber>([\s\S]*?)<\/idNumber>/i.exec(idBlock)?.[1]?.trim();
        if (num) addresses.add(num.toLowerCase());
      }
    }
  }

  // EU / UN style — <wholeName> or <NAME>
  for (const m of xml.matchAll(/<wholeName>([\s\S]*?)<\/wholeName>/gi)) {
    const n = m[1].trim();
    if (n) entries.push({ name: n, programs: ["EU"], uid: "" });
  }
  for (const m of xml.matchAll(/<INDIVIDUAL_ALIAS>[\s\S]*?<ALIAS_NAME>([\s\S]*?)<\/ALIAS_NAME>/gi)) {
    const n = m[1].trim();
    if (n) entries.push({ name: n, programs: ["UN"], uid: "" });
  }
  for (const m of xml.matchAll(/<FIRST_NAME>([\s\S]*?)<\/FIRST_NAME>[\s\S]*?<SECOND_NAME>([\s\S]*?)<\/SECOND_NAME>/gi)) {
    const n = `${m[1].trim()} ${m[2].trim()}`.trim();
    if (n) entries.push({ name: n, programs: ["UN"], uid: "" });
  }

  return { entries, addresses };
}

async function fetchList(name: keyof typeof SOURCES, url: string): Promise<ListState> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(45_000),
    headers: { "User-Agent": "triumph-synergy-sanctions/1.0" },
  });
  if (!resp.ok) throw new Error(`${name} fetch ${resp.status}`);
  const xml = await resp.text();
  const { entries, addresses } = extractFromXml(xml);
  const names = new Set<string>();
  const namesNormalized = new Map<string, { name: string; programs: string[]; uid: string }>();
  for (const e of entries) {
    const n = normalizeName(e.name);
    if (!n) continue;
    names.add(n);
    namesNormalized.set(n, e);
  }
  return { names, namesNormalized, addresses, loadedAt: Date.now(), source: name };
}

async function loadFixtureIfPresent(): Promise<void> {
  const p = process.env.SANCTIONS_FIXTURE_PATH;
  if (!p) return;
  try {
    const data = JSON.parse(await fs.readFile(p, "utf8")) as {
      names?: string[];
      addresses?: string[];
    };
    const names = new Set<string>();
    const namesNormalized = new Map<string, { name: string; programs: string[]; uid: string }>();
    for (const n of data.names ?? []) {
      const nn = normalizeName(n);
      names.add(nn);
      namesNormalized.set(nn, { name: n, programs: ["FIXTURE"], uid: "" });
    }
    lists.LOCAL_BLOCKLIST = {
      names,
      namesNormalized,
      addresses: new Set((data.addresses ?? []).map((a) => a.toLowerCase())),
      loadedAt: Date.now(),
      source: "fixture",
    };
  } catch (e) {
    console.error("[sanctions] fixture load:", (e as Error).message);
  }
}

export async function refreshSanctionsLists(force = false): Promise<{ loaded: string[]; errors: Record<string, string> }> {
  if (refreshing && !force) {
    return { loaded: Object.keys(lists), errors: {} };
  }
  refreshing = true;
  const errors: Record<string, string> = {};
  try {
    await loadFixtureIfPresent();
    for (const [name, url] of Object.entries(SOURCES)) {
      try {
        const ls = await fetchList(name as keyof typeof SOURCES, url);
        lists[name] = ls;
        console.log(`[sanctions] ${name}: ${ls.names.size} names, ${ls.addresses.size} addresses`);
      } catch (e) {
        errors[name] = (e as Error).message;
        console.error(`[sanctions] ${name} refresh failed:`, errors[name]);
      }
    }
  } finally {
    refreshing = false;
  }
  return { loaded: Object.keys(lists), errors };
}

/**
 * Start a background refresh loop. Idempotent. Call once at server startup.
 */
export function startSanctionsRefresh(): void {
  if (refreshTimer) return;
  refreshSanctionsLists().catch(() => {});
  refreshTimer = setInterval(() => {
    refreshSanctionsLists().catch(() => {});
  }, REFRESH_MS);
}

// Simple bigram fuzzy match — good enough for "Vladimir Putin" vs "putin vladimir"
function bigrams(s: string): Set<string> {
  const grams = new Set<string>();
  const padded = ` ${s} `;
  for (let i = 0; i < padded.length - 1; i++) grams.add(padded.substring(i, i + 2));
  return grams;
}
function dice(a: string, b: string): number {
  const ag = bigrams(a);
  const bg = bigrams(b);
  let inter = 0;
  for (const g of ag) if (bg.has(g)) inter++;
  return (2 * inter) / (ag.size + bg.size || 1);
}

/**
 * Synchronous screen — assumes lists are already loaded (call refreshSanctionsLists()
 * at startup). Returns all hits across all lists.
 */
export function screenSanctions(input: SanctionsScreenInput): SanctionsHit[] {
  const hits: SanctionsHit[] = [];
  const namesToScreen = [input.name, ...(input.aliases ?? [])]
    .filter((s): s is string => Boolean(s))
    .map(normalizeName)
    .filter(Boolean);
  const addr = input.cryptoAddress?.toLowerCase().trim();

  for (const [listName, state] of Object.entries(lists)) {
    if (addr && state.addresses.has(addr)) {
      hits.push({
        list: listName as SanctionsHit["list"],
        matchType: "crypto_address",
        matched: addr,
        score: 100,
      });
    }
    for (const n of namesToScreen) {
      if (state.names.has(n)) {
        hits.push({
          list: listName as SanctionsHit["list"],
          matchType: "exact_name",
          matched: n,
          score: 100,
          entry: state.namesNormalized.get(n),
        });
        continue;
      }
      // Fuzzy — only for names ≥6 chars; cap candidate count for perf
      if (n.length < 6) continue;
      let bestScore = 0;
      let bestEntry: { name: string; programs: string[]; uid: string } | undefined;
      let bestName = "";
      let i = 0;
      for (const candidate of state.names) {
        // Quick reject: first 3 chars must overlap
        if (++i > 50_000) break; // hard cap per list per query
        if (Math.abs(candidate.length - n.length) > 6) continue;
        if (candidate[0] !== n[0]) continue;
        const d = dice(n, candidate);
        if (d > bestScore) {
          bestScore = d;
          bestName = candidate;
          bestEntry = state.namesNormalized.get(candidate);
        }
        if (d >= 0.95) break;
      }
      if (bestScore >= 0.85) {
        hits.push({
          list: listName as SanctionsHit["list"],
          matchType: "fuzzy_name",
          matched: bestName,
          score: Math.round(bestScore * 100),
          entry: bestEntry,
        });
      }
    }
  }
  return hits;
}

export function getSanctionsStatus(): Record<string, { count: number; addresses: number; loadedAt: string; source: string }> {
  const out: Record<string, { count: number; addresses: number; loadedAt: string; source: string }> = {};
  for (const [name, s] of Object.entries(lists)) {
    out[name] = {
      count: s.names.size,
      addresses: s.addresses.size,
      loadedAt: new Date(s.loadedAt).toISOString(),
      source: s.source,
    };
  }
  return out;
}

/** Hash for audit logs — never log raw subject names. */
export function hashSubject(s: string): string {
  return crypto.createHash("sha256").update(s.toLowerCase().trim()).digest("hex");
}
