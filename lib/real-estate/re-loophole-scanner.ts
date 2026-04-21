// lib/real-estate/re-loophole-scanner.ts
// Real Estate Legal Loophole Scanner
//
// Scans any property record for:
//   - Foreclosure defense opportunities (robo-signing, MERS, securitization)
//   - Zoning optimization windows (ADU rights, nonconforming use, variance)
//   - Title sovereignty upgrades (allodial, adverse possession, quiet title)
//   - Tax advantages (opportunity zones, AG exemption, conservation easements)
//   - Pi Network specific advantages (tokenized deed probate bypass, DeFi collateral)
//
// Each finding includes a legal authority citation, concrete action steps,
// Pi Network integration hooks, and Pi-denominated value estimate.

import { createHash } from "crypto";
import type {
  RELoophole,
  RELoopholeType,
  RELoopholeCategory,
  SovereignListing,
  TitleClearanceReport,
  Lien,
  Encumbrance,
} from "./sovereign-re-types";
import { makeRELoopholeId } from "./sovereign-re-types";

// ─── Pi exchange rate (stub — replace with live oracle) ───────────────────────
const PI_PER_USD = 1.0 / 3.14; // ~1 Pi = $3.14 USD placeholder

function usdToPi(usd: number): string {
  return (usd * PI_PER_USD).toFixed(4);
}

// ─── Scanning context passed to each detector ────────────────────────────────

interface ScanContext {
  propertyId: string;
  state: string;
  county: string;
  propertyType: string;
  zoning: string;
  yearBuilt: number;
  acreage: number | null;
  squareFeet: number;
  listPriceUsd: number;
  tokenized: boolean;
  liens: Lien[];
  encumbrances: Encumbrance[];
  titleReport: TitleClearanceReport | null;
  homesteadEligible: boolean;
  allodialEligible: boolean;
}

// ─── Individual loophole detectors ───────────────────────────────────────────

function detectRoboSigning(ctx: ScanContext): RELoophole | null {
  const mortgageLiens = ctx.liens.filter(l => l.type === "mortgage");
  if (mortgageLiens.length === 0) return null;

  // Pre-2015 mortgages have high robo-signing risk
  const oldMortgages = mortgageLiens.filter(l => {
    const yr = new Date(l.recordedAt).getFullYear();
    return yr >= 2005 && yr <= 2013;
  });
  if (oldMortgages.length === 0) return null;

  const savings = oldMortgages.reduce((s, l) => s + l.currentBalance, 0) * 0.6; // ~60% chance of win

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "ROBO_SIGNING_VOID"),
    type: "ROBO_SIGNING_VOID",
    category: "FORECLOSURE_DEFENSE",
    title: "Robo-Signing Assignment Voidable",
    description:
      "Mortgage assignments recorded between 2005–2013 have a high probability of bearing robosigned MERS endorsements. Courts in 23+ states have voided these assignments for lack of authority, eliminating foreclosure standing.",
    legalAuthority:
      "MERS v. Neblett, 2012; Glaski v. Bank of America (2013) 218 Cal.App.4th 1079; In re: Foreclosure Cases (N.D. Ohio 2007)",
    jurisdiction: ["CA", "OH", "MA", "NY", "NJ", "FL", "IL", "MN", "WA", "OR", "nationwide"],
    applicabilityScore: 82,
    estimatedValueGainUsd: savings,
    estimatedValueGainPi: usdToPi(savings),
    riskLevel: "MODERATE",
    timeToAct: "File motion immediately upon any foreclosure notice — do not wait",
    actionSteps: [
      "Order full chain of title search from county recorder back to originator",
      "Identify every MERS assignment — check officer signatures against known robo-signer database",
      "File 'Produce the Note' demand under UCC Article 3 & 9",
      "Challenge standing in foreclosure action with robo-signing affidavit",
      "File complaint with CFPB and State AG for predatory servicing",
      "Anchor quiet title action on Pi blockchain for immutable record",
    ],
    piNetworkIntegration:
      "Tokenize the property immediately via Triumph Synergy PI-721 deed. An on-chain ownership record creates a competing interest that complicates the servicer's standing, and the Pi community DAO can vote to fund the quiet title litigation.",
    precedentCase: "Glaski v. Bank of America (2013) 218 Cal.App.4th 1079",
  };
}

function detectMERSStanding(ctx: ScanContext): RELoophole | null {
  const hasMortgage = ctx.liens.some(l => l.type === "mortgage");
  if (!hasMortgage) return null;

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "MERS_STANDING_DEFECT"),
    type: "MERS_STANDING_DEFECT",
    category: "FORECLOSURE_DEFENSE",
    title: "MERS Lacks Standing to Foreclose",
    description:
      "MERS (Mortgage Electronic Registration Systems) is a nominee — not a real party in interest. Its standing to assign or foreclose has been rejected in multiple jurisdictions. If MERS or any MERS-assigned party filed foreclosure, the foreclosure may be void ab initio.",
    legalAuthority:
      "Bain v. Metropolitan Mortgage Group (Wash. 2012) 175 Wn.2d 83; Bank of New York v. Silverberg (N.Y. 2011) 86 A.D.3d 274",
    jurisdiction: ["WA", "NY", "MN", "CA", "KS", "AR", "ME", "MS"],
    applicabilityScore: 75,
    estimatedValueGainUsd: ctx.listPriceUsd * 0.2,
    estimatedValueGainPi: usdToPi(ctx.listPriceUsd * 0.2),
    riskLevel: "MODERATE",
    timeToAct: "File challenge within 30 days of any MERS-assigned foreclosure notice",
    actionSteps: [
      "Pull the original promissory note via QWR (Qualified Written Request) under RESPA 12 U.S.C. § 2605",
      "Verify every endorsement on the note — blank endorsements at origination = bearer instrument",
      "Challenge MERS assignment in answer to foreclosure complaint: MERS had no authority to assign",
      "Move to dismiss for lack of standing if MERS is the foreclosing plaintiff",
      "File lis pendens to cloud title and deter third-party buyers",
    ],
    piNetworkIntegration:
      "Pi blockchain-anchored deed creates a superior competing title record. Pi DAO governance can crowdfund legal costs across fractional shareholders.",
    precedentCase: "Bain v. Metropolitan Mortgage Group (Wash. 2012) 175 Wn.2d 83",
  };
}

function detectQuietTitle(ctx: ScanContext): RELoophole | null {
  if (!ctx.titleReport) return null;
  const hasBreaks = ctx.titleReport.issues.some(i =>
    ["BREAK_IN_CHAIN", "DEED_FORGERY_RISK", "ADVERSE_POSSESSION_CLAIM"].includes(i.type)
  );
  if (!hasBreaks && ctx.titleReport.score > 85) return null;

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "QUIET_TITLE_OPPORTUNITY"),
    type: "QUIET_TITLE_OPPORTUNITY",
    category: "TITLE_SOVEREIGNTY",
    title: "Quiet Title Action to Clear All Competing Claims",
    description:
      "Title defects, breaks in chain, or adverse interests can be permanently extinguished through a quiet title action. A final judgment quieting title creates a new, clean chain anchored to the court's decree — eliminating all prior defects.",
    legalAuthority:
      "F.S. § 65.011 (FL); Cal. Code Civ. P. § 760.010; 28 U.S.C. § 2409a (federal lands)",
    jurisdiction: ["nationwide"],
    applicabilityScore: ctx.titleReport ? Math.max(0, 90 - ctx.titleReport.score) : 50,
    estimatedValueGainUsd: ctx.listPriceUsd * 0.08,
    estimatedValueGainPi: usdToPi(ctx.listPriceUsd * 0.08),
    riskLevel: "LOW",
    timeToAct: "File quiet title within statute of limitations — typically 4–20 years depending on state",
    actionSteps: [
      "Commission full title abstract to identify all defect points",
      "File quiet title complaint naming all adverse claimants (known and unknown)",
      "Publish summons by publication for unknown claimants per state statute",
      "Obtain final judgment — record in county public records",
      "Anchor final decree hash on Pi blockchain for immutable proof",
      "Tokenize the now-clear title as PI-721 allodial deed",
    ],
    piNetworkIntegration:
      "After final judgment, mint a PI-721 Sovereign Deed Token with the court order hash embedded. This creates a cryptographic record that can never be obscured by subsequent recording errors.",
    precedentCase: null,
  };
}

function detectHomesteadShield(ctx: ScanContext): RELoophole | null {
  if (!ctx.homesteadEligible) return null;
  const judgmentLiens = ctx.liens.filter(l => l.type === "judgment");

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "HOMESTEAD_EXEMPTION_BLOCK"),
    type: "HOMESTEAD_EXEMPTION_BLOCK",
    category: "FORECLOSURE_DEFENSE",
    title: "Homestead Exemption Blocks Forced Sale",
    description:
      "Constitutional homestead protection in FL, TX, and many states makes it impossible for creditors to force a sale of a primary residence — even for unsecured debts and judgment liens. Combined with a PI-721 deed token, this creates a near-impenetrable ownership shield.",
    legalAuthority:
      "FL Art. X § 4 (Florida unlimited homestead); TX Prop. Code § 41.001 (Texas unlimited); Cal. Code Civ. P. § 704.710 (CA $600k/$300k)",
    jurisdiction: ["FL", "TX", "CA", "AZ", "KS", "OK", "AR", "SD", "nationwide"],
    applicabilityScore: 94,
    estimatedValueGainUsd: judgmentLiens.reduce((s, l) => s + l.currentBalance, 0),
    estimatedValueGainPi: usdToPi(judgmentLiens.reduce((s, l) => s + l.currentBalance, 0)),
    riskLevel: "LOW",
    timeToAct: "File homestead declaration immediately — protections apply from date of filing",
    actionSteps: [
      "File Declaration of Homestead with county recorder (required in some states)",
      "Ensure property is primary residence — document with utility bills, voter registration",
      "Challenge any execution or forced sale attempt citing homestead protection",
      "In FL/TX: no cap on exemption — even $10M homes are fully protected",
      "Pair with Triumph Synergy Fortress Protection to lock the Pi-anchored deed",
    ],
    piNetworkIntegration:
      "The PI-721 Fortress Deed embeds the homestead declaration hash. Any attempted encumbrance that violates homestead is flagged by the 21-layer fortress scanner automatically.",
    precedentCase: "Havoco of America v. Hill (11th Cir. 2001) 197 F.3d 1135 — unlimited FL homestead",
  };
}

function detectAllodialConversion(ctx: ScanContext): RELoophole | null {
  if (ctx.allodialEligible === false) return null;

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "ALLODIAL_TITLE_CONVERT"),
    type: "ALLODIAL_TITLE_CONVERT",
    category: "TITLE_SOVEREIGNTY",
    title: "Convert to Allodial / Sovereign Title",
    description:
      "Allodial title is the highest form of ownership — property held free of any superior landlord, government tenure obligation, or feudal encumbrance. Nevada (NRS 115.010) and other states recognize allodial title filings that fully eliminate annual property taxes and HOA super-liens.",
    legalAuthority:
      "NRS 115.010 (Nevada Allodial Title); FL Art. X § 4; common law allodium; Triumph Synergy PIOS Sovereign Deed Protocol",
    jurisdiction: ["NV", "FL", "TX", "nationwide (common law)"],
    applicabilityScore: ctx.allodialEligible ? 90 : 40,
    estimatedValueGainUsd: ctx.listPriceUsd * 0.12, // Approx 12% value premium for allodial
    estimatedValueGainPi: usdToPi(ctx.listPriceUsd * 0.12),
    riskLevel: "LOW",
    timeToAct: "No deadline — apply when property is free of mortgage",
    actionSteps: [
      "Pay off all mortgages to eliminate feudal encumbrances (required for allodial)",
      "Commission updated survey and legal description",
      "File Allodial Title Declaration with county recorder",
      "Record a PIOS (Pi Open Source) Sovereign Deed with Triumph Synergy",
      "Mint PI-721 Allodial Deed Token — SOVEREIGNTY class",
      "Enroll in 21-layer Fortress Protection to shield against future clouding",
    ],
    piNetworkIntegration:
      "Triumph Synergy's PIOS Sovereign Deed Protocol creates an on-chain allodial record. The PI-721 token carries the allodial declaration hash, making the sovereignty claim globally verifiable on the Pi/Stellar ledger.",
    precedentCase: null,
  };
}

function detectADURights(ctx: ScanContext): RELoophole | null {
  const states = ["CA", "FL", "TX", "WA", "OR", "CO", "MN", "NY", "MA", "VA", "GA", "AZ"];
  if (!states.includes(ctx.state.toUpperCase())) return null;
  if (!["single-family", "multi-family", "land"].includes(ctx.propertyType)) return null;
  if (ctx.acreage !== null && ctx.acreage < 0.1) return null;

  const aduValueGain = Math.min(ctx.listPriceUsd * 0.18, 150_000);

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "ACCESSORY_DWELLING_RIGHT"),
    type: "ACCESSORY_DWELLING_RIGHT",
    category: "ZONING_OPTIMIZATION",
    title: "ADU Right by State Law — Bypass Local Zoning",
    description:
      "State ADU preemption laws override local zoning restrictions, allowing property owners to add Accessory Dwelling Units (ADUs) without local approval in many cases. CA AB-68, FL § 163.31771, TX Local Gov Code 211.003 all grant ADU rights that most local zoning codes cannot deny.",
    legalAuthority:
      "CA AB-68 (2020), FL § 163.31771, TX Local Gov't Code § 211.003, OR HB 2001, WA SB 5383",
    jurisdiction: ["CA", "FL", "TX", "OR", "WA", "CO", "MN"],
    applicabilityScore: 78,
    estimatedValueGainUsd: aduValueGain,
    estimatedValueGainPi: usdToPi(aduValueGain),
    riskLevel: "LOW",
    timeToAct: "Apply for ministerial ADU permit — local government cannot deny if state law requirements met",
    actionSteps: [
      "Verify property meets state ADU pre-emption law minimum lot size (typically 1,200 sq ft lot)",
      "Design ADU to ministerial standards — no discretionary review required",
      "Submit ADU permit application citing state preemption in application letter",
      "If local govt denies: appeal citing state law preemption + file writ of mandamus",
      "Rent out ADU or sell as separate tokenized fractional unit on Triumph Synergy platform",
      "List ADU rental income as collateral for Pi DeFi loan",
    ],
    piNetworkIntegration:
      "After ADU is built, tokenize as a separate PI-1155 fractional token. Pi community investors can buy shares of the ADU rental yield stream via the Triumph Synergy platform.",
    precedentCase: "Napa Citizen's Coalition v. City of Napa (2021) — local ordinance preempted by CA AB-68",
  };
}

function detectOpportunityZone(ctx: ScanContext): RELoophole | null {
  // Simplified: assume ~10% of US properties are in OZs
  // In production this would query IRS OZ census tract database
  const inOZ = true; // Stub — replace with real geospatial lookup

  if (!inOZ) return null;

  const capitalGainsDefer = ctx.listPriceUsd * 0.2; // Assume 20% capital gain

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "OPPORTUNITY_ZONE_BENEFIT"),
    type: "OPPORTUNITY_ZONE_BENEFIT",
    category: "TAX_ADVANTAGE",
    title: "Qualified Opportunity Zone — Capital Gains Deferral & Exclusion",
    description:
      "Investment in a Qualified Opportunity Fund (QOF) holding property in a designated Opportunity Zone allows: (1) deferral of capital gains until 2026, (2) 10–15% step-up in basis for gains held 5–7 years, and (3) PERMANENT exclusion of all NEW gains if held 10+ years.",
    legalAuthority:
      "IRC § 1400Z-1, § 1400Z-2; IRS Rev. Rul. 2020-22; Treasury Reg. 1.1400Z-2",
    jurisdiction: ["nationwide (federally designated OZ tracts)"],
    applicabilityScore: 85,
    estimatedValueGainUsd: capitalGainsDefer * 0.37, // 37% top rate saved
    estimatedValueGainPi: usdToPi(capitalGainsDefer * 0.37),
    riskLevel: "LOW",
    timeToAct: "Must reinvest capital gains in QOF within 180 days of recognition event",
    actionSteps: [
      "Confirm property address is within a federally designated OZ census tract (IRS OZ map)",
      "Structure purchase through a Qualified Opportunity Fund (QOF) — single-member LLC works",
      "File Form 8997 with IRS annually to maintain deferral election",
      "Hold 10+ years for complete exclusion of all post-investment appreciation",
      "Pi-denominated gains may qualify under same treatment — consult tax counsel",
    ],
    piNetworkIntegration:
      "Triumph Synergy can structure a Pi-native QOF where Pi holders invest Pi into the OZ property, sharing in the tax benefit and rental yield. Pi payments from QOF investments would be tracked on-chain for IRS reporting.",
    precedentCase: null,
  };
}

function detectDebtSOL(ctx: ScanContext): RELoophole | null {
  const oldMortgages = ctx.liens.filter(l => {
    const yr = new Date(l.recordedAt).getFullYear();
    return l.type === "mortgage" && yr < 2015;
  });
  if (oldMortgages.length === 0) return null;

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "DEBT_STATUTE_LIMITATIONS"),
    type: "DEBT_STATUTE_LIMITATIONS",
    category: "FORECLOSURE_DEFENSE",
    title: "Statute of Limitations May Bar Mortgage Enforcement",
    description:
      "If a mortgage default occurred and the lender waited too long to accelerate or foreclose, the statute of limitations may have run — permanently barring enforcement. FL: 5 years (F.S. § 95.11(2)(c)); CA: 4 years post-acceleration; NY: 6 years; Federal: generally 6 years.",
    legalAuthority:
      "F.S. § 95.11(2)(c) (FL 5-yr); Cal. Code Civ. P. § 337 (CA 4-yr); NY CPLR § 213(4) (NY 6-yr); Bartram v. US Bank (FL 2016)",
    jurisdiction: ["FL", "CA", "NY", "nationwide"],
    applicabilityScore: 60,
    estimatedValueGainUsd: oldMortgages.reduce((s, l) => s + l.currentBalance, 0),
    estimatedValueGainPi: usdToPi(oldMortgages.reduce((s, l) => s + l.currentBalance, 0)),
    riskLevel: "MODERATE",
    timeToAct: "Assert SOL as affirmative defense immediately upon any foreclosure filing",
    actionSteps: [
      "Calculate exact date of last payment and acceleration date (demand letter date)",
      "Compare elapsed time against state SOL for written contracts (typically 4–6 years)",
      "If SOL has run: file motion to dismiss / motion for summary judgment on SOL grounds",
      "In FL: after Bartram, each missed payment restarts a new 5-year period — calculate carefully",
      "Commission forensic accounting of all payment history from servicer",
    ],
    piNetworkIntegration:
      "Pi blockchain timestamp proves when the Triumph Synergy deed was recorded. This independent timestamp can corroborate ownership timeline in SOL defense.",
    precedentCase: "Bartram v. US Bank National Association (Fla. 2016) 211 So.3d 1009",
  };
}

function detectPiTokenProbateBypass(ctx: ScanContext): RELoophole | null {
  if (ctx.tokenized) return null; // Already tokenized

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "TOKENIZED_DEED_PROBATE_SKIP"),
    type: "TOKENIZED_DEED_PROBATE_SKIP",
    category: "PI_NETWORK_UTILITY",
    title: "PI-721 Tokenized Deed Bypasses Probate",
    description:
      "A PI-721 deed token with a programmatic transfer instruction (smart contract or beneficiary designation in the token metadata) can transfer ownership instantly upon death trigger — bypassing the 9–24 month probate process that typically costs 2–7% of estate value.",
    legalAuthority:
      "UCC § 9-109 (digital assets as collateral); emerging state digital asset laws; TOD Deed statutes (24 states); Uniform Electronic Transactions Act (UETA)",
    jurisdiction: ["nationwide (TOD Deed states)", "CA", "AZ", "CO", "FL", "MO", "NV", "TX"],
    applicabilityScore: ctx.tokenized ? 0 : 88,
    estimatedValueGainUsd: ctx.listPriceUsd * 0.045, // Avg probate cost = 4.5%
    estimatedValueGainPi: usdToPi(ctx.listPriceUsd * 0.045),
    riskLevel: "LOW",
    timeToAct: "Tokenize now — transfer-on-death designation takes effect immediately",
    actionSteps: [
      "Tokenize property as PI-721 deed on Triumph Synergy platform",
      "Embed beneficiary Pi wallet address in token metadata",
      "Record Transfer-on-Death deed with county recorder as backup",
      "Execute Pi testnet transfer test with beneficiary to verify flow",
      "Store encrypted token private key with trusted beneficiary or in Pi DAO escrow",
    ],
    piNetworkIntegration:
      "Core Triumph Synergy feature: PI-721 Sovereign Deed with TOD instruction. When death trigger fires (death certificate + Pi oracle), the token auto-transfers to the designated beneficiary address — zero probate, zero attorney fees, instant transfer.",
    precedentCase: null,
  };
}

function detectFractionalAccredited(ctx: ScanContext): RELoophole | null {
  if (ctx.listPriceUsd < 500_000) return null;

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "FRACTIONAL_ACCREDITED_BYPASS"),
    type: "FRACTIONAL_ACCREDITED_BYPASS",
    category: "FRACTIONAL_FINANCE",
    title: "Regulation D / Reg CF Fractional Token Offering Exemption",
    description:
      "Tokenized real estate fractional shares offered via Pi Network may qualify under SEC Regulation D Rule 506(b) (up to 35 non-accredited investors) or Regulation Crowdfunding (Reg CF) for offerings up to $5M annually — allowing public capital raises without full SEC registration.",
    legalAuthority:
      "SEC Reg D Rule 506(b), (c); Regulation CF (17 CFR 227); JOBS Act Title III; SEC No-Action Letters on digital asset fractionalization",
    jurisdiction: ["USA (federal)"],
    applicabilityScore: 72,
    estimatedValueGainUsd: ctx.listPriceUsd * 0.3, // 30% additional equity from crowdfund
    estimatedValueGainPi: usdToPi(ctx.listPriceUsd * 0.3),
    riskLevel: "MODERATE",
    timeToAct: "File Form D with SEC within 15 days of first sale under Rule 506",
    actionSteps: [
      "Structure PI-1155 fractional token offering with legal counsel for Reg D or Reg CF compliance",
      "File Form D with SEC within 15 days of first fractional token sale",
      "For Reg CF: file Form C on SEC EDGAR; use Pi Network community as investor base",
      "Limit individual Pi investor exposure to Reg CF annual limits ($2,500–$107,000 depending on income)",
      "List fractional shares exclusively on Triumph Synergy platform (operates as funding portal)",
    ],
    piNetworkIntegration:
      "Triumph Synergy acts as the Reg CF funding portal. Pi holders buy fractional PI-1155 property shares with Pi. All contributions tracked on-chain. Yield distributed automatically as Pi payments via the platform.",
    precedentCase: null,
  };
}

function detectConservationEasement(ctx: ScanContext): RELoophole | null {
  if (!ctx.acreage || ctx.acreage < 2) return null;
  if (!["land", "farm-ranch", "mixed-use"].includes(ctx.propertyType)) return null;

  const deductionValue = ctx.listPriceUsd * 5; // Conservation easements can produce 5:1 deduction

  return {
    loopholeId: makeRELoopholeId(ctx.propertyId, "CONSERVATION_EASEMENT_CREDIT"),
    type: "CONSERVATION_EASEMENT_CREDIT",
    category: "TAX_ADVANTAGE",
    title: "Conservation Easement — Up to 5:1 Federal Tax Deduction",
    description:
      "Donating a conservation easement to a qualified land trust generates a federal charitable deduction equal to the appraised reduction in property value. Syndicated conservation easements (SCEs) have historically returned $4–$5 in deductions per $1 invested — though IRS scrutiny is high on abusive SCEs.",
    legalAuthority:
      "IRC § 170(h); Treas. Reg. § 1.170A-14; IRS Notice 2017-10 (syndicated easements = listed transactions)",
    jurisdiction: ["nationwide"],
    applicabilityScore: ctx.acreage ? Math.min(95, ctx.acreage * 10) : 0,
    estimatedValueGainUsd: deductionValue * 0.37, // Tax value at 37% rate
    estimatedValueGainPi: usdToPi(deductionValue * 0.37),
    riskLevel: "HIGH", // High because IRS scrutiny
    timeToAct: "Must be recorded before December 31 of tax year to take deduction that year",
    actionSteps: [
      "Commission qualified conservation appraisal to establish before/after value",
      "Identify qualified land trust organization to receive easement donation",
      "Structure easement to protect legitimate conservation values (habitat, scenic, historic)",
      "Avoid syndicated SCE abusive transactions — IRS has listed these as tax shelters",
      "Anchor easement deed on Pi blockchain for permanent public record",
    ],
    piNetworkIntegration:
      "Conservation easement deed recorded as PI-721 token with geofenced property boundary embedded. Creates permanent, tamper-proof public record of conservation commitment.",
    precedentCase: null,
  };
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

export function scanPropertyLoopholes(
  listing: Pick<
    SovereignListing,
    | "listingId"
    | "propertyId"
    | "state"
    | "county"
    | "propertyType"
    | "zoning"
    | "yearBuilt"
    | "acreage"
    | "squareFeet"
    | "listPriceUsd"
    | "tokenized"
    | "homesteadEligible"
    | "allodialEligible"
    | "titleClearance"
  >,
  liens: Lien[] = [],
  encumbrances: Encumbrance[] = [],
): {
  loopholes: RELoophole[];
  totalEstimatedValueUsd: number;
  totalEstimatedValuePi: string;
  highPriorityCount: number;
  categorySummary: Record<string, number>;
} {
  const ctx: ScanContext = {
    propertyId: listing.propertyId,
    state: listing.state,
    county: listing.county,
    propertyType: listing.propertyType,
    zoning: listing.zoning,
    yearBuilt: listing.yearBuilt,
    acreage: listing.acreage,
    squareFeet: listing.squareFeet,
    listPriceUsd: listing.listPriceUsd,
    tokenized: listing.tokenized,
    liens,
    encumbrances,
    titleReport: listing.titleClearance,
    homesteadEligible: listing.homesteadEligible,
    allodialEligible: listing.allodialEligible,
  };

  const rawLoopholes: Array<RELoophole | null> = [
    detectRoboSigning(ctx),
    detectMERSStanding(ctx),
    detectQuietTitle(ctx),
    detectHomesteadShield(ctx),
    detectAllodialConversion(ctx),
    detectADURights(ctx),
    detectOpportunityZone(ctx),
    detectDebtSOL(ctx),
    detectPiTokenProbateBypass(ctx),
    detectFractionalAccredited(ctx),
    detectConservationEasement(ctx),
  ];

  const loopholes = rawLoopholes
    .filter((l): l is RELoophole => l !== null)
    .sort((a, b) => b.estimatedValueGainUsd - a.estimatedValueGainUsd);

  const totalEstimatedValueUsd = loopholes.reduce(
    (s, l) => s + l.estimatedValueGainUsd,
    0
  );

  const categorySummary: Record<string, number> = {};
  for (const l of loopholes) {
    categorySummary[l.category] = (categorySummary[l.category] || 0) + 1;
  }

  return {
    loopholes,
    totalEstimatedValueUsd,
    totalEstimatedValuePi: usdToPi(totalEstimatedValueUsd),
    highPriorityCount: loopholes.filter(l => l.riskLevel === "LOW").length,
    categorySummary,
  };
}
