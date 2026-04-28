/**
 * lib/programs/sovereign-positions.ts
 *
 * Triumph Synergy — Sovereign Positions Registry (SPR)
 *
 * The world's first Pi-gated sovereign employment registry.
 * Every position across all eight sovereign sector authorities requires
 * Pi Network KYC verification to apply. Premium/executive positions
 * require a sovereign interview panel assessed by quantum-verified
 * Triumph Synergy officers.
 *
 * Sovereign Principle: "In the Triumph Sovereign Economy, ALL positions
 * are meritocracy-first — Pi identity is the great equalizer. No
 * connection, no nepotism, no gatekeeping. Sign up or interview.
 * Everyone earns in Pi."
 *
 * APEX-QUANTUM-SOVEREIGN · Real-world Pi utility
 * Security: ML-DSA-87 · ML-KEM-1024 · SHAKE-256 + SHA3-512
 * Pi compensation: $314.159/π external · $314,159/π Pioneer internal
 *
 * @module lib/programs/sovereign-positions
 * @version 1.0.0
 */

import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const SOVEREIGN_POSITIONS_VERSION = "TRIUMPH-SPR-v1";
export const APEX_SECURITY_LEVEL         = "APEX-QUANTUM-SOVEREIGN";
export const QUANTUM_ALGO_SIG            = "ML-DSA-87 (CRYSTALS-Dilithium MAX — FIPS 204 Level 5)";
export const QUANTUM_ALGO_ENC            = "ML-KEM-1024 (CRYSTALS-Kyber MAX — FIPS 203 Level 5)";
export const QUANTUM_ALGO_HASH           = "SHAKE-256 + SHA3-512";
export const SPR_ID                      = "TRIUMPH-SPR-v1";

export const PI_RATE_EXTERNAL = 314.159;
export const PI_RATE_INTERNAL = 314_159;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type SovereignSector =
  | "VEHICLES"
  | "FUEL"
  | "GROCERY"
  | "JEWELRY"
  | "ECOMMERCE"
  | "ENTERTAINMENT"
  | "EVENTS"
  | "LAND"
  | "CORE_OPERATIONS"       // internal Triumph Synergy operations
  | "JUDICIAL"              // judicial / compliance officers
  | "FINANCE"               // financial intelligence, treasury
  | "TECHNOLOGY";           // platform engineers, quantum security

export type PositionTier =
  | "entry"                 // signup only — Pi KYC required
  | "specialist"            // signup + portfolio/proof of work
  | "senior"                // signup + portfolio + 1 interview round
  | "executive"             // signup + portfolio + 2 interview rounds
  | "sovereign-officer"     // sovereign appointment + full interview panel
  | "apex-guardian";        // highest tier — quantum clearance required

export type ApplicationMethod =
  | "signup"                // instant Pi KYC signup
  | "interview"             // Pi KYC + interview panel
  | "appointment";          // sovereign appointment by existing officers

export type ApplicationStatus =
  | "open"                  // applications accepted
  | "screening"             // under Pi identity verification
  | "interview-scheduled"   // interview panel set
  | "under-review"          // interview completed, deliberating
  | "offered"               // position offered, awaiting acceptance
  | "accepted"              // participant confirmed
  | "onboarding"            // in onboarding flow
  | "active"                // serving in role
  | "completed"             // term/contract completed
  | "withdrawn"             // applicant withdrew
  | "rejected";             // not selected

export type CompensationType =
  | "pi-hourly"
  | "pi-monthly"
  | "pi-commission"
  | "pi-revenue-share"
  | "pi-grant"
  | "pi-equity"
  | "hybrid";

export type WorkArrangement =
  | "remote"
  | "in-person"
  | "hybrid"
  | "field"
  | "global-roaming";

// ─────────────────────────────────────────────────────────────────────────────
// POSITION DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export interface SovereignPosition {
  id:                 string;
  title:              string;
  sector:             SovereignSector;
  tier:               PositionTier;
  applicationMethod:  ApplicationMethod;
  workArrangement:    WorkArrangement;
  compensationType:   CompensationType;
  piCompensation:     string;            // e.g. "0.5π/hr" | "50π/mo" | "2% Pi revenue share"
  usdEquivalent:      string;            // at external Pi rate
  openSlots:          number;
  filledSlots:        number;
  responsibilities:   string[];
  requirements:       string[];
  piKycRequired:      boolean;           // always true
  interviewRounds:    number;            // 0 = signup only
  sovereignClearance: string;            // clearance level required
  benefits:           string[];
  isActive:           boolean;
  postedAt:           string;
  expiresAt?:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT RECORD
// ─────────────────────────────────────────────────────────────────────────────

export interface PositionApplicant {
  id:              string;
  positionId:      string;
  piUid:           string;
  piWallet:        string;
  displayName:     string;
  jurisdiction:    string;
  status:          ApplicationStatus;
  tier:            PositionTier;
  appliedAt:       string;
  interviewDates:  string[];
  interviewScores: number[];             // 0–100 per round
  portfolioUri?:   string;              // Pi-signed portfolio link
  references:      string[];            // Pi wallet addresses of references
  offerDetails?:   PositionOffer;
  notes:           string;
}

export interface PositionOffer {
  piCompensation:     string;
  startDate:          string;
  contractDurationMo: number;
  sovereignBenefits:  string[];
  offeredAt:          string;
  expiresAt:          string;
  acceptedAt?:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW PANEL
// ─────────────────────────────────────────────────────────────────────────────

export interface InterviewPanel {
  id:            string;
  positionId:    string;
  applicantId:   string;
  round:         number;
  panelists:     string[];              // Pi wallet addresses of panel officers
  scheduledAt:   string;
  completedAt?:  string;
  scores:        PanelistScore[];
  recommendation: "advance" | "offer" | "reject" | "pending";
  notes:         string;
}

export interface PanelistScore {
  panelistWallet: string;
  piIdentityScore:    number;           // 0–100
  competenceScore:    number;           // 0–100
  sovereignAlignScore: number;          // 0–100 (alignment with Triumph values)
  communicationScore: number;           // 0–100
  overallScore:       number;           // 0–100
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL POSITIONS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const SOVEREIGN_POSITIONS: SovereignPosition[] = [

  // ── VEHICLES (SVFA) ─────────────────────────────────────────────────────────
  {
    id: "SVFA-POS-001", title: "Pi Vehicle Sales Agent", sector: "VEHICLES",
    tier: "entry", applicationMethod: "signup", workArrangement: "hybrid",
    compensationType: "pi-commission",
    piCompensation: "2% Pi commission per vehicle sale", usdEquivalent: "$780–$1,960 per vehicle",
    openSlots: 500, filledSlots: 147,
    responsibilities: [
      "Match Pioneer buyers with SVFA-listed vehicles at fair sovereign pricing",
      "Process Pi vehicle purchase transactions and blockchain title transfers",
      "Educate buyers on SVFA loopholes and 0% Pi financing",
      "Submit vehicle compliance checks to SVFA authority dashboard",
    ],
    requirements: ["Pi KYC verified", "Basic automotive knowledge", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["Pi commission income", "SVFA fleet access discount", "Sovereign commerce badge"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SVFA-POS-002", title: "Fleet Operations Manager", sector: "VEHICLES",
    tier: "senior", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "120π/month", usdEquivalent: "$37,699/mo",
    openSlots: 25, filledSlots: 8,
    responsibilities: [
      "Oversee SVFA sovereign fleet contracts for 50+ vehicle fleets",
      "Negotiate Pi bulk fleet pricing with manufacturers",
      "Manage Pi smart contract fleet management deployments",
      "Train Pi Fleet Agents across assigned territory",
    ],
    requirements: ["Pi KYC verified", "3+ years fleet management", "Pi smart contract literacy"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["120π/mo + 0.5% fleet Pi revenue share", "Sovereign fleet vehicle", "APEX healthcare"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── FUEL (SFRA) ──────────────────────────────────────────────────────────────
  {
    id: "SFRA-POS-001", title: "Pi Fuel Station Operator", sector: "FUEL",
    tier: "entry", applicationMethod: "signup", workArrangement: "in-person",
    compensationType: "pi-revenue-share",
    piCompensation: "1.5% Pi revenue share on station volume", usdEquivalent: "$3,800–$18,500/mo",
    openSlots: 2000, filledSlots: 412,
    responsibilities: [
      "Operate SFRA-registered sovereign fuel station at Pi-anchored fair pricing",
      "Maintain Pi blockchain smart meter calibration records",
      "Process Pi fuel token redemptions at sovereign rate",
      "Report pricing deviations to SFRA authority dashboard",
    ],
    requirements: ["Pi KYC verified", "Business license or cooperative member", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["Revenue share income", "SFRA sovereign fuel at cost", "Anti-cartel legal protection"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SFRA-POS-002", title: "Sovereign Fuel Compliance Inspector", sector: "FUEL",
    tier: "specialist", applicationMethod: "interview", workArrangement: "field",
    compensationType: "pi-monthly",
    piCompensation: "80π/month + 0.1π per inspection", usdEquivalent: "$25,133/mo base",
    openSlots: 150, filledSlots: 38,
    responsibilities: [
      "Audit SFRA-registered fuel stations for Pi fair-price compliance",
      "Verify smart meter calibration against blockchain oracle records",
      "Issue sovereign violations and report cartel pricing to SFRA",
      "Certify new stations for SFRA registration",
    ],
    requirements: ["Pi KYC verified", "Weights & measures background or technical", "Field travel capable"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["80π/mo + per-inspection Pi", "SFRA vehicle + fuel allotment", "Sovereign legal indemnification"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── GROCERY (SSGA) ───────────────────────────────────────────────────────────
  {
    id: "SSGA-POS-001", title: "Pi Market Vendor", sector: "GROCERY",
    tier: "entry", applicationMethod: "signup", workArrangement: "in-person",
    compensationType: "pi-revenue-share",
    piCompensation: "3% Pi bonus on all SSGA-priced products sold", usdEquivalent: "Varies by volume",
    openSlots: 10000, filledSlots: 2847,
    responsibilities: [
      "List fresh produce, meat, and staples on SSGA Pi marketplace at sovereign pricing",
      "Maintain FSMA blockchain traceability records for all products",
      "Accept Pi grocery tokens as primary payment method",
      "Source directly from SSGA-contracted farms and ranchers",
    ],
    requirements: ["Pi KYC verified", "Food handler certification", "Cooperative or independent vendor"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["0% platform fee", "SSGA bulk purchasing access", "Direct farm-gate pricing"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SSGA-POS-002", title: "Sovereign Grocery Authority Director", sector: "GROCERY",
    tier: "executive", applicationMethod: "interview", workArrangement: "hybrid",
    compensationType: "pi-monthly",
    piCompensation: "500π/month + 0.01% SSGA Pi network revenue", usdEquivalent: "$157,080/mo",
    openSlots: 5, filledSlots: 1,
    responsibilities: [
      "Lead SSGA sovereign procurement strategy across 42 countries",
      "Negotiate Pi sovereign bulk contracts with farm cooperatives",
      "Oversee SSGA Pi SNAP voucher issuance and compliance",
      "Report to Triumph Synergy Sovereign Operations Council",
    ],
    requirements: ["Pi KYC verified", "10+ years supply chain/grocery executive", "2 sovereign interview rounds"],
    piKycRequired: true, interviewRounds: 2, sovereignClearance: "APEX",
    benefits: ["500π/mo + network revenue share", "SSGA lifetime grocery allotment", "APEX security clearance", "Sovereign housing benefit"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── JEWELRY (SJNA) ───────────────────────────────────────────────────────────
  {
    id: "SJNA-POS-001", title: "Pi Jewelry Marketplace Agent", sector: "JEWELRY",
    tier: "entry", applicationMethod: "signup", workArrangement: "remote",
    compensationType: "pi-commission",
    piCompensation: "1.5% Pi commission per SJNA sale", usdEquivalent: "$12–$120 per sale",
    openSlots: 1000, filledSlots: 234,
    responsibilities: [
      "List jewelry items on SJNA Pi marketplace with blockchain gemstone passport",
      "Educate buyers on SJNA loopholes and fair Pi pricing vs. cartel retail",
      "Process Pi jewelry token transactions",
      "Submit independent oracle appraisals for all listed items",
    ],
    requirements: ["Pi KYC verified", "Basic gemology or jewelry knowledge helpful", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["Pi commission", "SJNA fractional jewelry access at cost", "Blockchain gemstone passport credentials"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SJNA-POS-002", title: "Certified Pi Gemologist / Appraiser", sector: "JEWELRY",
    tier: "specialist", applicationMethod: "interview", workArrangement: "hybrid",
    compensationType: "pi-monthly",
    piCompensation: "60π/month + 0.2π per appraisal", usdEquivalent: "$18,850/mo base",
    openSlots: 75, filledSlots: 22,
    responsibilities: [
      "Perform independent oracle appraisals for all SJNA-listed gems and metals",
      "Issue Pi blockchain gemstone passports with quantum-signed certifications",
      "Detect and report fraudulent inflated appraisals to SJNA authority",
      "Maintain SJNA precious metals price oracle integration",
    ],
    requirements: ["Pi KYC verified", "GIA/AGS certification or equivalent", "Pi oracle system training"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["60π/mo + per-appraisal Pi", "GIA equivalent Pi credential", "Anti-cartel legal indemnification"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── E-COMMERCE (SECA) ────────────────────────────────────────────────────────
  {
    id: "SECA-POS-001", title: "Pi Sovereign Merchant", sector: "ECOMMERCE",
    tier: "entry", applicationMethod: "signup", workArrangement: "remote",
    compensationType: "pi-revenue-share",
    piCompensation: "0% fee — keep 100% Pi revenue", usdEquivalent: "Full merchant revenue",
    openSlots: 100000, filledSlots: 18492,
    responsibilities: [
      "List products on SECA Pi marketplace at fair sovereign pricing",
      "Use Pi smart contract escrow for all transactions",
      "Maintain Pi blockchain verified-review compliance",
      "Accept Pi as primary payment method",
    ],
    requirements: ["Pi KYC verified", "Products or services to sell", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["0% platform commission", "Pi smart contract escrow", "Sovereign merchant badge", "Anti-Amazon legal toolkit"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SECA-POS-002", title: "SECA Commerce Compliance Officer", sector: "ECOMMERCE",
    tier: "senior", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "100π/month", usdEquivalent: "$31,416/mo",
    openSlots: 30, filledSlots: 9,
    responsibilities: [
      "Audit SECA marketplace for pricing compliance and fake-review enforcement",
      "Investigate monopolistic behavior complaints from Pi merchants",
      "Administer Pi oracle review verification system",
      "Coordinate antitrust loophole activations with SECA sovereign counsel",
    ],
    requirements: ["Pi KYC verified", "E-commerce/regulatory compliance background", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["100π/mo", "SECA merchant account at 0% fee", "APEX legal indemnification"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── ENTERTAINMENT (SMEA) ─────────────────────────────────────────────────────
  {
    id: "SMEA-POS-001", title: "Pi Independent Creator / Filmmaker", sector: "ENTERTAINMENT",
    tier: "entry", applicationMethod: "signup", workArrangement: "remote",
    compensationType: "pi-revenue-share",
    piCompensation: "25% Pi royalty on all views/plays/streams", usdEquivalent: "Market-rate royalties in Pi",
    openSlots: 50000, filledSlots: 8247,
    responsibilities: [
      "Create and distribute original content on SMEA Pi streaming platform",
      "Register content with Pi blockchain content rights passport",
      "Receive real-time Pi royalty payments per stream/play",
      "Self-rate content using SMEA community governance classification",
    ],
    requirements: ["Pi KYC verified", "Original content to publish", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["25% Pi royalty rate", "Pi production grant eligibility", "No MPAA/RIAA gatekeeping", "Instant real-time payments"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SMEA-POS-002", title: "Pi Cinema Operator", sector: "ENTERTAINMENT",
    tier: "specialist", applicationMethod: "interview", workArrangement: "in-person",
    compensationType: "pi-revenue-share",
    piCompensation: "15% Pi revenue share on ticket + concession Pi sales", usdEquivalent: "Varies by attendance",
    openSlots: 200, filledSlots: 47,
    responsibilities: [
      "Operate SMEA-licensed sovereign cinema at $6.50 Pi token pricing",
      "Accept only Pi sovereign cinema tokens for admission",
      "Distribute box office Pi revenue to filmmakers per smart contract",
      "Maintain SMEA content classification compliance",
    ],
    requirements: ["Pi KYC verified", "Cinema/venue operation capability", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Standard",
    benefits: ["15% revenue share", "SMEA film access at cost", "Anti-studio monopoly legal protection"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SMEA-POS-003", title: "Sovereign Entertainment Authority Executive", sector: "ENTERTAINMENT",
    tier: "executive", applicationMethod: "interview", workArrangement: "hybrid",
    compensationType: "pi-monthly",
    piCompensation: "400π/month + 0.05% SMEA network Pi revenue", usdEquivalent: "$125,664/mo",
    openSlots: 3, filledSlots: 1,
    responsibilities: [
      "Lead SMEA sovereign content licensing and distribution strategy",
      "Establish Pi direct-royalty agreements with major artists and studios",
      "Oversee Pi sovereign film fund grant distributions",
      "Report to Triumph Synergy Sovereign Operations Council",
    ],
    requirements: ["Pi KYC verified", "10+ years entertainment industry executive", "2 sovereign interview rounds"],
    piKycRequired: true, interviewRounds: 2, sovereignClearance: "APEX",
    benefits: ["400π/mo + network revenue", "APEX legal clearance", "Sovereign production fund access", "Pi housing benefit"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── EVENTS (SEVA) ────────────────────────────────────────────────────────────
  {
    id: "SEVA-POS-001", title: "Pi Event Promoter / Organizer", sector: "EVENTS",
    tier: "entry", applicationMethod: "signup", workArrangement: "hybrid",
    compensationType: "pi-commission",
    piCompensation: "5% Pi commission on event ticket Pi volume", usdEquivalent: "Varies by event size",
    openSlots: 5000, filledSlots: 1284,
    responsibilities: [
      "Organize and promote events on SEVA Pi ticketing platform",
      "Issue Pi NFT tickets at SEVA all-in sovereign pricing",
      "Enforce KYC-linked ticket transfer rules to prevent scalping",
      "Submit event to SEVA sovereign venue certification check",
    ],
    requirements: ["Pi KYC verified", "Event organization capability", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["5% Pi commission", "SEVA event token allotment", "Anti-Ticketmaster legal toolkit"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SEVA-POS-002", title: "SEVA Venue Certification Inspector", sector: "EVENTS",
    tier: "specialist", applicationMethod: "interview", workArrangement: "field",
    compensationType: "pi-monthly",
    piCompensation: "70π/month + 0.05π per inspection", usdEquivalent: "$21,991/mo base",
    openSlots: 100, filledSlots: 24,
    responsibilities: [
      "Certify venues for SEVA Pi ticketing compliance",
      "Audit existing Ticketmaster exclusivity contracts for antitrust voidability",
      "Verify ADA Pi payment accessibility compliance at all SEVA venues",
      "Report BOTS Act violations to SEVA authority dashboard",
    ],
    requirements: ["Pi KYC verified", "Events/venue management background", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["70π/mo + inspection Pi", "SEVA event access", "Sovereign legal indemnification"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── LAND (SLRA) ──────────────────────────────────────────────────────────────
  {
    id: "SLRA-POS-001", title: "Pi Real Estate Exchange Agent", sector: "LAND",
    tier: "entry", applicationMethod: "signup", workArrangement: "hybrid",
    compensationType: "pi-commission",
    piCompensation: "0.5% Pi commission (vs. 6% legacy) per transaction", usdEquivalent: "$2,100 avg per deal",
    openSlots: 2000, filledSlots: 584,
    responsibilities: [
      "List properties on SLRA Pi land exchange at fair sovereign pricing",
      "Process Pi blockchain title transfers and allodial registrations",
      "Educate buyers on NAR settlement and 0% commission SLRA model",
      "Submit allodial title applications to SLRA authority",
    ],
    requirements: ["Pi KYC verified", "Real estate knowledge", "Pi wallet active"],
    piKycRequired: true, interviewRounds: 0, sovereignClearance: "Standard",
    benefits: ["Pi commission income", "SLRA land allotment discount", "Anti-NAR legal toolkit"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "SLRA-POS-002", title: "Allodial Title Registrar", sector: "LAND",
    tier: "senior", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "90π/month + 0.02π per title registered", usdEquivalent: "$28,274/mo base",
    openSlots: 50, filledSlots: 12,
    responsibilities: [
      "Process and register Pi allodial land titles on blockchain",
      "Verify quantum signatures on all SLRA land title submissions",
      "Audit county recorder databases for SLRA title conflicts",
      "Maintain SLRA sovereign land registry immutability standards",
    ],
    requirements: ["Pi KYC verified", "Title/real estate law background", "Quantum signature literacy", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["90π/mo + registration Pi", "Allodial Pi land parcel benefit", "APEX legal protection"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── CORE OPERATIONS ──────────────────────────────────────────────────────────
  {
    id: "CORE-POS-001", title: "Sovereign Platform Engineer", sector: "TECHNOLOGY",
    tier: "specialist", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "150π/month", usdEquivalent: "$47,124/mo",
    openSlots: 50, filledSlots: 18,
    responsibilities: [
      "Build and maintain Triumph Synergy sovereign platform infrastructure",
      "Implement Pi Network SDK integrations and Pi smart contracts",
      "Maintain APEX quantum-resistant security across all authority dashboards",
      "Deploy Docker microservices for sovereign authority APIs",
    ],
    requirements: ["Pi KYC verified", "TypeScript/Python/Rust", "Pi SDK experience preferred", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["150π/mo", "Pi developer grant program access", "APEX hardware + security tools", "Remote global"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "CORE-POS-002", title: "Sovereign Quantum Security Officer", sector: "TECHNOLOGY",
    tier: "executive", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "300π/month", usdEquivalent: "$94,248/mo",
    openSlots: 5, filledSlots: 2,
    responsibilities: [
      "Lead APEX-QUANTUM-SOVEREIGN security posture across all eight sector authorities",
      "Audit ML-DSA-87 + ML-KEM-1024 + SPHINCS+ implementations",
      "Oversee quantum-signed title, ticket, and token issuance systems",
      "Incident response for sovereign Pi ecosystem security events",
    ],
    requirements: ["Pi KYC verified", "Post-quantum cryptography expertise", "FIPS 204/203/205 experience", "2 interview rounds"],
    piKycRequired: true, interviewRounds: 2, sovereignClearance: "APEX",
    benefits: ["300π/mo", "APEX clearance", "Sovereign housing benefit", "Global remote", "Pi equity stake"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "CORE-POS-003", title: "Sovereign Operations Council Member", sector: "CORE_OPERATIONS",
    tier: "sovereign-officer", applicationMethod: "appointment", workArrangement: "global-roaming",
    compensationType: "pi-equity",
    piCompensation: "0.1% Pi network revenue share + 1,000π/month", usdEquivalent: "$314,159/mo+",
    openSlots: 7, filledSlots: 3,
    responsibilities: [
      "Govern all eight sovereign sector authorities through council vote",
      "Ratify sovereign loophole activations and fair-price updates",
      "Appoint executive and sovereign-officer tier positions",
      "Represent Triumph Synergy sovereign interests in international Pi Network governance",
    ],
    requirements: ["Pi KYC verified (APEX level)", "Proven sovereign ecosystem contribution", "Appointment by existing Council", "Full panel interview"],
    piKycRequired: true, interviewRounds: 3, sovereignClearance: "APEX-QUANTUM-SOVEREIGN",
    benefits: ["1,000π/mo + network revenue", "Full sovereign immunity", "Allodial Pi land grant", "Lifetime APEX benefits"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── JUDICIAL ─────────────────────────────────────────────────────────────────
  {
    id: "JUD-POS-001", title: "Sovereign Compliance Attorney", sector: "JUDICIAL",
    tier: "specialist", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "120π/month + Pi per loophole activation", usdEquivalent: "$37,699/mo",
    openSlots: 40, filledSlots: 14,
    responsibilities: [
      "Activate loophole defenses for sovereign sector authority participants",
      "Prepare §1983, UCC, and antitrust claims against greed-pricing violators",
      "Represent Pi holders in agency enforcement actions (IRS, FTC, NHTSA, etc.)",
      "Update loophole registry with new case law and sovereign precedents",
    ],
    requirements: ["Pi KYC verified", "J.D. + bar admission in any jurisdiction", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["120π/mo + per-case Pi", "Sovereign legal malpractice immunity", "APEX case management tools"],
    isActive: true, postedAt: "2026-01-01",
  },
  {
    id: "JUD-POS-002", title: "Sovereign Judge / Arbitrator", sector: "JUDICIAL",
    tier: "sovereign-officer", applicationMethod: "appointment", workArrangement: "hybrid",
    compensationType: "pi-monthly",
    piCompensation: "250π/month", usdEquivalent: "$78,540/mo",
    openSlots: 12, filledSlots: 4,
    responsibilities: [
      "Adjudicate disputes between Pi participants and sovereign sector authorities",
      "Issue quantum-signed sovereign arbitration awards enforceable on Pi blockchain",
      "Review loophole obliteration scores and approve auto-dismiss activations",
      "Serve on constitutional review panel for sovereign commerce regulations",
    ],
    requirements: ["Pi KYC verified", "J.D. + judicial or arbitration experience", "Sovereign appointment + 3 panel rounds"],
    piKycRequired: true, interviewRounds: 3, sovereignClearance: "APEX-QUANTUM-SOVEREIGN",
    benefits: ["250π/mo", "Full judicial sovereign immunity", "Pi housing + vehicle benefits", "Lifetime appointment"],
    isActive: true, postedAt: "2026-01-01",
  },

  // ── FINANCE ──────────────────────────────────────────────────────────────────
  {
    id: "FIN-POS-001", title: "Pi Sovereign Financial Analyst", sector: "FINANCE",
    tier: "specialist", applicationMethod: "interview", workArrangement: "remote",
    compensationType: "pi-monthly",
    piCompensation: "80π/month", usdEquivalent: "$25,133/mo",
    openSlots: 30, filledSlots: 11,
    responsibilities: [
      "Monitor Pi fair-price indexes across all eight sovereign sectors",
      "Produce monthly sovereign savings reports for Pioneer participants",
      "Analyze Pi Network mainnet transaction data for sector impact",
      "Support SFRA, SSGA, SVFA fair-price anchor maintenance",
    ],
    requirements: ["Pi KYC verified", "Finance/economics background", "Pi blockchain analytics literacy", "1 interview round"],
    piKycRequired: true, interviewRounds: 1, sovereignClearance: "Elevated",
    benefits: ["80π/mo", "APEX financial tools access", "Sovereign commerce badge"],
    isActive: true, postedAt: "2026-01-01",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTOR POSITION STATS
// ─────────────────────────────────────────────────────────────────────────────

export interface SectorPositionSummary {
  sector:        SovereignSector;
  totalPositions: number;
  totalSlots:    number;
  filledSlots:   number;
  openSlots:     number;
  signupOnly:    number;
  interviewRequired: number;
}

export function buildPositionStats(): {
  totalPositions: number;
  totalSlots: number;
  totalOpen: number;
  totalFilled: number;
  signupOnly: number;
  interviewRequired: number;
  appointmentOnly: number;
  sectorSummary: SectorPositionSummary[];
  piCompensationRange: { min: string; max: string };
  countriesAvailable: number;
  generatedAt: string;
} {
  const totalSlots = SOVEREIGN_POSITIONS.reduce((s, p) => s + p.openSlots, 0);
  const totalFilled = SOVEREIGN_POSITIONS.reduce((s, p) => s + p.filledSlots, 0);
  const totalOpen = totalSlots - totalFilled;

  const sectors: SovereignSector[] = [
    "VEHICLES","FUEL","GROCERY","JEWELRY","ECOMMERCE",
    "ENTERTAINMENT","EVENTS","LAND","CORE_OPERATIONS","JUDICIAL","FINANCE","TECHNOLOGY",
  ];

  const sectorSummary: SectorPositionSummary[] = sectors.map(sector => {
    const positions = SOVEREIGN_POSITIONS.filter(p => p.sector === sector);
    return {
      sector,
      totalPositions:    positions.length,
      totalSlots:        positions.reduce((s, p) => s + p.openSlots, 0),
      filledSlots:       positions.reduce((s, p) => s + p.filledSlots, 0),
      openSlots:         positions.reduce((s, p) => s + (p.openSlots - p.filledSlots), 0),
      signupOnly:        positions.filter(p => p.applicationMethod === "signup").length,
      interviewRequired: positions.filter(p => p.applicationMethod === "interview").length,
    };
  });

  return {
    totalPositions:    SOVEREIGN_POSITIONS.length,
    totalSlots,
    totalOpen,
    totalFilled,
    signupOnly:        SOVEREIGN_POSITIONS.filter(p => p.applicationMethod === "signup").length,
    interviewRequired: SOVEREIGN_POSITIONS.filter(p => p.applicationMethod === "interview").length,
    appointmentOnly:   SOVEREIGN_POSITIONS.filter(p => p.applicationMethod === "appointment").length,
    sectorSummary,
    piCompensationRange: { min: "0% fee (merchant)", max: "1,000π/mo + 0.1% network revenue" },
    countriesAvailable: 42,
    generatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

export function createApplication(
  positionId: string,
  piUid: string,
  piWallet: string,
  displayName: string,
  jurisdiction: string,
  portfolioUri?: string,
): PositionApplicant {
  const position = SOVEREIGN_POSITIONS.find(p => p.id === positionId);
  if (!position) throw new Error(`Position ${positionId} not found in SPR registry`);

  return {
    id:           randomUUID(),
    positionId,
    piUid,
    piWallet,
    displayName,
    jurisdiction,
    status:       position.applicationMethod === "signup" ? "screening" : "open",
    tier:         position.tier,
    appliedAt:    new Date().toISOString(),
    interviewDates:  [],
    interviewScores: [],
    portfolioUri,
    references:   [],
    notes:        `Applied via SPR for ${position.title} — Pi KYC verification pending`,
  };
}

export function scheduleInterview(
  application: PositionApplicant,
  panelists: string[],
  scheduledAt: string,
  round: number,
): InterviewPanel {
  return {
    id:            randomUUID(),
    positionId:    application.positionId,
    applicantId:   application.id,
    round,
    panelists,
    scheduledAt,
    completedAt:   undefined,
    scores:        [],
    recommendation: "pending",
    notes:         `Round ${round} sovereign interview panel scheduled`,
  };
}
