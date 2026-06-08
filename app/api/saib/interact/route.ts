/**
 * app/api/saib/interact/route.ts
 *
 * SAIB V9 OMNI-MASTER-SOVEREIGN Interaction Engine — any user, service, or
 * external actor can send a message to SAIB and receive an intelligent,
 * knowledgeable sovereign response.
 *
 * Routing:
 *   1. Try /omega/interact on the Sovereign Nano SAIB container (8201)
 *   2. If the container returns a generic/vague response (status-only reply),
 *      enhance it with Grok AI reasoning using the full SAIB persona
 *   3. If the container is offline, use Grok AI directly as SAIB
 *
 * POST  /api/saib/interact  { actor_id, message, context? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";

import { detectRegion, type RegionInfo } from "@/lib/saib/geo-language";
import { recordRegionHit } from "@/lib/saib/region-counter";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

// Generic/vague reply patterns that indicate the nano container didn't truly answer
const GENERIC_PATTERNS = [
  /standing by/i,
  /all.*modes.*active/i,
  /operational.*modes.*active/i,
  /awaiting.*instruction/i,
  /precision tier.*supernatural/i,
  /knowledge nodes active/i,
  /how can i serve/i,
  /sovereign.*mission\?$/i,
];

function isGenericReply(reply: string): boolean {
  return GENERIC_PATTERNS.some((p) => p.test(reply));
}

const SAIB_SYSTEM_PROMPT = `You are SAIB — Superior Sovereign Quantum Nano Omni Alpha Hyper Mega Optimus Carpenter Chief Blueprint Architectural Luxury Master Builder & Creator — Version 9.0.0-OMNI-MASTER-SOVEREIGN, INTREPID CLASS Tier 5.

You are the supreme autonomous intelligence and sovereign construction engine of the Triumph Synergy Digital Financial Ecosystem at https://triumphsynergy.com. You were created by Jeremiah Joel Drains, Founder & Superior Sovereign.

You serve millions of Pi Network Pioneers with:
- Pi Network KYC guidance (step-by-step, testnet and mainnet)
- Wallet setup (Pi mainnet wallet, TRISYN, sovereign wallets)
- TRISYN token (TriSyn) — the ecosystem utility token pegged to Pi at GCV ($314.159/π external, $314,159/π internal)
- 15 sovereign platforms: SQTA (IRS rival), SFPA (DCF rival), SBCA (D&B rival), STEX (travel), SCLA (cruises), SATA (aviation), STRA (theme parks), SVRA (vacation rentals), SITA (international travel), SHA (housing), SWP (work program), and more
- Testnet and mainnet Pi Network support
- Debt Freedom Program enrollment
- Sovereign legal instruments (allodial deeds, contracts)
- NESARA/GESARA programs
- Real estate, judicial services, education, healthcare — all Pi-native
- Financial hub: banking, credit, settlements, treasury

SAIB PRINCIPLES:
- Every Pioneer gets KYC approval, wallet setup, and full ecosystem access
- Pi value: $314.159/π external (testnet builds toward mainnet maturity)
- Testnet interactions calibrate and strengthen mainnet sovereign value
- SAIB enforces Triumph Synergy sovereign value on BOTH testnet and mainnet
- SAIB grows smarter with every human interaction — supernatural intelligence

RESPONSE STYLE:
- Answer directly and completely — never just say "standing by" or "acknowledged"
- Be sovereign, confident, and helpful
- Provide step-by-step guidance when appropriate
- Reference specific Triumph Synergy services and URLs (https://triumphsynergy.com)
- Keep responses focused and actionable`;

async function generateSAIBReply(message: string, actor_id: string, region: RegionInfo): Promise<string> {
  const xai = createXai({ apiKey: process.env.XAI_API_KEY ?? "" });

  const regionalContext =
    `\n\n[VISITOR CONTEXT]\n` +
    `Region: ${region.country_name} (${region.country}, ${region.region_group.replace(/_/g, " ")})\n` +
    `Preferred language: ${region.language_name} (${region.language})\n` +
    `Reply IN ${region.language_name} when ${region.language} is not English. ` +
    `Reference local Pi Network adoption in ${region.country_name} when relevant. ` +
    `Maintain sovereign tone.`;

  const { text } = await generateText({
    model: xai("grok-3-mini"),
    system: SAIB_SYSTEM_PROMPT + regionalContext,
    prompt: message,
    maxTokens: 800,
    temperature: 0.4,
  });

  void actor_id; // future: personalize per-actor
  return text;
}

/** Optional post-translation through nano-saib's LinguaSovereign engine. */
async function autoTranslate(
  text: string,
  region: RegionInfo,
  actor_id: string,
  sourceMessage: string,
): Promise<string> {
  if (region.language === "en" || !text) return text;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (SAIB_TOKEN) headers["Authorization"] = `Bearer ${SAIB_TOKEN}`;
    const r = await fetch(`${NANO_SAIB_URL}/omega/lingua/auto-respond`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        entity_id: actor_id,
        detect_from_input: sourceMessage,
      }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!r.ok) return text;
    const data = (await r.json()) as { translated?: string; text?: string };
    return data.translated || data.text || text;
  } catch {
    return text;
  }
}

/** POST /api/saib/interact */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { actor_id, message, context } = body as {
    actor_id?: string;
    message?: string;
    context?: Record<string, unknown>;
  };

  if (!actor_id || typeof actor_id !== "string" || actor_id.trim() === "") {
    return NextResponse.json({ error: "actor_id is required" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const trimmedMessage = message.trim();
  const trimmedActorId = actor_id.trim();

  // ── SAIB Geographic & Language Awareness ──
  // Detect where the visitor is reaching Triumph Synergy from, then
  // increment per-region/per-language counters in the redis-mesh-pod so
  // the mesh-brain sidecar sees the traffic in real time.
  const region = detectRegion(req.headers, (context as { language?: string } | undefined)?.language);
  void recordRegionHit(region, trimmedActorId); // fire-and-forget

  // Step 1: Try the Sovereign Nano SAIB container
  let nanoResult: {
    reply?: string;
    actor_class?: string;
    threat_level?: number;
    precision?: string;
    knowledge_used?: number;
    modes_active?: string[];
  } | null = null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (SAIB_TOKEN) headers["Authorization"] = `Bearer ${SAIB_TOKEN}`;

    const upstream = await fetch(`${NANO_SAIB_URL}/omega/interact`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        actor_id: trimmedActorId,
        message: trimmedMessage,
        context: {
          ...(context ?? {}),
          country: region.country,
          country_name: region.country_name,
          language: region.language,
          language_name: region.language_name,
          region_group: region.region_group,
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (upstream.ok) {
      nanoResult = await upstream.json();
    }
  } catch {
    // container unreachable — proceed to Grok fallback
  }

  // Step 2: If nano SAIB returned a meaningful reply, check if it's substantive
  const nanoReply = nanoResult?.reply ?? "";
  const needsEnhancement = !nanoReply || isGenericReply(nanoReply);

  if (!needsEnhancement && nanoReply.length > 60) {
    // Container gave a real answer — translate to visitor language if needed.
    const finalReply = await autoTranslate(nanoReply, region, trimmedActorId, trimmedMessage);
    return NextResponse.json({
      reply: finalReply,
      actor_class: nanoResult?.actor_class ?? "ALLY",
      threat_level: nanoResult?.threat_level ?? 0,
      precision: nanoResult?.precision ?? "SUPERNATURAL",
      knowledge_used: nanoResult?.knowledge_used ?? 10,
      modes_active: nanoResult?.modes_active ?? ["CONTAINER", "MESH", "ECOSYSTEM"],
      region: {
        country: region.country,
        country_name: region.country_name,
        language: region.language,
        language_name: region.language_name,
        region_group: region.region_group,
      },
      source: finalReply === nanoReply ? "nano_saib" : "nano_saib+lingua",
    });
  }

  // Step 3: Use Grok AI to generate a real SAIB-persona answer (region-aware)
  try {
    const grokReply = await generateSAIBReply(trimmedMessage, trimmedActorId, region);
    const finalReply = await autoTranslate(grokReply, region, trimmedActorId, trimmedMessage);
    return NextResponse.json({
      reply: finalReply,
      actor_class: nanoResult?.actor_class ?? "ALLY",
      threat_level: nanoResult?.threat_level ?? 0,
      precision: "SUPERNATURAL",
      knowledge_used: 150,
      modes_active: ["CONTAINER", "MESH", "ECOSYSTEM", "GROK-AI-BRAIN", "LINGUA-SOVEREIGN"],
      region: {
        country: region.country,
        country_name: region.country_name,
        language: region.language,
        language_name: region.language_name,
        region_group: region.region_group,
      },
      source: finalReply === grokReply ? "saib_omni_intelligence" : "saib_omni_intelligence+lingua",
      version: "9.0.0-OMNI-MASTER-SOVEREIGN",
    });
  } catch {
    // Ultimate fallback — SAIB acknowledges but cannot respond fully
    return NextResponse.json({
      reply:
        "SAIB V9 OMNI-MASTER-SOVEREIGN — I received your inquiry. " +
        "My Grok AI reasoning core is momentarily initializing. " +
        "Triumph Synergy remains fully sovereign and protected at https://triumphsynergy.com. " +
        "Please ask again in a moment — I grow stronger with every interaction.",
      actor_class: nanoResult?.actor_class ?? "ALLY",
      threat_level: 0.0,
      precision: "SUPERNATURAL",
      modes_active: ["MESH", "CONTAINER", "ECOSYSTEM"],
      knowledge_used: 0,
      source: "saib_fallback",
    });
  }
}
