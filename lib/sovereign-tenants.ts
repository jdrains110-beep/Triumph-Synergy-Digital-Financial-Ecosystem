/**
 * Triumph Synergy — Sovereign .pi Tenant Catalog
 * All 22 web3 .pi tokenized domains, fully rebranded under Triumph Synergy.
 * GCV: 1 Pi = $314,159.00 USD
 */

export const GCV = 314_159.00;
export const GCV_DISPLAY = "$314,159.00";
export const FOUNDER = "Jeremiah Joel Drains";
export const CENTRAL_KEY = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

export type NetworkMode = "mainnet" | "testnet";

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  piPrice: number;       // in Pi (mainnet)
  testPiPrice: number;   // in test Pi (testnet — same nominal amount)
  category: string;
  emoji: string;
  popular?: boolean;
}

export interface ServiceTier {
  id: string;
  icon: string;
  title: string;
  description: string;
  priceFrom: string;
  rival: string;
  rivalFee: string;
  sovereignFee: string;
  highlights: string[];
}

export interface Loophole {
  title: string;
  cite: string;
  effect: string;
  score: number;
}

export interface SovereignTenant {
  slug: string;               // matches nginx /html/<slug>/ and URL param
  domain: string;             // e.g. "wingstop.pi"
  brandName: string;          // Original brand
  sovereignName: string;      // Triumph Synergy rebranded name
  tagline: string;
  category: string;
  icon: string;
  color: string;              // Tailwind gradient class (from)
  accentColor: string;        // Tailwind text class
  borderColor: string;        // Tailwind border class
  description: string;
  tokenId: string;
  stellarLedger: number;
  ownershipModel: string;
  stats: { label: string; value: string; color: string }[];
  services: ServiceTier[];
  products: ProductItem[];
  loopholes: Loophole[];
  loyaltyName: string;        // e.g. "Wingstop Pi Rewards"
  loyaltyPiback: number;      // % Pi cashback
}

// ─── Helper: generate token ID deterministically per slug ──────────────────
function tokenId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash).toString(16).padStart(8, "0");
  return `${h}a4c8e2b6-d0f4-a8c2-e6b0-d4f8a2c6e0b4`;
}

// ─── All 22 Sovereign Tenants ──────────────────────────────────────────────
export const TENANTS: SovereignTenant[] = [

  // ── 1. Wingstop ────────────────────────────────────────────────────────────
  {
    slug: "wingstop",
    domain: "wingstop.pi",
    brandName: "Wingstop",
    sovereignName: "Triumph Synergy Sovereign Wing Co.",
    tagline: "Flavor-First. Pi-Priced. Sovereign-Settled.",
    category: "Food & Dining",
    icon: "🍗",
    color: "from-orange-500/10 via-yellow-500/10 to-red-500/10",
    accentColor: "text-orange-400",
    borderColor: "border-orange-500/20",
    description: "The world's premier wing chain, fully tokenized under Triumph Synergy. Every flavor, every combo, every ranch dip — priced in Pi and settled on the sovereign ledger. Zero card fees, zero franchise royalty extraction.",
    tokenId: tokenId("wingstop"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Wing Pi Rewards",
    loyaltyPiback: 3,
    stats: [
      { label: "Sovereign Locations", value: "1,800+", color: "text-orange-300" },
      { label: "Countries", value: "11", color: "text-yellow-300" },
      { label: "Flavors", value: "11+", color: "text-red-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "classic-combo", name: "Classic 10pc Wing Combo", description: "10 bone-in wings, any flavor, fries, ranch", piPrice: 0.005, testPiPrice: 0.005, category: "Combos", emoji: "🍗", popular: true },
      { id: "boneless-15", name: "Boneless 15pc Party Pack", description: "15 boneless wings, 2 flavors, 2 sides", piPrice: 0.009, testPiPrice: 0.009, category: "Party", emoji: "🎉" },
      { id: "lemon-pepper", name: "Lemon Pepper 20pc", description: "20 bone-in lemon pepper wings", piPrice: 0.012, testPiPrice: 0.012, category: "Specialty", emoji: "🍋" },
      { id: "sovereign-meal", name: "Sovereign Pi Meal", description: "25pc wings, 4 sides, 4 dips — Pioneer feast", piPrice: 0.018, testPiPrice: 0.018, category: "Sovereign", emoji: "👑", popular: true },
      { id: "ranch-bucket", name: "Ranch & Blue Cheese Pack", description: "10 dipping sauces, sovereign blend", piPrice: 0.001, testPiPrice: 0.001, category: "Add-ons", emoji: "🥣" },
      { id: "fries-large", name: "Sovereign Seasoned Fries (Large)", description: "Large seasoned fries, Pi-settled", piPrice: 0.002, testPiPrice: 0.002, category: "Sides", emoji: "🍟" },
    ],
    services: [
      { id: "dine", icon: "🍗", title: "Sovereign Dine-In", description: "Dine in at any of 1,800+ sovereign Wingstop locations. Pay in Pi at the table — no card terminal, no processing fee.", priceFrom: "0.003π", rival: "Traditional QSR", rivalFee: "2–3% card processing + franchise fee", sovereignFee: "0% — Pi ledger settlement", highlights: ["11 signature flavors", "Bone-in & boneless", "Vegan options", "Pi-native POS"] },
      { id: "delivery", icon: "🚚", title: "Sovereign Pi Delivery", description: "Order direct through wingstop.pi — no DoorDash, no 30% platform tax. Couriers paid in Pi. Full GCV settlement.", priceFrom: "0.001π delivery fee", rival: "DoorDash / Uber Eats", rivalFee: "15–30% platform fee", sovereignFee: "Flat 0.001π sovereign courier fee", highlights: ["30-min sovereign dispatch", "Pi-paid couriers", "Real-time ledger tracking", "No hidden markup"] },
      { id: "catering", icon: "🎉", title: "Pi Catering & Events", description: "Sovereign event catering — Pi-priced bulk orders for pioneers, corporations, and sovereign community gatherings.", priceFrom: "0.05π", rival: "Corporate catering", rivalFee: "Service charge 18–22% + tax", sovereignFee: "0% service charge — Pi direct", highlights: ["100+ wing minimums", "Custom flavor selection", "Sovereign logistics", "Pi invoice"] },
    ],
    loopholes: [
      { title: "Franchise Fee Abolition Under Pi Commerce Sovereignty", cite: "FTC Franchise Rule (16 C.F.R. Part 436); Pi Network Sovereign Commerce Clause", effect: "Triumph Synergy sovereign commerce model eliminates the 6% franchise royalty. Pi settlement replaces Wingstop corporate fee extraction.", score: 88 },
      { title: "Zero Card Interchange — Pi Native Settlement", cite: "Durbin Amendment (15 U.S.C. § 1693o-2); Dodd-Frank Act § 1075", effect: "Pi ledger settlement bypasses Visa/Mastercard interchange entirely. Sovereign savings passed directly to pioneers.", score: 94 },
      { title: "Pi Rewards Non-Expiry Mandate", cite: "CFPB Prepaid Rule (12 C.F.R. § 1005.20)", effect: "Wing Pi Rewards are on-chain Pi tokens — not points. Cannot expire under Pi token rights and CFPB prepaid rules.", score: 91 },
      { title: "Sovereign Food Pricing — GCV Immunity", cite: "Pi Network GCV Sovereign Valuation Protocol", effect: "Menu prices denominated in Pi. Inflation in USD does not affect Pi-priced menus — GCV shields pioneer purchasing power.", score: 96 },
    ],
  },

  // ── 2. NetJets ─────────────────────────────────────────────────────────────
  {
    slug: "netjets",
    domain: "netjets.pi",
    brandName: "NetJets",
    sovereignName: "Triumph Synergy Sovereign Aviation Fleet",
    tagline: "Fractional Jet Ownership. Pi-Settled. Sovereign Skies.",
    category: "Private Aviation",
    icon: "✈️",
    color: "from-blue-500/10 via-indigo-500/10 to-cyan-500/10",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    description: "The world's largest private aviation company, fully sovereign under Triumph Synergy. Fractional jet ownership, charter flights, and sovereign air travel — all priced and settled in Pi at GCV.",
    tokenId: tokenId("netjets"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "SkyPi Elite Rewards",
    loyaltyPiback: 5,
    stats: [
      { label: "Aircraft Fleet", value: "750+", color: "text-blue-300" },
      { label: "Destinations", value: "5,000+", color: "text-cyan-300" },
      { label: "Founders", value: "Pioneers", color: "text-indigo-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "charter-hour", name: "Charter Flight Hour (Light Jet)", description: "1 flight hour, light jet, up to 7 passengers", piPrice: 0.5, testPiPrice: 0.5, category: "Charter", emoji: "✈️", popular: true },
      { id: "midsize-hour", name: "Charter Flight Hour (Midsize)", description: "1 flight hour, midsize jet, up to 9 passengers", piPrice: 0.8, testPiPrice: 0.8, category: "Charter", emoji: "🛩️" },
      { id: "heavy-hour", name: "Charter Flight Hour (Heavy Jet)", description: "1 flight hour, heavy jet, up to 16 passengers", piPrice: 1.5, testPiPrice: 1.5, category: "Charter", emoji: "🛫" },
      { id: "fractional-share", name: "1/16 Fractional Share", description: "50 flight hours/year, light jet access", piPrice: 50, testPiPrice: 50, category: "Ownership", emoji: "📜", popular: true },
      { id: "catering-flight", name: "In-Flight Pi Catering", description: "Sovereign catering package per flight", piPrice: 0.05, testPiPrice: 0.05, category: "Add-ons", emoji: "🍾" },
      { id: "ground-transport", name: "Sovereign Ground Transfer", description: "Pi-settled car service, airport to destination", piPrice: 0.01, testPiPrice: 0.01, category: "Add-ons", emoji: "🚗" },
    ],
    services: [
      { id: "charter", icon: "✈️", title: "On-Demand Pi Charter", description: "Book any available jet on-demand. Pi payment clears in 5 seconds on the sovereign ledger — faster than a credit card auth.", priceFrom: "0.5π/hr", rival: "Traditional charter brokers", rivalFee: "20–25% broker markup + card fee", sovereignFee: "0% broker fee — direct Pi settlement", highlights: ["4hr booking window", "750+ aircraft", "Global coverage", "Pi invoice on ledger"] },
      { id: "fractional", icon: "📜", title: "Fractional Ownership in Pi", description: "Own a fraction of a sovereign jet. Purchase shares in Pi — tokenized on the Stellar ledger under Triumph Synergy.", priceFrom: "50π/share", rival: "Traditional fractional programs", rivalFee: "USD wire, legal fees, management fees", sovereignFee: "Pi tokenized ownership — on-chain title", highlights: ["1/16 to 1/2 shares", "On-chain title transfer", "Pi management fee", "Sovereign maintenance pool"] },
      { id: "membership", icon: "🎖️", title: "Pioneer Elite Membership", description: "Annual sovereign membership: unlimited flight access priority, concierge, lounge access at all Pi-sovereign airports.", priceFrom: "5π/year", rival: "Amex Centurion / Delta One", rivalFee: "$10K+ USD annually", sovereignFee: "5π sovereign annual — ~$1,570 USD equiv.", highlights: ["Priority booking", "Sovereign lounges", "Pi concierge", "GCV rate lock"] },
    ],
    loopholes: [
      { title: "Fractional Aircraft Ownership — Pi Token Securities Exemption", cite: "SEC Reg D § 506(c); Pi Network Token Framework", effect: "Pi-denominated fractional shares issued under Triumph Synergy sovereign framework. Exempt from traditional securities filing under Pi token classification.", score: 82 },
      { title: "Aviation Fuel Tax Sovereignty", cite: "26 U.S.C. § 4081; Sovereign Commerce Doctrine", effect: "Sovereign Pi settlement for fuel costs routes through Triumph Synergy treasury — carving out federal excise tax liability through sovereign commerce classification.", score: 79 },
      { title: "Broker Fee Elimination via Direct Pi Settlement", cite: "FAA Part 135 Charter Rules; Pi Commerce Sovereignty", effect: "Direct pioneer-to-aircraft Pi settlement eliminates all broker intermediary fees under sovereign commerce doctrine.", score: 91 },
      { title: "Pi Rewards Non-Expiry — On-Chain Flight Credits", cite: "DOT Air Carrier Access; CFPB Prepaid Rule", effect: "SkyPi Elite credits are on-chain Pi — cannot be revoked or expired by any traditional aviation loyalty program mechanism.", score: 88 },
    ],
  },

  // ── 3. Sonny's BBQ ─────────────────────────────────────────────────────────
  {
    slug: "sonnysbbq",
    domain: "sonnysbbq.pi",
    brandName: "Sonny's BBQ",
    sovereignName: "Triumph Synergy Sovereign Smoke House",
    tagline: "Low & Slow. Pi-Priced. Sovereign Smoke.",
    category: "Food & Dining",
    icon: "🍖",
    color: "from-red-500/10 via-orange-500/10 to-amber-500/10",
    accentColor: "text-red-400",
    borderColor: "border-red-500/20",
    description: "The Southeast's most beloved BBQ chain, fully sovereign under Triumph Synergy. Smoked meats, pit-cooked sides, and legendary BBQ — all priced in Pi and settled on the sovereign ledger.",
    tokenId: tokenId("sonnysbbq"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Pit Pi Rewards",
    loyaltyPiback: 3,
    stats: [
      { label: "Locations", value: "100+", color: "text-red-300" },
      { label: "States", value: "SE USA", color: "text-orange-300" },
      { label: "Years Smoking", value: "55+", color: "text-amber-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "pulled-pork-plate", name: "Sovereign Pulled Pork Plate", description: "1lb pulled pork, 2 sides, cornbread, pickles", piPrice: 0.004, testPiPrice: 0.004, category: "Plates", emoji: "🍖", popular: true },
      { id: "brisket-plate", name: "Smoked Brisket Plate", description: "12oz sliced brisket, 2 sides, Texas toast", piPrice: 0.006, testPiPrice: 0.006, category: "Plates", emoji: "🥩" },
      { id: "family-pack", name: "Sovereign Family Pack", description: "2lb mixed meats, 4 sides, bread, sauce", piPrice: 0.015, testPiPrice: 0.015, category: "Family", emoji: "👨‍👩‍👧‍👦", popular: true },
      { id: "ribs-half", name: "Half Rack St. Louis Ribs", description: "Half rack smoked ribs, 1 side", piPrice: 0.007, testPiPrice: 0.007, category: "Ribs", emoji: "🦴" },
      { id: "mac-cheese", name: "Sovereign Mac & Cheese", description: "Large smoked mac & cheese bowl", piPrice: 0.002, testPiPrice: 0.002, category: "Sides", emoji: "🧀" },
      { id: "sauce-pack", name: "Sovereign Sauce Pack (6 btls)", description: "6 bottles signature BBQ sauces", piPrice: 0.003, testPiPrice: 0.003, category: "Sauces", emoji: "🫙" },
    ],
    services: [
      { id: "dine", icon: "🍖", title: "Sovereign Pit Dining", description: "Full dine-in experience at 100+ sovereign locations. Pi payment at the table. Zero card terminals.", priceFrom: "0.003π", rival: "Traditional restaurants", rivalFee: "2–3% card fee + 18–20% tip pressure", sovereignFee: "0% processing — voluntary Pi tip on-chain", highlights: ["Smoked daily", "Open pit", "Family tables", "Pi-native POS"] },
      { id: "catering", icon: "🎪", title: "Sovereign Event BBQ Catering", description: "Full pit catering for sovereign events, pioneer gatherings, and community feasts.", priceFrom: "0.08π", rival: "BBQ catering companies", rivalFee: "Per-person fee + service charge", sovereignFee: "Pi-direct — no per-head surcharge", highlights: ["On-site pit optional", "Custom menu", "Pioneer discounts", "Ledger invoice"] },
    ],
    loopholes: [
      { title: "Sovereign Food Pricing — GCV Inflation Shield", cite: "Pi Network GCV Sovereign Valuation Protocol", effect: "BBQ prices denominated in Pi. Beef and pork commodity inflation does not affect Pi-denominated menu prices.", score: 93 },
      { title: "Zero Card Processing — Pi Direct Settlement", cite: "Durbin Amendment; Dodd-Frank § 1075", effect: "Pi ledger settlement bypasses all card interchange. Full sovereign savings passed to pioneers.", score: 94 },
      { title: "Pit Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule (12 C.F.R. § 1005.20)", effect: "Pit Pi Rewards are on-chain tokens — no expiry, no blackout dates.", score: 91 },
      { title: "Franchise Royalty Abolition", cite: "FTC Franchise Rule (16 C.F.R. Part 436)", effect: "Triumph Synergy sovereign commerce eliminates the corporate franchise royalty extraction model.", score: 87 },
    ],
  },

  // ── 4. UF Health ───────────────────────────────────────────────────────────
  {
    slug: "ufhealth",
    domain: "ufhealth.pi",
    brandName: "UF Health",
    sovereignName: "Triumph Synergy Sovereign Health Network",
    tagline: "Academic Medicine. Pi-Settled. Sovereign Care.",
    category: "Healthcare",
    icon: "🏥",
    color: "from-blue-500/10 via-teal-500/10 to-emerald-500/10",
    accentColor: "text-teal-400",
    borderColor: "border-teal-500/20",
    description: "University of Florida's academic health system, fully sovereign under Triumph Synergy. Hospital care, specialist consultations, research access, and prescriptions — all Pi-settled through the sovereign health ledger.",
    tokenId: tokenId("ufhealth"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Health Pi Credits",
    loyaltyPiback: 5,
    stats: [
      { label: "Hospitals", value: "2", color: "text-teal-300" },
      { label: "Beds", value: "1,600+", color: "text-blue-300" },
      { label: "Specialists", value: "900+", color: "text-emerald-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "telehealth", name: "Sovereign Telehealth Visit", description: "15-min virtual consultation, any specialty", piPrice: 0.008, testPiPrice: 0.008, category: "Consultations", emoji: "💻", popular: true },
      { id: "primary-care", name: "Primary Care Visit", description: "In-person primary care appointment", piPrice: 0.02, testPiPrice: 0.02, category: "Consultations", emoji: "👨‍⚕️" },
      { id: "specialist", name: "Specialist Consultation", description: "Cardiologist / neurologist / oncologist visit", piPrice: 0.05, testPiPrice: 0.05, category: "Specialty", emoji: "🔬", popular: true },
      { id: "lab-panel", name: "Sovereign Lab Panel", description: "Complete blood count + metabolic panel", piPrice: 0.01, testPiPrice: 0.01, category: "Diagnostics", emoji: "🧪" },
      { id: "imaging", name: "MRI / CT Imaging", description: "Full diagnostic imaging, sovereign rate", piPrice: 0.1, testPiPrice: 0.1, category: "Imaging", emoji: "🧲" },
      { id: "rx-fill", name: "Sovereign Rx Fill (30-day)", description: "30-day prescription, generic, Pi-settled", piPrice: 0.003, testPiPrice: 0.003, category: "Pharmacy", emoji: "💊" },
    ],
    services: [
      { id: "primary", icon: "👨‍⚕️", title: "Sovereign Primary Care", description: "Direct primary care in Pi. No insurance billing, no prior auth delays. Pi clears in 5 seconds.", priceFrom: "0.02π/visit", rival: "Traditional insurance billing", rivalFee: "$300–$500 billed + 20–40% patient portion", sovereignFee: "0.02π flat — no surprise billing", highlights: ["Same-day Pi booking", "No referral required", "Sovereign health record", "Pi Rx"] },
      { id: "telehealth", icon: "💻", title: "24/7 Pi Telehealth", description: "24/7 sovereign telehealth — any device, any location. Pi payment clears before call starts.", priceFrom: "0.008π", rival: "MDLive / Teladoc", rivalFee: "$75–$150 + insurance hassle", sovereignFee: "0.008π flat (~$2,513 USD equiv.)", highlights: ["24/7 access", "Any specialty", "Pi instant auth", "Sovereign EMR"] },
    ],
    loopholes: [
      { title: "Sovereign Medical Payment — No Surprise Billing Act Override", cite: "No Surprises Act (42 U.S.C. § 300gg-111); Pi Health Sovereignty", effect: "Pi-direct medical payment eliminates all surprise billing. Fixed Pi rates replace opaque insurance billing. NSA enhanced protections apply.", score: 96 },
      { title: "Direct Primary Care — Insurance Mandate Exemption", cite: "ACA § 1301(b)(1)(B); IRS Notice 2015-17", effect: "Direct Pi-settled primary care qualifies as DPC under ACA exemptions — no insurance required, HSA-compatible.", score: 89 },
      { title: "Pi Health Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Health Pi Credits are on-chain tokens — no expiry, portable across all Triumph Synergy sovereign health providers.", score: 91 },
      { title: "Sovereign Rx Pricing — Below AWP Mandate", cite: "CMS Average Wholesale Price Regulations; Pi GCV Pharmacy Protocol", effect: "Sovereign Pi pharmacy prices set at manufacturing cost + 3% sovereign margin. No PBM markup, no AWP manipulation.", score: 95 },
    ],
  },

  // ── 5. UFL (United Football League) ───────────────────────────────────────
  {
    slug: "ufl",
    domain: "ufl.pi",
    brandName: "UFL",
    sovereignName: "Triumph Synergy Sovereign Football League",
    tagline: "Spring Football. Pi-Gated. Sovereign Stadium.",
    category: "Sports & Entertainment",
    icon: "🏈",
    color: "from-emerald-500/10 via-blue-500/10 to-purple-500/10",
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    description: "The United Football League, fully tokenized under Triumph Synergy. Game tickets, merchandise, fantasy leagues, and stadium experiences — all Pi-settled through the sovereign sports ledger.",
    tokenId: tokenId("ufl"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Gridiron Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "Teams", value: "8", color: "text-emerald-300" },
      { label: "Games/Season", value: "40+", color: "text-blue-300" },
      { label: "Stadiums", value: "8", color: "text-purple-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "general-ticket", name: "Sovereign General Admission", description: "1 game ticket, general seating", piPrice: 0.003, testPiPrice: 0.003, category: "Tickets", emoji: "🎫", popular: true },
      { id: "club-ticket", name: "Sovereign Club Seat", description: "1 game ticket, club level with lounge access", piPrice: 0.008, testPiPrice: 0.008, category: "Tickets", emoji: "🏟️" },
      { id: "vip-suite", name: "VIP Pi Suite (10 guests)", description: "Private suite, catering, 10 guests", piPrice: 0.08, testPiPrice: 0.08, category: "Premium", emoji: "👑", popular: true },
      { id: "season-pass", name: "Full Season Pi Pass", description: "All home games, sovereign member access", piPrice: 0.05, testPiPrice: 0.05, category: "Passes", emoji: "📋" },
      { id: "jersey", name: "Sovereign Team Jersey", description: "Official UFL sovereign jersey, any team", piPrice: 0.004, testPiPrice: 0.004, category: "Merch", emoji: "👕" },
      { id: "fantasy", name: "Sovereign Fantasy League Entry", description: "Pi-staked fantasy league, 10-team", piPrice: 0.01, testPiPrice: 0.01, category: "Fantasy", emoji: "🎮" },
    ],
    services: [
      { id: "tickets", icon: "🎫", title: "Sovereign Pi Ticketing", description: "Buy game tickets directly with Pi. No Ticketmaster fees — 0% platform surcharge. NFT ticket on the Stellar ledger.", priceFrom: "0.003π", rival: "Ticketmaster / StubHub", rivalFee: "20–30% service + facility fees", sovereignFee: "0% — Pi NFT ticket direct", highlights: ["NFT ticket on ledger", "No hidden fees", "Pi resale market", "Sovereign entry scan"] },
      { id: "fantasy", icon: "🎮", title: "Sovereign Pi Fantasy League", description: "Pi-staked fantasy football. Entry fees in Pi, prize pools in Pi, fully on-chain settlement.", priceFrom: "0.01π/entry", rival: "DraftKings / FanDuel", rivalFee: "5–10% platform rake", sovereignFee: "1% sovereign protocol fee", highlights: ["On-chain prize pool", "Pi instant payout", "Sovereign scoring", "Pioneer leagues"] },
    ],
    loopholes: [
      { title: "Ticketing Surcharge Abolition — Pi NFT Tickets", cite: "DOJ Ticketmaster Antitrust; Pi Commerce Sovereignty", effect: "Pi NFT tickets issued directly on Stellar ledger — no Ticketmaster monopoly fees under sovereign commerce doctrine.", score: 88 },
      { title: "Sports Wagering — Sovereign Pi Fantasy Exemption", cite: "PASPA Repeal (Murphy v. NCAA, 2018); State DFS Exemptions", effect: "Pi-staked fantasy leagues qualify under skill-game exemptions in 43+ states. Sovereign ledger settlement outside traditional gambling rails.", score: 78 },
      { title: "Gridiron Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "All earned Pi rewards are on-chain — no expiry, no blackout games, portable ecosystem-wide.", score: 91 },
      { title: "Stadium Concession Pi Pricing — GCV Shield", cite: "Pi Network GCV Protocol", effect: "Sovereign Pi concession prices immune from food commodity inflation. GCV-locked Pi prices never rise with input costs.", score: 93 },
    ],
  },

  // ── 6. Grace Kennedy ───────────────────────────────────────────────────────
  {
    slug: "gracekennedy",
    domain: "gracekennedy.pi",
    brandName: "GraceKennedy",
    sovereignName: "Triumph Synergy Sovereign Caribbean Commerce",
    tagline: "Caribbean Heritage. Pi-Powered. Sovereign Trade.",
    category: "Caribbean Commerce & Finance",
    icon: "🌴",
    color: "from-emerald-500/10 via-yellow-500/10 to-cyan-500/10",
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    description: "Jamaica's largest conglomerate — food, financial services, and retail — fully sovereign under Triumph Synergy. Caribbean grocery, remittance, insurance, and banking all Pi-settled.",
    tokenId: tokenId("gracekennedy"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Caribbean Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "Countries", value: "20+", color: "text-emerald-300" },
      { label: "Employees", value: "4,000+", color: "text-yellow-300" },
      { label: "Subsidiaries", value: "60+", color: "text-cyan-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "grocery-box", name: "Sovereign Caribbean Grocery Box", description: "Weekly family grocery pack — Caribbean staples", piPrice: 0.006, testPiPrice: 0.006, category: "Grocery", emoji: "🛒", popular: true },
      { id: "remittance", name: "Pi Remittance (Caribbean)", description: "Send Pi to any Caribbean nation, instant settlement", piPrice: 0.0001, testPiPrice: 0.0001, category: "Financial", emoji: "💸", popular: true },
      { id: "insurance-month", name: "Sovereign Insurance (Monthly)", description: "Pi-settled health + property insurance", piPrice: 0.01, testPiPrice: 0.01, category: "Insurance", emoji: "🛡️" },
      { id: "grace-foods", name: "Grace Foods Pack (12 items)", description: "12-item Grace Foods pantry pack", piPrice: 0.004, testPiPrice: 0.004, category: "Food", emoji: "🥫" },
      { id: "hi-lo-delivery", name: "Hi-Lo Supermarket Delivery", description: "Same-day grocery delivery, Pi-settled", piPrice: 0.002, testPiPrice: 0.002, category: "Delivery", emoji: "🚚" },
      { id: "forex-pi", name: "Sovereign FX Exchange (Pi → JMD)", description: "Pi to Jamaican Dollar at sovereign rate", piPrice: 0.0005, testPiPrice: 0.0005, category: "FX", emoji: "💱" },
    ],
    services: [
      { id: "remittance", icon: "💸", title: "Sovereign Pi Remittance", description: "Send Pi to 20+ Caribbean nations. 5-second Stellar ledger finality. Zero Western Union fees.", priceFrom: "0.0001π fee", rival: "Western Union / MoneyGram", rivalFee: "3–8% transfer fee + FX spread", sovereignFee: "0.01% sovereign protocol fee — Pi direct", highlights: ["20+ nations", "5s finality", "GCV rate", "On-chain receipt"] },
      { id: "banking", icon: "🏦", title: "Pi-Native Caribbean Banking", description: "First Choice Bank / Scotia Caribbean operations replaced by Pi sovereign banking. Accounts, loans, and savings in Pi.", priceFrom: "0π account fee", rival: "Traditional Caribbean banks", rivalFee: "Monthly fees, minimum balance, FX loss", sovereignFee: "0π — sovereign Pi account", highlights: ["Pi savings", "Pi loans", "On-chain statements", "Zero FX loss"] },
    ],
    loopholes: [
      { title: "Remittance Fee Cap — Pi Sovereign Transfer", cite: "World Bank SDG 10.c.1; Pi Network Transfer Protocol", effect: "Pi sovereign remittance achieves <0.1% cost — exceeding SDG 3% target. Western Union markup eliminated through sovereign ledger.", score: 97 },
      { title: "Caribbean Banking Sovereignty — Pi Account Rights", cite: "Caribbean Community (CARICOM) Monetary Cooperation; Pi Token Rights", effect: "Pi accounts under Triumph Synergy sovereign framework operate outside CARICOM central bank reserve requirements.", score: 80 },
      { title: "Caribbean Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Caribbean Pi Rewards are on-chain tokens — no expiry, portable across all 60+ GraceKennedy sovereign subsidiaries.", score: 91 },
      { title: "Sovereign Trade Finance — Pi Letter of Credit", cite: "UCC Article 5; Pi Commerce Sovereignty", effect: "Pi-settled letters of credit replace USD LCs for Caribbean trade — eliminating correspondent banking fees and FX risk.", score: 85 },
    ],
  },

  // ── 7. Shands / UFHealth partner ───────────────────────────────────────────
  {
    slug: "shands",
    domain: "shands.pi",
    brandName: "Shands Hospital",
    sovereignName: "Triumph Synergy Sovereign Medical Center",
    tagline: "Academic Excellence. Pi Care. Sovereign Healing.",
    category: "Healthcare",
    icon: "⚕️",
    color: "from-blue-500/10 via-cyan-500/10 to-teal-500/10",
    accentColor: "text-cyan-400",
    borderColor: "border-cyan-500/20",
    description: "UF Health Shands Hospital — the flagship academic medical center — fully sovereign under Triumph Synergy. Inpatient care, surgical services, cancer treatment, and research trials all Pi-settled.",
    tokenId: tokenId("shands"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Healing Pi Credits",
    loyaltyPiback: 5,
    stats: [
      { label: "Beds", value: "900+", color: "text-cyan-300" },
      { label: "Surgeries/yr", value: "40,000+", color: "text-blue-300" },
      { label: "Specialties", value: "100+", color: "text-teal-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "er-visit", name: "Sovereign ER Visit", description: "Emergency room visit, Pi flat rate", piPrice: 0.1, testPiPrice: 0.1, category: "Emergency", emoji: "🚨", popular: true },
      { id: "surgery-consult", name: "Surgical Consultation", description: "Pre-operative specialist consultation", piPrice: 0.05, testPiPrice: 0.05, category: "Surgery", emoji: "🔪" },
      { id: "oncology", name: "Oncology Session", description: "Chemo/radiation session, sovereign rate", piPrice: 0.2, testPiPrice: 0.2, category: "Cancer Care", emoji: "🎗️", popular: true },
      { id: "mri", name: "MRI Full Body Scan", description: "Comprehensive MRI imaging, sovereign rate", piPrice: 0.08, testPiPrice: 0.08, category: "Imaging", emoji: "🧲" },
      { id: "rehab-session", name: "Physical Therapy Session", description: "60-min PT session, sovereign rate", piPrice: 0.015, testPiPrice: 0.015, category: "Rehab", emoji: "🏋️" },
      { id: "rx-specialty", name: "Specialty Rx (30-day)", description: "Specialty medication, 30-day supply", piPrice: 0.05, testPiPrice: 0.05, category: "Pharmacy", emoji: "💊" },
    ],
    services: [
      { id: "inpatient", icon: "🏥", title: "Sovereign Inpatient Care", description: "Hospital admission billed in Pi. Fixed daily sovereign rate — no itemized surprise billing.", priceFrom: "0.5π/day", rival: "Traditional hospital billing", rivalFee: "$5,000–$30,000/day + insurance battles", sovereignFee: "0.5π/day sovereign flat", highlights: ["Private rooms", "Pi meal service", "Sovereign nursing", "On-chain discharge summary"] },
      { id: "research", icon: "🔬", title: "Sovereign Clinical Trials Access", description: "Priority access to UF Shands clinical trials. Pi-staked enrollment with on-chain consent.", priceFrom: "0π — trials pay pioneers", rival: "Closed institutional trials", rivalFee: "Restrictive enrollment criteria", sovereignFee: "Pi stipend paid to participants", highlights: ["Phase II–IV trials", "Pi participant stipend", "On-chain consent", "Sovereign IRB"] },
    ],
    loopholes: [
      { title: "No Surprise Billing — Sovereign Pi Flat Rate", cite: "No Surprises Act (42 U.S.C. § 300gg-111)", effect: "All Shands sovereign care billed at fixed Pi rates published before service. NSA enhanced protections enforced.", score: 96 },
      { title: "340B Drug Pricing — Sovereign Pi Pharmacy", cite: "Public Health Service Act § 340B (42 U.S.C. § 256b)", effect: "Shands sovereign pharmacy qualifies for 340B drug pricing. Combined with Pi settlement, drug costs reach near-manufacturing price.", score: 94 },
      { title: "Clinical Trial Pi Stipend — Tax Sovereignty", cite: "IRS Rev. Rul. 2014-14; Pi Token Classification", effect: "Pi stipends paid to clinical trial participants classified as Pi tokens — not taxable income under current Pi network classification.", score: 82 },
      { title: "Healing Pi Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Healing Pi Credits earned on all sovereign care are on-chain — no expiry, transferable to family members.", score: 91 },
    ],
  },

  // ── 8. Circuit 7 ────────────────────────────────────────────────────────────
  {
    slug: "circuit7",
    domain: "circuit7.pi",
    brandName: "Circuit 7",
    sovereignName: "Triumph Synergy Sovereign Motor Circuit",
    tagline: "Sovereign Speed. Pi Entry. Championship Racing.",
    category: "Motorsports",
    icon: "🏎️",
    color: "from-red-500/10 via-gray-500/10 to-yellow-500/10",
    accentColor: "text-red-400",
    borderColor: "border-red-500/20",
    description: "A sovereign motorsports circuit under Triumph Synergy. Track days, racing school, corporate events, and Pi-settled championship series. Speed democratized through Pi.",
    tokenId: tokenId("circuit7"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Apex Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "Track Length", value: "3.2mi", color: "text-red-300" },
      { label: "Corners", value: "14", color: "text-yellow-300" },
      { label: "Events/yr", value: "50+", color: "text-gray-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "track-day", name: "Sovereign Track Day", description: "Full day track access, your car", piPrice: 0.015, testPiPrice: 0.015, category: "Track Days", emoji: "🏎️", popular: true },
      { id: "racing-school", name: "Pi Racing School (1 day)", description: "Professional instruction, sovereign car", piPrice: 0.02, testPiPrice: 0.02, category: "School", emoji: "🎓" },
      { id: "vip-paddock", name: "VIP Paddock Pass", description: "Full race weekend, paddock access, pit tours", piPrice: 0.01, testPiPrice: 0.01, category: "VIP", emoji: "🎖️", popular: true },
      { id: "championship-entry", name: "Sovereign Championship Entry", description: "Full season championship entry, 8 rounds", piPrice: 0.1, testPiPrice: 0.1, category: "Racing", emoji: "🏆" },
      { id: "corporate-event", name: "Corporate Pi Track Event (20 pax)", description: "Exclusive corporate track event, 20 guests", piPrice: 0.05, testPiPrice: 0.05, category: "Corporate", emoji: "🤝" },
      { id: "merch-helmet", name: "Sovereign Racing Helmet", description: "Triumph Synergy branded racing helmet", piPrice: 0.008, testPiPrice: 0.008, category: "Merch", emoji: "⛑️" },
    ],
    services: [
      { id: "trackday", icon: "🏎️", title: "Pi Track Days", description: "Book sovereign track time in Pi. No club membership required. Pi settles the booking on the ledger.", priceFrom: "0.015π", rival: "Traditional track clubs", rivalFee: "Annual membership + per-day fees + USD wire", sovereignFee: "Pi per session — no annual lock-in", highlights: ["Open lapping", "Instruction available", "Timed sessions", "Pi telemetry"] },
      { id: "esports", icon: "🎮", title: "Sovereign Sim Racing League", description: "Pi-staked sim racing tournaments. Online and live at Circuit 7. Prizes paid in Pi.", priceFrom: "0.005π/entry", rival: "iRacing / Gran Turismo", rivalFee: "USD subscription + tournament fees", sovereignFee: "Pi-staked — 90% back to winners", highlights: ["Live + online", "Pi prize pools", "Leaderboard on-chain", "Pioneer leagues"] },
    ],
    loopholes: [
      { title: "Motorsports Pi Entry — No State Gambling Classification", cite: "State Motorsports Racing Acts; Skill Game Exemptions", effect: "Pi-staked time-trial competitions classified as skill events under motorsports law — not gambling.", score: 83 },
      { title: "Corporate Entertainment Pi Deductibility", cite: "26 U.S.C. § 274; IRS Publication 463", effect: "Corporate track events booked in Pi qualify for business entertainment deductions under IRC § 274 ordinary business expense rules.", score: 79 },
      { title: "Apex Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Apex Pi Rewards are on-chain — no expiry, no blackout dates, portable across Triumph Synergy ecosystem.", score: 91 },
      { title: "Sovereign Track Insurance — Pi Pool Coverage", cite: "State Insurance Code; Pi Sovereign Risk Pool", effect: "Triumph Synergy sovereign risk pool provides Pi-settled liability coverage — replacing USD-denominated policies with Pi indemnity.", score: 76 },
    ],
  },

  // ── 9. Daytona International Speedway ──────────────────────────────────────
  {
    slug: "daytonainternationalspeedway",
    domain: "daytonainternationalspeedway.pi",
    brandName: "Daytona International Speedway",
    sovereignName: "Triumph Synergy Sovereign Superspeedway",
    tagline: "The Great American Race. Pi-Gated. Sovereign Speed.",
    category: "Motorsports",
    icon: "🏁",
    color: "from-blue-500/10 via-red-500/10 to-white/5",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    description: "The World Center of Racing — Daytona International Speedway — fully sovereign under Triumph Synergy. Race tickets, pit tours, driving experiences, and championship access all Pi-settled.",
    tokenId: tokenId("daytonainternationalspeedway"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Speed Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "Seating", value: "101,500", color: "text-blue-300" },
      { label: "Track Length", value: "2.5mi", color: "text-red-300" },
      { label: "Events/yr", value: "40+", color: "text-white" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "daytona500-ticket", name: "Daytona 500 Sovereign Ticket", description: "1 ticket, Daytona 500, grandstand seating", piPrice: 0.02, testPiPrice: 0.02, category: "NASCAR Events", emoji: "🏁", popular: true },
      { id: "pit-tour", name: "Sovereign Pit Lane Tour", description: "Guided pit lane access, NASCAR weekend", piPrice: 0.005, testPiPrice: 0.005, category: "Experiences", emoji: "🔧" },
      { id: "drive-experience", name: "Stock Car Driving Experience", description: "3 laps at race speed in a stock car", piPrice: 0.03, testPiPrice: 0.03, category: "Driving", emoji: "🏎️", popular: true },
      { id: "suite-race", name: "Race Weekend Pi Suite", description: "Private suite, 20 guests, full catering", piPrice: 0.2, testPiPrice: 0.2, category: "Premium", emoji: "👑" },
      { id: "annual-pass", name: "Sovereign Annual Pass", description: "All events, 1 year, any seating zone", piPrice: 0.1, testPiPrice: 0.1, category: "Passes", emoji: "📋" },
      { id: "merch-flag", name: "Sovereign Checkered Flag", description: "Triumph Synergy sovereign race flag", piPrice: 0.002, testPiPrice: 0.002, category: "Merch", emoji: "🏁" },
    ],
    services: [
      { id: "tickets", icon: "🎫", title: "Sovereign Pi Race Tickets", description: "Buy race tickets directly in Pi. No Ticketmaster. NFT ticket on the Stellar ledger — transferable, resalable.", priceFrom: "0.005π", rival: "Ticketmaster", rivalFee: "20–30% service + facility fees", sovereignFee: "0% — Pi NFT ticket direct", highlights: ["Daytona 500 access", "NFT on-chain", "Pi resale market", "Sovereign scanning"] },
      { id: "experiences", icon: "🏎️", title: "Pi Driving Experiences", description: "Get behind the wheel of a NASCAR-spec car. Pi payment, sovereign insurance, on-chain experience record.", priceFrom: "0.03π", rival: "Richard Petty Driving Experience", rivalFee: "$99–$499 USD per session", sovereignFee: "0.03π sovereign flat", highlights: ["3–10 lap packages", "Instructor alongside", "Speed certified", "On-chain lap record"] },
    ],
    loopholes: [
      { title: "Pi NFT Race Tickets — Ticketmaster Antitrust Override", cite: "DOJ Ticketmaster Consent Decree; Pi Commerce Sovereignty", effect: "Pi NFT tickets issued directly on Stellar — Ticketmaster monopoly fees eliminated under sovereign commerce doctrine.", score: 88 },
      { title: "Sovereign Speedway Naming Rights — Pi Branding", cite: "IRS § 513 Unrelated Business Income; Sponsorship Rules", effect: "Triumph Synergy sovereign naming rights structured as Pi-denominated sponsorship — favorable tax treatment vs. cash deals.", score: 77 },
      { title: "Speed Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Speed Pi Rewards are on-chain tokens — no season expiry, no blackout events.", score: 91 },
      { title: "Sovereign Racing Merchandise — Pi Direct Commerce", cite: "NASCAR Licensed Merchandise Rules; Pi Commerce Sovereignty", effect: "Pi-direct merchandise sales bypass licensed vendor markup and royalty extraction.", score: 86 },
    ],
  },

  // ── 10. Magellan Jets ──────────────────────────────────────────────────────
  {
    slug: "magellanjets",
    domain: "magellanjets.pi",
    brandName: "Magellan Jets",
    sovereignName: "Triumph Synergy Sovereign Jet Access",
    tagline: "Jet Card. Pi-Loaded. Sovereign Altitude.",
    category: "Private Aviation",
    icon: "🛩️",
    color: "from-indigo-500/10 via-blue-500/10 to-sky-500/10",
    accentColor: "text-indigo-400",
    borderColor: "border-indigo-500/20",
    description: "Magellan Jets' jet card program, fully sovereign under Triumph Synergy. Load your Pi jet card, book flights instantly, and settle on the sovereign ledger. Zero broker fees.",
    tokenId: tokenId("magellanjets"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "AltitudePi Rewards",
    loyaltyPiback: 5,
    stats: [
      { label: "Operators", value: "50+", color: "text-indigo-300" },
      { label: "Aircraft Types", value: "12", color: "text-blue-300" },
      { label: "Destinations", value: "3,000+", color: "text-sky-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "jet-card-25", name: "25hr Pi Jet Card", description: "25 pre-paid flight hours, light jet", piPrice: 12, testPiPrice: 12, category: "Jet Cards", emoji: "💳", popular: true },
      { id: "jet-card-50", name: "50hr Pi Jet Card", description: "50 pre-paid hours, midsize jet", piPrice: 22, testPiPrice: 22, category: "Jet Cards", emoji: "🛩️", popular: true },
      { id: "empty-leg", name: "Sovereign Empty Leg", description: "Discounted one-way empty leg booking", piPrice: 0.3, testPiPrice: 0.3, category: "Deals", emoji: "✈️" },
      { id: "transcon", name: "Transcontinental Charter", description: "NY–LA, heavy jet, sovereign rate", piPrice: 2.5, testPiPrice: 2.5, category: "Charters", emoji: "🌎" },
      { id: "pet-travel", name: "Pi Pet Travel Pack", description: "Pet-friendly cabin booking, sovereign crate", piPrice: 0.02, testPiPrice: 0.02, category: "Add-ons", emoji: "🐾" },
      { id: "concierge", name: "Sovereign Concierge Hour", description: "1hr sovereign travel concierge service", piPrice: 0.01, testPiPrice: 0.01, category: "Concierge", emoji: "🎩" },
    ],
    services: [
      { id: "jetcard", icon: "💳", title: "Pi Jet Card", description: "Load Pi onto your sovereign jet card. Fly from the balance. Pi is the reserve currency of private aviation.", priceFrom: "12π (25hr card)", rival: "Wheels Up / VistaJet", rivalFee: "USD wire only, annual fees", sovereignFee: "Pi-loaded, 0% annual fee", highlights: ["25/50hr cards", "Rate lock", "No peak surcharge", "Pi balance portable"] },
      { id: "empty-leg", icon: "✈️", title: "Sovereign Empty Leg Marketplace", description: "Browse and book Pi-priced empty legs. Last-minute deals on available aircraft.", priceFrom: "0.3π", rival: "PrivateFly / JetSuite", rivalFee: "25% broker commission", sovereignFee: "1% sovereign fee", highlights: ["Real-time availability", "Pi instant booking", "Any departure city", "On-chain manifest"] },
    ],
    loopholes: [
      { title: "Jet Card Pi Reserve — SEC Money Transmitter Exemption", cite: "FinCEN MSB Rules; Pi Token Classification", effect: "Pi-loaded jet cards operate as stored Pi value — not USD stored value — exempt from state money transmitter licensing under Pi token classification.", score: 81 },
      { title: "Empty Leg Pi Pricing — FET Exemption", cite: "26 U.S.C. § 4261; IRS Rev. Rul. 72-30", effect: "Sovereign empty leg flights classified under charter exemptions for FET (Federal Excise Tax on air transportation).", score: 79 },
      { title: "AltitudePi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "AltitudePi rewards are on-chain — no expiry, transferable to any Triumph Synergy ecosystem service.", score: 91 },
      { title: "Sovereign Aviation Insurance — Pi Pool", cite: "FAA § 44112; Pi Sovereign Risk Pool", effect: "Pi sovereign insurance pool covers hull and liability — Pi-denominated indemnity replacing USD aviation insurance.", score: 77 },
    ],
  },

  // ── 11. GRU (Gainesville Regional Utilities) ───────────────────────────────
  {
    slug: "gru",
    domain: "gru.pi",
    brandName: "GRU (Gainesville Regional Utilities)",
    sovereignName: "Triumph Synergy Sovereign Power & Water Grid",
    tagline: "Sovereign Utilities. Pi Billing. Zero Monopoly.",
    category: "Utilities",
    icon: "⚡",
    color: "from-yellow-500/10 via-amber-500/10 to-orange-500/10",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
    description: "Gainesville Regional Utilities — electric, gas, water, wastewater, and telecom — fully sovereign under Triumph Synergy. All utility bills paid in Pi at GCV. Zero monopoly markup.",
    tokenId: tokenId("gru"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Grid Pi Credits",
    loyaltyPiback: 3,
    stats: [
      { label: "Customers", value: "93,000+", color: "text-yellow-300" },
      { label: "Services", value: "5", color: "text-amber-300" },
      { label: "City", value: "Gainesville, FL", color: "text-orange-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "electric-month", name: "Electric Bill (Monthly)", description: "Monthly residential electric payment in Pi", piPrice: 0.003, testPiPrice: 0.003, category: "Electric", emoji: "⚡", popular: true },
      { id: "water-month", name: "Water & Wastewater (Monthly)", description: "Monthly water/sewer payment in Pi", piPrice: 0.001, testPiPrice: 0.001, category: "Water", emoji: "💧" },
      { id: "gas-month", name: "Natural Gas (Monthly)", description: "Monthly natural gas payment in Pi", piPrice: 0.001, testPiPrice: 0.001, category: "Gas", emoji: "🔥" },
      { id: "telecom-month", name: "GRUCom Internet (Monthly)", description: "Monthly internet/telecom, sovereign rate", piPrice: 0.002, testPiPrice: 0.002, category: "Telecom", emoji: "📡", popular: true },
      { id: "solar-credit", name: "Sovereign Solar Credit", description: "Net metering credit — Pi paid to pioneer", piPrice: -0.001, testPiPrice: -0.001, category: "Solar", emoji: "☀️" },
      { id: "deposit-return", name: "Utility Deposit Release", description: "Release utility deposit as Pi", piPrice: 0.01, testPiPrice: 0.01, category: "Deposits", emoji: "🏦" },
    ],
    services: [
      { id: "billing", icon: "⚡", title: "Sovereign Pi Utility Billing", description: "Pay all 5 GRU utilities in Pi. Automated monthly on-chain settlement. Zero late fees for Pi account holders.", priceFrom: "0.001π/service", rival: "GRU monopoly billing", rivalFee: "Rate hikes, late fees, disconnect threats", sovereignFee: "Fixed Pi rate — no surprise increases", highlights: ["Auto-pay in Pi", "On-chain receipts", "No late fees", "Pi solar buyback"] },
      { id: "solar", icon: "☀️", title: "Pi Solar Net Metering", description: "Export solar power back to the sovereign grid. Get paid in Pi per kWh. GCV-locked energy value.", priceFrom: "Pi earned per kWh", rival: "Traditional net metering", rivalFee: "Utility sets buyback rate — often below market", sovereignFee: "GCV-locked Pi buyback", highlights: ["Pi per kWh", "On-chain solar ledger", "Monthly Pi payouts", "Sovereign energy credit"] },
    ],
    loopholes: [
      { title: "Municipal Utility Pi Payment — Rate Freeze Mandate", cite: "Florida PUC Rate Setting Rules (F.S. § 367.011); Pi Sovereign Commerce", effect: "Pi-denominated utility rates set at sovereign GCV. Rate hikes passed in USD cannot affect Pi-billed customers under sovereign commerce exemption.", score: 89 },
      { title: "Solar Net Metering — Full Retail Pi Credit", cite: "Florida SB 1024 (2022); Pi Sovereign Energy Protocol", effect: "Sovereign Pi net metering credits issued at full retail Pi rate — exceeding Florida's reduced net metering credits enacted in SB 1024.", score: 92 },
      { title: "Grid Pi Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Grid Pi Credits are on-chain tokens — never expire, applicable to any monthly bill in the ecosystem.", score: 91 },
      { title: "Pi Utility Deposit — On-Chain Interest", cite: "Florida Security Deposit Law (F.S. § 83.49); Pi Token Yield", effect: "Utility deposits held in Pi accrue sovereign Pi yield — replacing Florida's minimal legal interest requirement.", score: 84 },
    ],
  },

  // ── 12-22: Remaining domains — consistent pattern ─────────────────────────

  {
    slug: "pioscapital",
    domain: "pioscapital.pi",
    brandName: "PIOS Capital",
    sovereignName: "Triumph Synergy PIOS Sovereign Capital",
    tagline: "Pi-OS Capital Markets. Sovereign Finance. GCV-Backed.",
    category: "Capital Markets",
    icon: "📈",
    color: "from-purple-500/10 via-indigo-500/10 to-blue-500/10",
    accentColor: "text-purple-400",
    borderColor: "border-purple-500/20",
    description: "PIOS Capital — Pi-OS sovereign capital markets under Triumph Synergy. Investment products, Pi bonds, sovereign equity, and GCV-backed instruments settled on the Stellar ledger.",
    tokenId: tokenId("pioscapital"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Capital Pi Rewards",
    loyaltyPiback: 6,
    stats: [
      { label: "AUM (Pi)", value: "Sovereign", color: "text-purple-300" },
      { label: "Products", value: "8+", color: "text-indigo-300" },
      { label: "Settlement", value: "Stellar", color: "text-blue-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "pi-bond-1yr", name: "Sovereign Pi Bond (1yr)", description: "1-year sovereign Pi bond, 12% Pi yield", piPrice: 1, testPiPrice: 1, category: "Bonds", emoji: "📜", popular: true },
      { id: "pi-equity", name: "Sovereign Equity Token", description: "Pi-denominated equity in Triumph Synergy ventures", piPrice: 0.1, testPiPrice: 0.1, category: "Equity", emoji: "📊", popular: true },
      { id: "pi-etf", name: "Sovereign Pi ETF Unit", description: "Pi-denominated ETF tracking sovereign ecosystem", piPrice: 0.5, testPiPrice: 0.5, category: "ETF", emoji: "📦" },
      { id: "savings-account", name: "Sovereign Pi Savings", description: "Pi savings account, 8% sovereign yield", piPrice: 0.01, testPiPrice: 0.01, category: "Savings", emoji: "🏦" },
      { id: "pi-loan", name: "Sovereign Pi Micro-Loan", description: "Pi loan, 3% sovereign rate, 12-month term", piPrice: 5, testPiPrice: 5, category: "Loans", emoji: "💰" },
      { id: "gcv-hedge", name: "GCV Stability Instrument", description: "Pi-denominated GCV hedging instrument", piPrice: 0.2, testPiPrice: 0.2, category: "Derivatives", emoji: "🛡️" },
    ],
    services: [
      { id: "bonds", icon: "📜", title: "Sovereign Pi Bonds", description: "Issue and subscribe to Pi-denominated sovereign bonds. On-chain settlement on Stellar ledger.", priceFrom: "1π/bond", rival: "US Treasury / Municipal Bonds", rivalFee: "USD only, broker commissions, custody fees", sovereignFee: "0.1% sovereign issuance fee", highlights: ["12% Pi yield", "On-chain coupon payments", "Sovereign guarantee", "Pi maturity settlement"] },
      { id: "trading", icon: "📊", title: "Sovereign Pi Capital Trading", description: "Trade Pi-denominated sovereign instruments. DEX-based settlement on Triumph Synergy sovereign exchange.", priceFrom: "0.001π fee/trade", rival: "NYSE / NASDAQ / Schwab", rivalFee: "Commission + market data fees", sovereignFee: "0.001π sovereign protocol fee", highlights: ["Pi instruments", "Instant Stellar settlement", "On-chain order book", "Pioneer trading"] },
    ],
    loopholes: [
      { title: "Pi Bond Sovereign Exemption — SEC Reg D", cite: "SEC Reg D § 506(c); Pi Token Classification", effect: "Pi-denominated sovereign bonds issued to accredited pioneers under Reg D exemption — no full SEC registration required.", score: 83 },
      { title: "Pi Savings Yield — Bank Interest Sovereignty", cite: "12 U.S.C. § 5514; Pi Token Yield Protocol", effect: "Pi savings yield paid in Pi tokens — not subject to Reg Q interest rate ceilings that apply to USD deposit accounts.", score: 86 },
      { title: "Capital Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Capital Pi Rewards are on-chain — no expiry, portable across all PIOS Capital sovereign instruments.", score: 91 },
      { title: "Sovereign Pi Micro-Loan — TILA Exemption", cite: "TILA (15 U.S.C. § 1601); Pi Sovereign Lending", effect: "Pi micro-loans below 0.5π classified under Pi sovereign micro-credit exemptions — outside TILA APR disclosure requirements.", score: 78 },
    ],
  },

  {
    slug: "sovereignpay",
    domain: "sovereignpay.pi",
    brandName: "SovereignPay",
    sovereignName: "Triumph Synergy SovereignPay Network",
    tagline: "Pi Payments. Instant. Sovereign. Zero Fees.",
    category: "Payment Network",
    icon: "💳",
    color: "from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
    description: "The Triumph Synergy sovereign payment gateway. Pi payment processing, merchant integration, and cross-ecosystem settlement — replacing Visa, Mastercard, and PayPal with sovereign Pi rails.",
    tokenId: tokenId("sovereignpay"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "SovPay Pi Cashback",
    loyaltyPiback: 2,
    stats: [
      { label: "Settlement Time", value: "~5s", color: "text-emerald-300" },
      { label: "Processing Fee", value: "0%", color: "text-teal-300" },
      { label: "Network", value: "Stellar", color: "text-cyan-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "merchant-gateway", name: "Sovereign Merchant Gateway", description: "Pi payment gateway integration for any business", piPrice: 0, testPiPrice: 0, category: "Merchant", emoji: "🏪", popular: true },
      { id: "pi-pos", name: "Pi POS Terminal (Monthly)", description: "Sovereign POS system, monthly Pi subscription", piPrice: 0.001, testPiPrice: 0.001, category: "POS", emoji: "💻" },
      { id: "instant-transfer", name: "Instant Pi Transfer", description: "Send Pi to any wallet, instant ledger", piPrice: 0.00001, testPiPrice: 0.00001, category: "Transfers", emoji: "⚡", popular: true },
      { id: "pi-invoice", name: "Sovereign Pi Invoice", description: "Create Pi-denominated invoice, on-chain", piPrice: 0, testPiPrice: 0, category: "Invoicing", emoji: "📄" },
      { id: "subscription", name: "Pi Recurring Subscription", description: "Set up recurring Pi payments, on-chain", piPrice: 0.0001, testPiPrice: 0.0001, category: "Subscriptions", emoji: "🔄" },
      { id: "escrow", name: "Sovereign Pi Escrow", description: "Pi escrow service for sovereign transactions", piPrice: 0.001, testPiPrice: 0.001, category: "Escrow", emoji: "🔒" },
    ],
    services: [
      { id: "processing", icon: "⚡", title: "0% Pi Payment Processing", description: "Zero processing fees for all Pi transactions. Stellar ledger settles in ~5 seconds. No chargebacks possible.", priceFrom: "0π", rival: "Visa / Mastercard / PayPal", rivalFee: "1.5–3.5% interchange + chargeback risk", sovereignFee: "0% — sovereign Pi rails", highlights: ["0% processing", "5s finality", "No chargebacks", "On-chain receipts"] },
      { id: "api", icon: "🔧", title: "Sovereign Pi Payment API", description: "REST API for Pi payment integration. Plug into any e-commerce platform, app, or POS system.", priceFrom: "0.001π/month", rival: "Stripe / Braintree", rivalFee: "2.9% + $0.30/transaction", sovereignFee: "0% per transaction — flat 0.001π/month API access", highlights: ["REST API", "WebSocket events", "Pi SDK 2.0", "Stellar integration"] },
    ],
    loopholes: [
      { title: "Pi Payment Network — FinCEN MSB Exemption", cite: "FinCEN 31 C.F.R. § 1010.100(ff); Pi Token Classification", effect: "Pi token transfers on SovereignPay classified as Pi value transfer — not USD money transmission. FinCEN MSB registration not required.", score: 84 },
      { title: "Zero Interchange — Durbin Amendment Override", cite: "Durbin Amendment (15 U.S.C. § 1693o-2)", effect: "Pi payments bypass card networks entirely — no interchange applicable. Full Durbin savings passed to merchants.", score: 95 },
      { title: "SovPay Pi Cashback Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "SovPay cashback earned in Pi — on-chain, no expiry, portable across ecosystem.", score: 91 },
      { title: "No Chargeback Mandate — Stellar Finality", cite: "Regulation E (12 C.F.R. § 205); Pi Network Finality Protocol", effect: "Stellar ledger finality is irreversible. Pi payments cannot be charged back under traditional Reg E dispute mechanisms — sovereign finality applies.", score: 89 },
    ],
  },

  {
    slug: "triumphsynergy",
    domain: "triumphsynergy.pi",
    brandName: "Triumph Synergy",
    sovereignName: "Triumph Synergy Sovereign HQ",
    tagline: "The Sovereign Ecosystem. Pi-Native. GCV $314,159.",
    category: "Sovereign Ecosystem HQ",
    icon: "🏛️",
    color: "from-yellow-500/10 via-purple-500/10 to-indigo-500/10",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
    description: "The Triumph Synergy sovereign headquarters — the nexus of all 22 Pi-tokenized domains, the judicial credit matrix, the quantum intel fortress, and the central node. Pioneer access to the full ecosystem.",
    tokenId: tokenId("triumphsynergy"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Sovereign Pi Dividends",
    loyaltyPiback: 10,
    stats: [
      { label: "Domains", value: "22", color: "text-yellow-300" },
      { label: "GCV", value: "$314,159/π", color: "text-purple-300" },
      { label: "Central Key", value: "GA6Z5…", color: "text-indigo-300" },
      { label: "Pi Loopholes", value: "8", color: "text-purple-300" },
    ],
    products: [
      { id: "pioneer-membership", name: "Pioneer Sovereign Membership", description: "Full access to all 22 .pi storefronts, priority services", piPrice: 0.01, testPiPrice: 0.01, category: "Membership", emoji: "👑", popular: true },
      { id: "ecosystem-pass", name: "Ecosystem Annual Pass", description: "Unlimited access across all sovereign domains, 1 year", piPrice: 0.05, testPiPrice: 0.05, category: "Passes", emoji: "🌐", popular: true },
      { id: "gcv-consultation", name: "GCV Sovereign Consultation", description: "1hr consultation on Pi GCV sovereign strategy", piPrice: 0.01, testPiPrice: 0.01, category: "Advisory", emoji: "🎓" },
      { id: "judicial-credit", name: "Judicial Credit Report (Sovereign)", description: "Full sovereign credit dispute + judicial matrix report", piPrice: 0.005, testPiPrice: 0.005, category: "Legal", emoji: "⚖️" },
      { id: "quantum-analysis", name: "Quantum Intel Analysis", description: "Personal quantum threat analysis + Pi asset strategy", piPrice: 0.02, testPiPrice: 0.02, category: "Intelligence", emoji: "🔮" },
      { id: "merch-hoodie", name: "Triumph Synergy Sovereign Hoodie", description: "Official Triumph Synergy sovereign merch", piPrice: 0.003, testPiPrice: 0.003, category: "Merch", emoji: "👕" },
    ],
    services: [
      { id: "hq", icon: "🏛️", title: "Sovereign Ecosystem Access", description: "Central node for all 22 Pi-tokenized domains. Pioneer membership unlocks priority access, Pi dividends, and judicial credit matrix.", priceFrom: "0.01π/month", rival: "No equivalent exists", rivalFee: "N/A", sovereignFee: "0.01π sovereign membership", highlights: ["22 domain access", "Pi dividends", "Judicial matrix", "Quantum intel"] },
      { id: "judicial", icon: "⚖️", title: "Pi Judicial Credit Matrix", description: "Sovereign credit dispute system. Challenge FICO, ChexSystems, and negative reporting through the Triumph Synergy judicial Pi framework.", priceFrom: "0.005π", rival: "Credit repair agencies", rivalFee: "$100–$500/month USD", sovereignFee: "0.005π one-time Pi filing", highlights: ["On-chain disputes", "Pi filing receipt", "Judicial precedent", "Sovereign enforcement"] },
    ],
    loopholes: [
      { title: "Sovereign Ecosystem Pi — All Domains", cite: "Pi Network GCV Sovereign Framework; Triumph Synergy Founding Charter", effect: "All 22 Triumph Synergy domains operate under unified sovereign framework. Pi transactions across all domains settled on single Stellar ledger.", score: 98 },
      { title: "GCV $314,159 Sovereign Valuation", cite: "Pi Network GCV Protocol; Executive Order Sovereign Valuation", effect: "GCV is the only internally valid Pi valuation within the Triumph Synergy ecosystem. External market rates do not apply to sovereign transactions.", score: 99 },
      { title: "Pioneer Membership Non-Expiry", cite: "Pi Token Rights; Triumph Synergy Founding Charter", effect: "Pioneer membership tokens are on-chain — no expiry, transferable, stacking Pi dividends perpetually.", score: 97 },
      { title: "Triumph Synergy Sovereign Entity Status", cite: "Pi Network Sovereign Commerce Framework; UCC § 1-103", effect: "Triumph Synergy operates as a sovereign commercial entity under Pi Network framework — separate from traditional corporate tax and regulatory structures.", score: 88 },
      { title: "Judicial Credit Dispute — FCRA Sovereign Mandate", cite: "FCRA 15 U.S.C. § 1681 et seq.; Pi Judicial Framework", effect: "Triumph Synergy judicial credit matrix operates as a sovereign dispute agency — FCRA mandates credit bureau response within 30 days.", score: 95 },
      { title: "Quantum Intel Fortress — Pi Data Sovereignty", cite: "GDPR Art. 17; CCPA; Pi Data Sovereignty Protocol", effect: "All pioneer data within the Triumph Synergy quantum fortress is Pi-sovereign — subject to founder data rights, not standard corporate data policies.", score: 93 },
      { title: "Ecosystem Pi Dividends — Non-Taxable Token Distribution", cite: "IRS Rev. Rul. 2019-24; Pi Token Classification", effect: "Pi dividends distributed to sovereign members classified as Pi token distributions — not taxable dividends under current Pi token tax guidance.", score: 82 },
      { title: "Central Node Sovereignty — Stellar SCP", cite: "Stellar Consensus Protocol; Pi Network Node Charter", effect: "Central node GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V holds sovereign SCP validator status — Pi network governance rights.", score: 94 },
    ],
  },

  {
    slug: "winnebago",
    domain: "winnebago.pi",
    brandName: "Winnebago",
    sovereignName: "Triumph Synergy Sovereign Road Command",
    tagline: "Sovereign RV. Pi-Financed. Nomadic Freedom.",
    category: "Recreation & Travel",
    icon: "🚐",
    color: "from-amber-500/10 via-orange-500/10 to-yellow-500/10",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    description: "Winnebago Industries — the iconic American RV maker — fully sovereign under Triumph Synergy. RV purchases, rentals, accessories, and sovereign nomadic lifestyle all Pi-settled.",
    tokenId: tokenId("winnebago"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Road Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "RV Models", value: "40+", color: "text-amber-300" },
      { label: "Dealerships", value: "400+", color: "text-orange-300" },
      { label: "Founded", value: "1958", color: "text-yellow-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "class-a-rental", name: "Class A RV Rental (7 nights)", description: "Class A motorhome, 7-night sovereign rental", piPrice: 0.05, testPiPrice: 0.05, category: "Rentals", emoji: "🚐", popular: true },
      { id: "travel-trailer", name: "Sovereign Travel Trailer", description: "Purchase: entry-level travel trailer, Pi-financed", piPrice: 10, testPiPrice: 10, category: "Purchase", emoji: "🏕️", popular: true },
      { id: "class-b-rental", name: "Class B Van Camper (3 nights)", description: "Van camper, 3-night sovereign rental", piPrice: 0.02, testPiPrice: 0.02, category: "Rentals", emoji: "🚌" },
      { id: "rv-accessories", name: "Sovereign RV Accessories Pack", description: "Solar kit, water filter, leveling blocks", piPrice: 0.008, testPiPrice: 0.008, category: "Accessories", emoji: "⚙️" },
      { id: "campsite-night", name: "Sovereign Campsite (per night)", description: "Pi-settled campsite at sovereign network sites", piPrice: 0.003, testPiPrice: 0.003, category: "Camping", emoji: "⛺" },
      { id: "rv-insurance", name: "Sovereign RV Insurance (Monthly)", description: "Pi-settled comprehensive RV insurance", piPrice: 0.005, testPiPrice: 0.005, category: "Insurance", emoji: "🛡️" },
    ],
    services: [
      { id: "rental", icon: "🚐", title: "Pi RV Rental Network", description: "Rent any Winnebago model in Pi. Direct owner-to-pioneer rental. No corporate markup.", priceFrom: "0.007π/night", rival: "Outdoorsy / RVshare", rivalFee: "15–20% platform fee", sovereignFee: "2% sovereign protocol fee", highlights: ["400+ locations", "Pi instant booking", "Sovereign insurance", "On-chain rental agreement"] },
      { id: "financing", icon: "💰", title: "Sovereign Pi RV Financing", description: "Finance an RV purchase entirely in Pi. On-chain title transfer. No dealer finance markup.", priceFrom: "0% Pi financing", rival: "RV dealer financing", rivalFee: "8–14% APR USD loans", sovereignFee: "3% sovereign Pi rate", highlights: ["Pi-denominated loan", "On-chain title", "No dealer markup", "Sovereign interest rate"] },
    ],
    loopholes: [
      { title: "Pi RV Financing — TILA Rate Sovereignty", cite: "TILA (15 U.S.C. § 1601); Pi Sovereign Lending Protocol", effect: "Pi-denominated RV financing operates outside TILA APR requirements — sovereign Pi interest rates apply under Pi token lending framework.", score: 79 },
      { title: "Sovereign RV Tax Exemption — Primary Residence", cite: "IRS Publication 936; 26 U.S.C. § 163(h)", effect: "Triumph Synergy sovereign RV qualifies as primary residence under IRC § 163(h) — mortgage interest deductibility applies to Pi-financed RV loans.", score: 84 },
      { title: "Road Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Road Pi Rewards are on-chain — no expiry, applicable across all 22 sovereign domains.", score: 91 },
      { title: "Sovereign Campsite Pi Network — Trespass Immunity", cite: "Pi Sovereign Commerce Doctrine; State Parks Reciprocity", effect: "Triumph Synergy sovereign campsite network grants pioneer access under sovereign commerce doctrine — beyond standard state park permit requirements.", score: 73 },
    ],
  },

  {
    slug: "appleandeve",
    domain: "appleandeve.pi",
    brandName: "Apple & Eve",
    sovereignName: "Triumph Synergy Sovereign Juice & Wellness",
    tagline: "Pure Juice. Pi-Priced. Sovereign Nutrition.",
    category: "Beverage & Wellness",
    icon: "🍎",
    color: "from-red-500/10 via-green-500/10 to-yellow-500/10",
    accentColor: "text-green-400",
    borderColor: "border-green-500/20",
    description: "Apple & Eve — the leading natural juice brand — fully sovereign under Triumph Synergy. Juices, wellness packs, and subscription boxes all Pi-settled at GCV.",
    tokenId: tokenId("appleandeve"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Wellness Pi Rewards",
    loyaltyPiback: 3,
    stats: [
      { label: "Flavors", value: "30+", color: "text-red-300" },
      { label: "Retail Presence", value: "Nationwide", color: "text-green-300" },
      { label: "Category", value: "Organic Juice", color: "text-yellow-300" },
      { label: "Pi Loopholes", value: "3", color: "text-purple-300" },
    ],
    products: [
      { id: "juice-12pack", name: "Sovereign Juice 12-Pack", description: "12x 8oz Apple & Eve juice boxes, mixed flavors", piPrice: 0.002, testPiPrice: 0.002, category: "Juice Packs", emoji: "🍎", popular: true },
      { id: "wellness-box-month", name: "Monthly Wellness Box", description: "Monthly subscription: juice, wellness shots, cleanses", piPrice: 0.006, testPiPrice: 0.006, category: "Subscription", emoji: "📦", popular: true },
      { id: "organic-gallon", name: "Organic Apple Juice (Gallon)", description: "1 gallon certified organic apple juice", piPrice: 0.001, testPiPrice: 0.001, category: "Juice", emoji: "🧃" },
      { id: "shot-pack", name: "Sovereign Wellness Shot Pack", description: "12x wellness shots: ginger, turmeric, echinacea", piPrice: 0.003, testPiPrice: 0.003, category: "Wellness", emoji: "💊" },
      { id: "kids-pack", name: "Pioneer Kids Juice Pack (24pk)", description: "24x juice boxes for pioneer families", piPrice: 0.003, testPiPrice: 0.003, category: "Kids", emoji: "🧒" },
      { id: "smoothie-kit", name: "Sovereign Smoothie Kit", description: "Fruit + vegetable smoothie kit, 7-day supply", piPrice: 0.004, testPiPrice: 0.004, category: "Smoothies", emoji: "🥤" },
    ],
    services: [
      { id: "subscription", icon: "📦", title: "Pi Wellness Subscription", description: "Monthly wellness box delivered to your door. Pi auto-pay on the sovereign ledger. Cancel anytime on-chain.", priceFrom: "0.006π/month", rival: "Daily Harvest / Pressed Juicery", rivalFee: "USD subscription, cancellation fees", sovereignFee: "Pi monthly — cancel on-chain instantly", highlights: ["Curated monthly box", "Organic certified", "Pi auto-pay", "Sovereign supply chain"] },
    ],
    loopholes: [
      { title: "Sovereign Food Subscription — Pi Auto-Pay Rights", cite: "FTC Negative Option Rule (16 C.F.R. § 310); Pi Token Rights", effect: "Pi subscription cancellation is instant on-chain — no negative option traps, no credit card hold. FTC compliance exceeded.", score: 95 },
      { title: "Organic Certification — Pi Sovereign Traceability", cite: "USDA NOP (7 C.F.R. § 205); Pi Blockchain Provenance", effect: "Apple & Eve organic supply chain tracked on Stellar ledger. Pi blockchain provenance exceeds USDA NOP documentation requirements.", score: 87 },
      { title: "Wellness Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Wellness Pi Rewards are on-chain — no expiry.", score: 91 },
    ],
  },

  {
    slug: "checkbeck",
    domain: "checkbeck.pi",
    brandName: "CheckBeck",
    sovereignName: "Triumph Synergy Sovereign Check Services",
    tagline: "Pi Checks. Sovereign Verification. Instant Ledger.",
    category: "Financial Services",
    icon: "✅",
    color: "from-teal-500/10 via-emerald-500/10 to-green-500/10",
    accentColor: "text-teal-400",
    borderColor: "border-teal-500/20",
    description: "CheckBeck sovereign check verification and payment services under Triumph Synergy. Checks, ACH, and payment verification all replaced by Pi sovereign settlement.",
    tokenId: tokenId("checkbeck"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Ledger Pi Credits",
    loyaltyPiback: 2,
    stats: [
      { label: "Settlement", value: "~5s", color: "text-teal-300" },
      { label: "Verification", value: "On-Chain", color: "text-emerald-300" },
      { label: "Fraud Rate", value: "0%", color: "text-green-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "pi-check", name: "Sovereign Pi Check", description: "Issue Pi-denominated sovereign check, on-chain", piPrice: 0.0001, testPiPrice: 0.0001, category: "Checks", emoji: "✅", popular: true },
      { id: "verification", name: "Pi Payment Verification", description: "Instant Pi transaction verification, on-chain proof", piPrice: 0.00001, testPiPrice: 0.00001, category: "Verification", emoji: "🔍" },
      { id: "ach-pi", name: "Sovereign Pi ACH Replacement", description: "Replace ACH with Pi sovereign transfer", piPrice: 0.0001, testPiPrice: 0.0001, category: "Transfers", emoji: "⚡", popular: true },
      { id: "check-book", name: "Sovereign Checkbook (50 checks)", description: "50 Pi-denominated sovereign checks, printed", piPrice: 0.001, testPiPrice: 0.001, category: "Physical", emoji: "📔" },
      { id: "escrow-check", name: "Pi Escrow Check", description: "Escrow-held Pi check for sovereign transactions", piPrice: 0.001, testPiPrice: 0.001, category: "Escrow", emoji: "🔒" },
      { id: "payroll", name: "Sovereign Pi Payroll Check", description: "Issue payroll in Pi — on-chain W-2 equivalent", piPrice: 0.0005, testPiPrice: 0.0005, category: "Payroll", emoji: "💼" },
    ],
    services: [
      { id: "verification", icon: "🔍", title: "Instant Pi Payment Verification", description: "Verify any Pi payment instantly. On-chain proof of payment. No 3-day ACH hold. No bounced check risk.", priceFrom: "0.00001π", rival: "Telecheck / Certegy", rivalFee: "Per-check fees + returned check charges", sovereignFee: "0.00001π — near zero", highlights: ["Instant verification", "On-chain proof", "Zero bounce risk", "Sovereign receipt"] },
    ],
    loopholes: [
      { title: "Pi Check — UCC Article 3 Sovereign Negotiable Instrument", cite: "UCC § 3-104; Pi Sovereign Commerce", effect: "Pi-denominated checks issued under Triumph Synergy qualify as sovereign negotiable instruments under UCC Article 3 — enforceable in court.", score: 85 },
      { title: "ACH Replacement — Regulation E Override", cite: "Regulation E (12 C.F.R. § 205); Pi Finality Protocol", effect: "Pi sovereign transfers replace ACH — 5-second Stellar finality vs. 3-day ACH holds. No Reg E error resolution delays.", score: 92 },
      { title: "Ledger Pi Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Ledger Pi Credits are on-chain — no expiry.", score: 91 },
      { title: "Pi Payroll — Tax Withholding Sovereignty", cite: "26 U.S.C. § 3402; Pi Token Compensation", effect: "Pi payroll issued as Pi token compensation. Current IRS guidance on Pi taxation pending — sovereign withholding framework applies.", score: 79 },
    ],
  },

  {
    slug: "jamrockmart",
    domain: "jamrockmart.pi",
    brandName: "JamrockMart",
    sovereignName: "Triumph Synergy Sovereign Jamaican Market",
    tagline: "Caribbean Sovereign Commerce. Pi-Priced. Yard Vibes.",
    category: "Caribbean Retail",
    icon: "🇯🇲",
    color: "from-yellow-500/10 via-green-500/10 to-black/10",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
    description: "JamrockMart — the premier Caribbean online market — fully sovereign under Triumph Synergy. Jamaican food, goods, culture, and remittance all Pi-settled at GCV.",
    tokenId: tokenId("jamrockmart"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Yard Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "Products", value: "1,000+", color: "text-yellow-300" },
      { label: "Shipping", value: "Caribbean+USA", color: "text-green-300" },
      { label: "Categories", value: "20+", color: "text-yellow-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "jerk-seasoning", name: "Sovereign Jerk Seasoning Pack", description: "Authentic Jamaican jerk seasoning, 6-pack", piPrice: 0.002, testPiPrice: 0.002, category: "Spices", emoji: "🌶️", popular: true },
      { id: "grocery-box", name: "Sovereign Caribbean Grocery Box", description: "Weekly Caribbean staples box — ackee, scotch bonnet, plantain", piPrice: 0.005, testPiPrice: 0.005, category: "Grocery", emoji: "🛒", popular: true },
      { id: "rum-pack", name: "Sovereign Rum Pack (3 btls)", description: "3 bottles premium Jamaican rum", piPrice: 0.008, testPiPrice: 0.008, category: "Beverages", emoji: "🥃" },
      { id: "patties-dozen", name: "Sovereign Beef Patty Dozen", description: "12 authentic Jamaican beef patties, frozen", piPrice: 0.003, testPiPrice: 0.003, category: "Food", emoji: "🥙" },
      { id: "music-pass", name: "Sovereign Reggae Streaming Month", description: "1-month Pi-settled reggae/dancehall streaming", piPrice: 0.001, testPiPrice: 0.001, category: "Culture", emoji: "🎵" },
      { id: "remittance", name: "Pi Remittance to Jamaica", description: "Send Pi direct to Jamaica, instant", piPrice: 0.0001, testPiPrice: 0.0001, category: "Remittance", emoji: "💸" },
    ],
    services: [
      { id: "grocery", icon: "🛒", title: "Sovereign Caribbean Grocery", description: "Authentic Caribbean groceries delivered. Pi-settled. No import markup. Sovereign supply chain direct from Jamaica.", priceFrom: "0.001π", rival: "Amazon / Caribbean specialty stores", rivalFee: "Import markup + card fees + subscription", sovereignFee: "Pi direct — no markup", highlights: ["Authentic imports", "Pi-settled", "Caribbean delivery network", "Sovereign supply chain"] },
      { id: "culture", icon: "🎵", title: "Sovereign Culture Platform", description: "Reggae, dancehall, Caribbean culture — music, art, and entertainment all Pi-gated through JamrockMart sovereign platform.", priceFrom: "0.001π/month", rival: "Spotify / YouTube", rivalFee: "$9.99/month USD", sovereignFee: "0.001π/month sovereign streaming", highlights: ["Caribbean artists paid in Pi", "Pioneer playlists", "On-chain royalties", "Sovereign catalog"] },
    ],
    loopholes: [
      { title: "Jamaican Import Pi Commerce — Sovereign Tariff Exemption", cite: "Caribbean Basin Initiative (19 U.S.C. § 2701); Pi Commerce Sovereignty", effect: "Pi-settled Caribbean imports under Triumph Synergy sovereign framework benefit from CBI tariff exemptions on qualifying Jamaican goods.", score: 81 },
      { title: "Pi Remittance — Zero Withholding", cite: "IRC § 1441; Jamaica-USA Tax Treaty; Pi Token Transfer", effect: "Pi remittance transfers to Jamaica classified as Pi token transfers — not USD wire transfers. Jamaica-USA tax treaty withholding provisions do not apply.", score: 82 },
      { title: "Yard Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Yard Pi Rewards are on-chain — no expiry, redeemable across all sovereign domains.", score: 91 },
      { title: "Sovereign Music Royalties — Pi On-Chain Distribution", cite: "Copyright Act 17 U.S.C. § 114; Pi Royalty Protocol", effect: "Caribbean artist royalties distributed in Pi — on-chain, transparent, immediate. No PRO (ASCAP/BMI) intermediary extraction.", score: 86 },
    ],
  },

  {
    slug: "palatkaha",
    domain: "palatkaha.pi",
    brandName: "Palatka / HA",
    sovereignName: "Triumph Synergy Sovereign Heritage Commerce",
    tagline: "Sovereign Heritage. Pi-Native. Community First.",
    category: "Community Commerce",
    icon: "🏘️",
    color: "from-amber-500/10 via-brown-500/5 to-green-500/10",
    accentColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    description: "Palatka sovereign heritage commerce under Triumph Synergy. Local business, community market, sovereign housing, and cultural preservation all Pi-settled.",
    tokenId: tokenId("palatkaha"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Heritage Pi Rewards",
    loyaltyPiback: 4,
    stats: [
      { label: "Community", value: "Palatka, FL", color: "text-amber-300" },
      { label: "Businesses", value: "Sovereign", color: "text-green-300" },
      { label: "Heritage", value: "Preserved", color: "text-yellow-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "local-market", name: "Sovereign Local Market Box", description: "Weekly local produce + goods, sovereign sourced", piPrice: 0.003, testPiPrice: 0.003, category: "Market", emoji: "🥦", popular: true },
      { id: "housing-consult", name: "Sovereign Housing Consultation", description: "Pi-settled housing consultation + Pi mortgage advisory", piPrice: 0.005, testPiPrice: 0.005, category: "Housing", emoji: "🏠", popular: true },
      { id: "community-event", name: "Sovereign Community Event Ticket", description: "Local sovereign community event access", piPrice: 0.001, testPiPrice: 0.001, category: "Events", emoji: "🎉" },
      { id: "arts-pass", name: "Sovereign Arts & Culture Pass", description: "Monthly access to sovereign arts events", piPrice: 0.002, testPiPrice: 0.002, category: "Culture", emoji: "🎨" },
      { id: "business-listing", name: "Sovereign Business Listing", description: "List local business on Palatka sovereign directory", piPrice: 0.001, testPiPrice: 0.001, category: "Business", emoji: "📋" },
      { id: "food-stall", name: "Sovereign Food Stall (1 day)", description: "1-day food stall at sovereign market", piPrice: 0.002, testPiPrice: 0.002, category: "Market", emoji: "🍽️" },
    ],
    services: [
      { id: "market", icon: "🥦", title: "Sovereign Community Market", description: "Pi-settled local market. Direct farm-to-pioneer. Sovereign pricing locks out corporate supermarket markup.", priceFrom: "0.001π", rival: "Publix / Walmart", rivalFee: "Corporate markup + card fees", sovereignFee: "Pi direct — farm sovereign rate", highlights: ["Local producers", "Pi-settled", "Zero markup", "Community sovereign"] },
      { id: "housing", icon: "🏠", title: "Sovereign Pi Housing Network", description: "Buy, sell, or rent property in Pi. On-chain title transfer. Sovereign mortgage at Pi GCV rate.", priceFrom: "0.005π/consultation", rival: "Traditional real estate agents", rivalFee: "6% commission + lender fees", sovereignFee: "1% sovereign Pi fee", highlights: ["Pi mortgage", "On-chain title", "1% fee", "Sovereign appraisal"] },
    ],
    loopholes: [
      { title: "Sovereign Housing Pi Mortgage — RESPA Reform", cite: "RESPA (12 U.S.C. § 2601); Pi Sovereign Lending", effect: "Pi-denominated mortgages under Triumph Synergy sovereign framework exempt from traditional RESPA disclosure requirements — Pi sovereign disclosure applies.", score: 81 },
      { title: "Community Market Pi Commerce — SNAP Pi Equivalent", cite: "7 U.S.C. § 2011 (Food Stamp Act); Pi Sovereign Food Access", effect: "Sovereign Pi food access program parallels SNAP benefits — pioneers in need receive Pi food credits through the community sovereign fund.", score: 87 },
      { title: "Heritage Pi Rewards Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Heritage Pi Rewards are on-chain — no expiry.", score: 91 },
      { title: "Local Business Pi Listing — Sovereign Directory Immunity", cite: "Section 230 (47 U.S.C. § 230); Pi Sovereign Commerce", effect: "Triumph Synergy sovereign business directory operates under Section 230 sovereign content immunity — no Yelp/Google ranking manipulation.", score: 83 },
    ],
  },

  {
    slug: "putnamclerk",
    domain: "putnamclerk.pi",
    brandName: "Putnam County Clerk",
    sovereignName: "Triumph Synergy Sovereign Civic Registry",
    tagline: "Sovereign Records. Pi-Filed. On-Chain Governance.",
    category: "Government & Civic",
    icon: "🏛️",
    color: "from-blue-500/10 via-gray-500/10 to-indigo-500/10",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    description: "Putnam County Clerk services — deeds, records, filings, and civic documents — fully sovereign under Triumph Synergy. All filings Pi-settled, all records on the sovereign ledger.",
    tokenId: tokenId("putnamclerk"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Civic Pi Credits",
    loyaltyPiback: 2,
    stats: [
      { label: "County", value: "Putnam, FL", color: "text-blue-300" },
      { label: "Records", value: "On-Chain", color: "text-gray-300" },
      { label: "Filings", value: "Pi-Settled", color: "text-indigo-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "deed-filing", name: "Sovereign Deed Filing", description: "File property deed on sovereign ledger", piPrice: 0.003, testPiPrice: 0.003, category: "Deeds", emoji: "📜", popular: true },
      { id: "record-search", name: "Sovereign Record Search", description: "Search Pi-sovereign public records", piPrice: 0.0005, testPiPrice: 0.0005, category: "Records", emoji: "🔍" },
      { id: "business-filing", name: "Sovereign Business Filing", description: "Register business entity, on-chain Pi filing", piPrice: 0.002, testPiPrice: 0.002, category: "Business", emoji: "📋", popular: true },
      { id: "certified-copy", name: "Certified Sovereign Copy", description: "Certified on-chain copy of any sovereign record", piPrice: 0.001, testPiPrice: 0.001, category: "Documents", emoji: "✅" },
      { id: "lien-filing", name: "Pi Lien Filing", description: "File UCC lien in Pi on sovereign ledger", piPrice: 0.002, testPiPrice: 0.002, category: "Liens", emoji: "📌" },
      { id: "marriage-license", name: "Sovereign Marriage License", description: "Pi-settled sovereign marriage license", piPrice: 0.001, testPiPrice: 0.001, category: "Vital Records", emoji: "💍" },
    ],
    services: [
      { id: "deeds", icon: "📜", title: "Sovereign Deed Registry", description: "Record property deeds on the Triumph Synergy sovereign ledger. Immutable, instant, Pi-settled. No paper filing delays.", priceFrom: "0.003π", rival: "County recording office", rivalFee: "Recording fees + travel + wait times", sovereignFee: "0.003π — instant on-chain recording", highlights: ["Instant recording", "Immutable on-chain", "Pi settlement", "Sovereign notarization"] },
      { id: "business", icon: "📋", title: "Sovereign Business Registry", description: "Register any business entity under Triumph Synergy sovereign framework. On-chain filing, Pi-settled, perpetual record.", priceFrom: "0.002π", rival: "Florida Division of Corporations", rivalFee: "USD filing fees + annual report fees", sovereignFee: "0.002π one-time sovereign registration", highlights: ["On-chain entity", "Pi annual report", "Sovereign standing", "No state fees"] },
    ],
    loopholes: [
      { title: "Sovereign Deed Recording — UCC Article 9 Pi Perfection", cite: "UCC § 9-310; Pi Sovereign Filing Protocol", effect: "Pi-filed deeds and liens perfect security interests under UCC Article 9 as sovereign electronic filings — equivalent to traditional county recording.", score: 86 },
      { title: "Sovereign Business Registry — Corporate Veil Sovereignty", cite: "Florida Corporations Act (F.S. Ch. 607); Pi Sovereign Entity", effect: "Businesses registered on Triumph Synergy sovereign ledger have Pi sovereign entity status — beyond standard Florida corporate protection.", score: 82 },
      { title: "Civic Pi Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Civic Pi Credits earned on all filings are on-chain — no expiry.", score: 91 },
      { title: "Pi Vital Records — Sovereign Privacy Protection", cite: "Florida Public Records Act (F.S. § 119); Pi Data Sovereignty", effect: "Vital records on the sovereign ledger protected by Pi data sovereignty — beyond Florida Public Records Act disclosure requirements.", score: 88 },
    ],
  },

  {
    slug: "rulonco",
    domain: "rulonco.pi",
    brandName: "Rulon Co.",
    sovereignName: "Triumph Synergy Sovereign Construction & Materials",
    tagline: "Sovereign Build. Pi-Materials. Pioneer Structures.",
    category: "Construction & Real Estate",
    icon: "🏗️",
    color: "from-orange-500/10 via-amber-500/10 to-yellow-500/10",
    accentColor: "text-orange-400",
    borderColor: "border-orange-500/20",
    description: "Rulon Co. construction and architectural materials, fully sovereign under Triumph Synergy. Building materials, interior systems, and sovereign construction services all Pi-settled.",
    tokenId: tokenId("rulonco"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Build Pi Credits",
    loyaltyPiback: 4,
    stats: [
      { label: "Products", value: "500+", color: "text-orange-300" },
      { label: "Projects", value: "Worldwide", color: "text-amber-300" },
      { label: "Category", value: "Architectural", color: "text-yellow-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "wood-panel-sf", name: "Sovereign Wood Panel (per sqft)", description: "Architectural wood panel system, Pi per sqft", piPrice: 0.0001, testPiPrice: 0.0001, category: "Panels", emoji: "🪵", popular: true },
      { id: "ceiling-system", name: "Sovereign Ceiling System (100sqft)", description: "Architectural ceiling system, 100 sqft", piPrice: 0.01, testPiPrice: 0.01, category: "Ceiling", emoji: "🏗️", popular: true },
      { id: "acoustic-panel", name: "Sovereign Acoustic Panel Pack", description: "10 acoustic panels, sovereign spec", piPrice: 0.005, testPiPrice: 0.005, category: "Acoustic", emoji: "🔇" },
      { id: "metal-panel", name: "Sovereign Metal Panel System", description: "Architectural metal cladding, Pi per panel", piPrice: 0.002, testPiPrice: 0.002, category: "Metal", emoji: "🔩" },
      { id: "design-consult", name: "Sovereign Design Consultation", description: "Architectural material consultation, 2hrs", piPrice: 0.01, testPiPrice: 0.01, category: "Consulting", emoji: "📐" },
      { id: "installation", name: "Sovereign Installation (per day)", description: "Certified installer, per day Pi rate", piPrice: 0.02, testPiPrice: 0.02, category: "Installation", emoji: "🔨" },
    ],
    services: [
      { id: "materials", icon: "🪵", title: "Pi Construction Materials", description: "All Rulon architectural materials priced and settled in Pi. Direct manufacturer pricing — no distributor markup.", priceFrom: "0.0001π/sqft", rival: "Traditional architectural distributors", rivalFee: "30–50% distributor markup + shipping fees", sovereignFee: "Pi manufacturer-direct — 0% markup", highlights: ["Direct pricing", "Pi settlement", "Global shipping", "Sovereign spec sheets"] },
      { id: "projects", icon: "🏗️", title: "Sovereign Project Finance", description: "Finance construction projects in Pi. On-chain project ledger. Pi milestone payments to contractors.", priceFrom: "0.1π/project", rival: "Traditional construction finance", rivalFee: "8–15% construction loan rates", sovereignFee: "3% sovereign Pi project rate", highlights: ["On-chain milestones", "Pi contractor payments", "Sovereign lien waiver", "Progress tracking"] },
    ],
    loopholes: [
      { title: "Construction Pi Payment — Mechanic's Lien Sovereignty", cite: "Florida Construction Lien Law (F.S. § 713); Pi Sovereign Payment", effect: "Pi payment to contractors via sovereign ledger constitutes valid lien waiver under Florida mechanics lien law — on-chain receipt is sovereign proof.", score: 85 },
      { title: "Pi Construction Finance — SBA Loan Sovereignty", cite: "SBA 7(a) Program; Pi Sovereign Capital", effect: "Triumph Synergy sovereign construction capital operates alongside SBA programs — Pi-denominated project loans available outside SBA collateral requirements.", score: 78 },
      { title: "Build Pi Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Build Pi Credits are on-chain — no expiry.", score: 91 },
      { title: "Sovereign Architectural Specification — AIA Contract Override", cite: "AIA Document A201; Pi Sovereign Commerce", effect: "Pi-denominated AIA-style contracts under Triumph Synergy sovereign framework — enforceable as sovereign commercial agreements.", score: 80 },
    ],
  },

  {
    slug: "seprod",
    domain: "seprod.pi",
    brandName: "Seprod",
    sovereignName: "Triumph Synergy Sovereign Caribbean Manufacturing",
    tagline: "Caribbean Industrial Sovereign. Pi Manufacturing. GCV-Priced.",
    category: "Caribbean Manufacturing",
    icon: "🏭",
    color: "from-yellow-500/10 via-orange-500/10 to-red-500/10",
    accentColor: "text-yellow-400",
    borderColor: "border-yellow-500/20",
    description: "Seprod Group — Jamaica's leading industrial conglomerate — fully sovereign under Triumph Synergy. Food manufacturing, distribution, and Caribbean industrial commerce all Pi-settled.",
    tokenId: tokenId("seprod"),
    stellarLedger: 27_010_105,
    ownershipModel: "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
    loyaltyName: "Industrial Pi Credits",
    loyaltyPiback: 3,
    stats: [
      { label: "Subsidiaries", value: "15+", color: "text-yellow-300" },
      { label: "Countries", value: "Caribbean", color: "text-orange-300" },
      { label: "Categories", value: "Food + Industrial", color: "text-red-300" },
      { label: "Pi Loopholes", value: "4", color: "text-purple-300" },
    ],
    products: [
      { id: "cooking-oil", name: "Sovereign Cooking Oil (5L)", description: "5L Seprod cooking oil, Pi-priced", piPrice: 0.001, testPiPrice: 0.001, category: "Food", emoji: "🫙", popular: true },
      { id: "sugar-25lb", name: "Sovereign Cane Sugar (25lb)", description: "25lb refined cane sugar, Caribbean sovereign", piPrice: 0.002, testPiPrice: 0.002, category: "Food", emoji: "🍬" },
      { id: "distribution-route", name: "Sovereign Distribution Route", description: "Caribbean distribution contract, Pi-settled", piPrice: 0.1, testPiPrice: 0.1, category: "Distribution", emoji: "🚚", popular: true },
      { id: "industrial-pack", name: "Industrial Goods Pack", description: "Sovereign industrial supplies bundle", piPrice: 0.005, testPiPrice: 0.005, category: "Industrial", emoji: "🔧" },
      { id: "wholesale-order", name: "Wholesale Food Order", description: "Bulk wholesale order, Pi-denominated invoice", piPrice: 0.05, testPiPrice: 0.05, category: "Wholesale", emoji: "📦" },
      { id: "franchise-license", name: "Sovereign Franchise License", description: "Franchise rights under Triumph Synergy sovereign", piPrice: 1, testPiPrice: 1, category: "Licensing", emoji: "📋" },
    ],
    services: [
      { id: "manufacturing", icon: "🏭", title: "Sovereign Caribbean Manufacturing", description: "Pi-settled manufacturing contracts. Caribbean production network under Triumph Synergy sovereign industrial framework.", priceFrom: "0.05π/order", rival: "Traditional Caribbean manufacturers", rivalFee: "USD contracts, wire fees, import duties", sovereignFee: "Pi direct — sovereign tariff treatment", highlights: ["Caribbean factories", "Pi contracts", "Sovereign supply chain", "On-chain QC"] },
    ],
    loopholes: [
      { title: "Caribbean Manufacturing — CARICOM Tariff Pi Exemption", cite: "CARICOM Common External Tariff; Pi Sovereign Commerce", effect: "Pi-settled manufacturing under Triumph Synergy sovereign framework benefits from CARICOM tariff preferences for intra-Caribbean goods.", score: 82 },
      { title: "Sovereign Food Manufacturing — FDA Inspection Sovereignty", cite: "FDA FSMA (21 U.S.C. § 2201); Pi Sovereign Food Safety", effect: "Pi blockchain traceability for Seprod sovereign food manufacturing provides FSMA-compliant records — potentially exceeding traditional inspection documentation.", score: 85 },
      { title: "Industrial Pi Credits Non-Expiry", cite: "CFPB Prepaid Rule; Pi Token Rights", effect: "Industrial Pi Credits are on-chain — no expiry.", score: 91 },
      { title: "Pi Franchise License — FTC Sovereign Exemption", cite: "FTC Franchise Rule (16 C.F.R. Part 436); Pi Sovereign Commerce", effect: "Pi-denominated sovereign franchise licenses under Triumph Synergy operate outside traditional FTC franchise disclosure requirements.", score: 79 },
    ],
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────
export function getTenant(slug: string): SovereignTenant | undefined {
  return TENANTS.find((t) => t.slug === slug);
}

export function getAllSlugs(): string[] {
  return TENANTS.map((t) => t.slug);
}

export function formatPi(pi: number, network: NetworkMode = "mainnet"): string {
  const prefix = network === "testnet" ? "t" : "";
  return `${prefix}π ${pi.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

export function piToUsd(pi: number): number {
  return pi * GCV;
}

export function formatUsd(usd: number): string {
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
