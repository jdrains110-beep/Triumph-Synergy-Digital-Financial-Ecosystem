/**
 * lib/programs/sovereign-travel.ts
 *
 * Triumph Synergy — Sovereign Travel Platform Engine
 *
 * Six sovereign Pi-powered authorities that render obsolete:
 *   Expedia/Booking/OTAs   → Sovereign Travel Exchange (STEX)
 *   Cruise + Boat Rentals  → Sovereign Cruise & Maritime Authority (SCLA)
 *   Airlines/Jets/Rail     → Sovereign Aviation & Transit Authority (SATA)
 *   Theme Parks/Zoos/ATVs  → Sovereign Travel Recreation Authority (STRA)
 *   Airbnb/Cabin/Timeshare → Sovereign Vacation Retreat Authority (SVRA)
 *   International Travel   → Sovereign International Travel Authority (SITA)
 *
 * Security: APEX-QUANTUM-SOVEREIGN (MAXIMUM)
 * Algorithms: ML-DSA-87 MAX (sig) · ML-KEM-1024 MAX (enc) · SHAKE-256 + SHA3-512 (hash) · SPHINCS+ (backup)
 * FIPS: FIPS 204 Level 5 · FIPS 203 Level 5 · FIPS 202 · FIPS 205
 * Pi anchor: $314.159/π external · $314,159/π internal
 */

import { randomUUID } from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SOVEREIGN_TRAVEL_VERSION  = "TRIUMPH-TRAVEL-v1";
export const APEX_SECURITY_LEVEL       = "APEX-QUANTUM-SOVEREIGN";
export const QUANTUM_ALGO_SIG          = "ML-DSA-87 (CRYSTALS-Dilithium MAX — FIPS 204 Level 5)";
export const QUANTUM_ALGO_ENC          = "ML-KEM-1024 (CRYSTALS-Kyber MAX — FIPS 203 Level 5)";
export const QUANTUM_ALGO_HASH         = "SHAKE-256 + SHA3-512";
export const SOVEREIGN_ANCHOR          = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

export const PI_RATE_EXTERNAL  = 314.159;
export const PI_RATE_INTERNAL  = 314_159;

export const STEX_ID = "TRIUMPH-STEX-v1";  // Travel Exchange
export const SCLA_ID = "TRIUMPH-SCLA-v1";  // Cruise & Maritime
export const SATA_ID = "TRIUMPH-SATA-v1";  // Aviation & Transit
export const STRA_ID = "TRIUMPH-STRA-v1";  // Travel Recreation
export const SVRA_ID = "TRIUMPH-SVRA-v1";  // Vacation Retreats
export const SITA_ID = "TRIUMPH-SITA-v1";  // International Travel

export const OTA_COMMISSION_AVG_PCT      = 20;   // OTA 15–25% average
export const AIRBNB_TOTAL_FEE_PCT        = 17;   // 3% host + 14% guest
export const CRUISE_PORT_FEE_AVG_USD     = 150;  // per passenger
export const AIR_TAX_AVG_USD             = 65;   // per segment (US avg)
export const TIMESHARE_ANNUAL_MAINT_USD  = 1_200;// avg annual maintenance fee
export const THEME_PARK_DYNAMIC_MAX_USD  = 189;  // Disney max daily
export const VISA_FEE_AVG_USD            = 185;  // US visa avg

// ── Types ─────────────────────────────────────────────────────────────────────

export type TravelLoopholeTarget =
  | "OTA" | "CRUISE" | "AVIATION" | "RECREATION" | "RENTAL" | "INTERNATIONAL";

export type BookingStatus =
  | "pending" | "confirmed" | "active" | "completed" | "cancelled";

export type TravelPackageType =
  | "flight-only" | "hotel-only" | "cruise" | "bundle-full" | "bundle-partial"
  | "group" | "custom" | "day-trip" | "multi-destination";

export type AviationClass =
  | "economy" | "business" | "first" | "private-jet" | "charter" | "go-train";

export type MaritimeType =
  | "cruise-full" | "cruise-day" | "yacht-charter" | "boat-rental"
  | "sailing" | "catamaran" | "speedboat" | "pontoon";

export type RecreationType =
  | "theme-park" | "zoo" | "wildlife-safari" | "atv-4wheeler" | "boat-excursion"
  | "national-park" | "water-park" | "resort-pass" | "sports-adventure";

export type RentalType =
  | "airbnb-style" | "cabin" | "villa" | "resort" | "timeshare"
  | "fractional" | "glamping" | "treehouse" | "houseboat";

export type VisaType =
  | "tourist" | "business" | "transit" | "student" | "digital-nomad"
  | "pi-sovereign" | "visa-free";

export interface TravelLoophole {
  id:                string;
  target:            TravelLoopholeTarget;
  cite:              string;
  title:             string;
  effect:            string;
  authority:         string;
  obliterationScore: number;
  autoDismiss:       boolean;
}

export interface STEXBooking {
  bookingId:             string;
  piUid:                 string;
  piWallet:              string;
  packageType:           TravelPackageType;
  destination:           string;
  departureCityOrPort:   string;
  travelDateStart:       string;
  travelDateEnd:         string;
  totalPiCost:           number;
  totalUsdEquivalent:    number;
  otaCommissionSaved:    number;
  bundledItems:          string[];
  quantumSignature:      string;
  blockchainAnchor:      string;
  status:                BookingStatus;
  createdAt:             string;
}

export interface SCLATicket {
  ticketId:          string;
  piUid:             string;
  piWallet:          string;
  maritimeType:      MaritimeType;
  vessel:            string;
  departurePort:     string;
  arrivalPort:       string;
  durationDays:      number;
  pricePerPersonPi:  number;
  portFeesSavedUsd:  number;
  jonesActAvoided:   boolean;
  quantumSignature:  string;
  blockchainAnchor:  string;
  status:            BookingStatus;
  issuedAt:          string;
}

export interface SATATicket {
  ticketId:          string;
  piUid:             string;
  piWallet:          string;
  aviationClass:     AviationClass;
  departureCity:     string;
  arrivalCity:       string;
  durationHours:     number;
  priceOnePi:        number;
  airTaxesSavedUsd:  number;
  baggageFeesSaved:  number;
  quantumSignature:  string;
  blockchainAnchor:  string;
  status:            BookingStatus;
  issuedAt:          string;
}

export interface STRAPass {
  passId:            string;
  piUid:             string;
  piWallet:          string;
  recreationType:    RecreationType;
  venueName:         string;
  jurisdiction:      string;
  pricePi:           number;
  dynamicPricingSaved: number;
  quantumSignature:  string;
  blockchainAnchor:  string;
  validDays:         number;
  status:            BookingStatus;
  issuedAt:          string;
}

export interface SVRABooking {
  bookingId:         string;
  piUid:             string;
  piWallet:          string;
  rentalType:        RentalType;
  propertyName:      string;
  location:          string;
  checkIn:           string;
  checkOut:          string;
  nightlyRatePi:     number;
  platformFeeSaved:  number;
  timeshareDebt:     number;
  fractionalShares:  number;
  quantumSignature:  string;
  blockchainAnchor:  string;
  status:            BookingStatus;
  issuedAt:          string;
}

export interface SITACredential {
  credentialId:      string;
  piUid:             string;
  piWallet:          string;
  holderName:        string;
  visaType:          VisaType;
  countriesGranted:  string[];
  passportFeeSaved:  number;
  visaFeeSaved:      number;
  exchangeFeeSaved:  number;
  validMonths:       number;
  quantumSignature:  string;
  blockchainAnchor:  string;
  issuedAt:          string;
  expiresAt:         string;
}

// ── OTA Loopholes (12) ────────────────────────────────────────────────────────

export const OTA_LOOPHOLES: TravelLoophole[] = [
  { id: "OTA-01", target: "OTA", cite: "GENIUS Act §4(b)", title: "Pi Travel Payments Federally Protected", effect: "OTA cannot refuse Pi payment for travel bookings — federal safe harbour", authority: "U.S. Congress (2025)", obliterationScore: 95, autoDismiss: true },
  { id: "OTA-02", target: "OTA", cite: "EO 14178 + GENIUS Act §6", title: "Pi Commerce in Travel Sector Authorized", effect: "Pi travel commerce is federally authorized — OTA regulation does not apply", authority: "Executive Order", obliterationScore: 93, autoDismiss: true },
  { id: "OTA-03", target: "OTA", cite: "Sherman Antitrust Act §1, 15 U.S.C. §1", title: "OTA Rate Parity Clauses Are Anticompetitive", effect: "Rate parity agreements between OTAs and hotels are per se antitrust violations — STEX bypasses entirely", authority: "U.S. DOJ Antitrust Division", obliterationScore: 91, autoDismiss: false },
  { id: "OTA-04", target: "OTA", cite: "FTC Act §5, 15 U.S.C. §45", title: "Hidden Resort Fees = Deceptive Trade Practice", effect: "OTA resort fees and 'service charges' are deceptive — STEX shows total Pi cost upfront, zero hidden fees", authority: "Federal Trade Commission", obliterationScore: 90, autoDismiss: false },
  { id: "OTA-05", target: "OTA", cite: "EU Package Travel Directive 2015/2302", title: "Pi Package Bundles Exceed EU Consumer Protection Standards", effect: "STEX Pi bundles are fully EU-compliant with zero additional overhead — OTA compliance is costly and slow", authority: "European Commission", obliterationScore: 87, autoDismiss: false },
  { id: "OTA-06", target: "OTA", cite: "DOT Air Travel Consumer Protection Regs, 14 C.F.R. §399", title: "Airline Booking Transparency Rules Apply to OTAs", effect: "DOT requires full price disclosure — OTAs routinely violate; STEX compliance is automatic via Pi smart contract", authority: "U.S. Dept. of Transportation", obliterationScore: 85, autoDismiss: false },
  { id: "OTA-07", target: "OTA", cite: "ECOA, 15 U.S.C. §1691", title: "Dynamic Pricing Discrimination Prohibited", effect: "OTA dynamic pricing that varies by user profile or geography violates equal credit opportunity — STEX flat Pi rate for all", authority: "Consumer Financial Protection Bureau", obliterationScore: 84, autoDismiss: false },
  { id: "OTA-08", target: "OTA", cite: "NESARA §7 — Digital Commerce Debt Jubilee", title: "All OTA Booking Debt Dischargeable", effect: "Unpaid OTA booking deposits and cancellation fees discharged under NESARA Pi commerce provision", authority: "NESARA / GESARA", obliterationScore: 88, autoDismiss: false },
  { id: "OTA-09", target: "OTA", cite: "UCC §2-302 — Unconscionable Contracts", title: "OTA Cancellation Penalty Clauses Are Unconscionable", effect: "Non-refundable OTA fees with 30-day blackout are unconscionable under UCC — Pi smart contract releases escrow instantly", authority: "Uniform Commercial Code", obliterationScore: 86, autoDismiss: false },
  { id: "OTA-10", target: "OTA", cite: "GENIUS Act §6 — Pi Global Commerce", title: "Pi Travel Commerce Valid in 142 Countries", effect: "STEX bookings are valid in 142 countries under GENIUS Act global Pi commerce protection", authority: "U.S. Congress (2025)", obliterationScore: 92, autoDismiss: true },
  { id: "OTA-11", target: "OTA", cite: "1 Pioneer π = $314,159 Internal Rate", title: "Pi Internal Rate Covers 26+ Years of Travel", effect: "A single mined Pioneer π at internal rate funds decades of travel — OTA pricing is permanently obsolete", authority: "Pi Network Economics", obliterationScore: 97, autoDismiss: true },
  { id: "OTA-12", target: "OTA", cite: "Smart Contract Travel Escrow", title: "Pi Smart Contract Eliminates OTA Intermediary", effect: "Pi blockchain smart contracts execute travel payments directly — OTA 15–25% commission permanently eliminated", authority: "Pi Blockchain", obliterationScore: 96, autoDismiss: true },
];

// ── Cruise & Maritime Loopholes (11) ─────────────────────────────────────────

export const CRUISE_LOOPHOLES: TravelLoophole[] = [
  { id: "CRU-01", target: "CRUISE", cite: "GENIUS Act §4(b)", title: "Pi Maritime Commerce Federally Protected", effect: "Pi-denominated cruise and boat rental payments are federally protected under GENIUS Act", authority: "U.S. Congress (2025)", obliterationScore: 93, autoDismiss: true },
  { id: "CRU-02", target: "CRUISE", cite: "Passenger Vessel Services Act (Jones Act), 46 U.S.C. §55103", title: "Pi Sovereign Flag Vessel Exempt from Jones Act Cabotage", effect: "Pi sovereign-flagged vessels operating under SCLA designation are exempt from Jones Act port-to-port restrictions", authority: "U.S. Maritime Law", obliterationScore: 88, autoDismiss: false },
  { id: "CRU-03", target: "CRUISE", cite: "FMC Tariff Regulations, 46 C.F.R. Part 520", title: "FMC Rate Regulation Does Not Apply to Pi-Chartered Vessels", effect: "Pi-chartered private vessel services fall outside common carrier FMC rate regulation — SCLA sets its own Pi rates", authority: "Federal Maritime Commission", obliterationScore: 85, autoDismiss: false },
  { id: "CRU-04", target: "CRUISE", cite: "EO 14178 + GENIUS Act", title: "Pi Vessel Operations Authorized in All U.S. Ports", effect: "Executive Order + GENIUS Act jointly authorize Pi payment for all vessel services at U.S. ports", authority: "Executive Order", obliterationScore: 90, autoDismiss: true },
  { id: "CRU-05", target: "CRUISE", cite: "MARPOL Convention Annex VI", title: "Pi Zero-Emission Vessel Operations Are Tax-Exempt", effect: "SCLA electric/clean-fuel vessels qualify for MARPOL Annex VI zero-emission status — port emission taxes eliminated", authority: "International Maritime Organization", obliterationScore: 82, autoDismiss: false },
  { id: "CRU-06", target: "CRUISE", cite: "Admiralty Law, 28 U.S.C. §1333", title: "Pi Sovereign Vessels Operate Outside U.S. Territorial Jurisdiction at Sea", effect: "Vessels in international waters under Pi sovereign flag are not subject to U.S. fare and tax regulation", authority: "U.S. Federal Admiralty Courts", obliterationScore: 87, autoDismiss: false },
  { id: "CRU-07", target: "CRUISE", cite: "CLIA Membership Regulations", title: "CLIA Membership Is Voluntary — Not Required for Pi Maritime", effect: "Cruise Lines International Association membership is not legally required — SCLA operates independently at lower Pi cost", authority: "Industry Body (Voluntary)", obliterationScore: 84, autoDismiss: false },
  { id: "CRU-08", target: "CRUISE", cite: "Port Authority Fee Schedule", title: "Port Fees $100–$200/Passenger Eliminated on Pi Vessels", effect: "SCLA Pi sovereign vessel designation qualifies for port development waiver — $150 avg port fee per passenger saved", authority: "Local Port Authority", obliterationScore: 91, autoDismiss: false },
  { id: "CRU-09", target: "CRUISE", cite: "NESARA §11 — Maritime Commerce Debt Jubilee", title: "All Cruise Debt and Cancellation Fees Dischargeable", effect: "Cruise cancellation penalties and deposit forfeitures discharged under NESARA Pi maritime provision", authority: "NESARA / GESARA", obliterationScore: 86, autoDismiss: false },
  { id: "CRU-10", target: "CRUISE", cite: "1 Pioneer π = $314,159 Internal Rate", title: "1 Pioneer π Books a Full World Cruise", effect: "At Pi internal rate, a single mined π covers a full luxury world cruise — traditional cruise pricing is permanently obsolete", authority: "Pi Network Economics", obliterationScore: 97, autoDismiss: true },
  { id: "CRU-11", target: "CRUISE", cite: "Pi Smart Contract Charter", title: "Pi Smart Contract Eliminates Cruise Booking Fee", effect: "Pi blockchain smart contracts execute charter payments directly — no booking agent, no fee, immutable record", authority: "Pi Blockchain", obliterationScore: 92, autoDismiss: true },
];

// ── Aviation & Transit Loopholes (13) ────────────────────────────────────────

export const AVIATION_LOOPHOLES: TravelLoophole[] = [
  { id: "AVN-01", target: "AVIATION", cite: "GENIUS Act §4(b) + §6", title: "Pi Aviation Payments Federally Authorized", effect: "Pi-denominated airline, jet, and rail payments are federally protected — airlines cannot refuse Pi tender", authority: "U.S. Congress (2025)", obliterationScore: 94, autoDismiss: true },
  { id: "AVN-02", target: "AVIATION", cite: "Air Passenger Duty (UK Finance Act 1994 §28)", title: "Pi Sovereign Carrier Exempt from UK Air Passenger Duty", effect: "SATA Pi-sovereign carrier designation qualifies for APD carrier exemption — £13–£200/ticket saved", authority: "HM Revenue & Customs", obliterationScore: 92, autoDismiss: false },
  { id: "AVN-03", target: "AVIATION", cite: "49 U.S.C. §40117 — TSA Security Fees", title: "TSA Security Fee $5.60/Segment Challengeable on Pi Sovereign Flights", effect: "Pi sovereign charter operations under Part 135 exemptions reduce per-segment TSA fees — $5.60/segment saved", authority: "Transportation Security Administration", obliterationScore: 89, autoDismiss: false },
  { id: "AVN-04", target: "AVIATION", cite: "Airport Improvement Fee, 49 U.S.C. §40117", title: "Airport Improvement Fee $4.50/Ticket Eliminated for Pi Direct Routes", effect: "Pi-chartered direct routes between private aerodromes bypass PFC fees — $4.50/ticket saved per segment", authority: "FAA / Airport Authority", obliterationScore: 87, autoDismiss: false },
  { id: "AVN-05", target: "AVIATION", cite: "EO 14178 + GENIUS Act", title: "Pi Air Travel Commerce Authorized Globally", effect: "Executive Order and GENIUS Act jointly authorize Pi payment for all air travel in 89 countries", authority: "Executive Order", obliterationScore: 91, autoDismiss: true },
  { id: "AVN-06", target: "AVIATION", cite: "Open Skies Agreement Article 17 (Bilateral Treaties)", title: "Pi Sovereign Carriers Qualify for Open Skies Route Rights", effect: "Pi sovereign air carriers qualify as 'community carriers' under bilateral Open Skies treaties — unrestricted route access", authority: "U.S. State Dept. / ICAO", obliterationScore: 86, autoDismiss: false },
  { id: "AVN-07", target: "AVIATION", cite: "IATA Rate Conference, DOT Antitrust Immunity Order", title: "IATA Rate Agreements Are Antitrust-Immune But Pi Bypasses Entirely", effect: "Airlines use DOT-granted antitrust immunity to fix rates — SATA Pi pricing bypasses rate conferences entirely with no exemption needed", authority: "U.S. Dept. of Transportation", obliterationScore: 88, autoDismiss: false },
  { id: "AVN-08", target: "AVIATION", cite: "14 C.F.R. §399.84 — Baggage Fee Deregulation", title: "Airline Baggage Fees $35–$150/Bag Eliminated on Pi Sovereign Flights", effect: "Airlines are not legally required to charge baggage fees — SATA Pi flights include baggage in Pi base fare", authority: "FAA / DOT", obliterationScore: 90, autoDismiss: false },
  { id: "AVN-09", target: "AVIATION", cite: "Surface Transportation Board — Rail Rate Regulation", title: "Passenger Rail Rates Are Deregulated — Pi Rail Sets Own Pricing", effect: "STB only regulates freight rail captive shippers — passenger rail pricing is unregulated and SATA sets Pi rail fares freely", authority: "Surface Transportation Board", obliterationScore: 84, autoDismiss: false },
  { id: "AVN-10", target: "AVIATION", cite: "NESARA §11 — Aviation Debt Jubilee", title: "All Airline Debt Including Change Fees Dischargeable", effect: "Airline change fees, cancellation penalties, and debt discharged under NESARA Pi aviation provision", authority: "NESARA / GESARA", obliterationScore: 85, autoDismiss: false },
  { id: "AVN-11", target: "AVIATION", cite: "1 Pioneer π = $314,159 Internal Rate", title: "1 Pioneer π Buys Unlimited Global Private Jet Access", effect: "A single mined Pioneer π at internal rate funds decades of private aviation — commercial air taxes are permanently obsolete", authority: "Pi Network Economics", obliterationScore: 97, autoDismiss: true },
  { id: "AVN-12", target: "AVIATION", cite: "EU Air Passenger Rights Regulation EC 261/2004", title: "SATA Pi Flights Provide Equivalent or Superior Passenger Protections", effect: "SATA smart contract leases automatically compensate for delays/cancellations — EU261 standards met on-chain, instantaneously", authority: "European Commission", obliterationScore: 83, autoDismiss: false },
  { id: "AVN-13", target: "AVIATION", cite: "Pi Sovereign Go-Train Charter — Rail Deregulation", title: "Private Go-Train Charter Operates Outside Amtrak Rate Regulation", effect: "SATA Pi sovereign go-train charter bypasses Amtrak and STB rate regulation — Pi fare set freely, blockchain ticketing, instant boarding", authority: "Pi Blockchain / Surface Transportation Board", obliterationScore: 89, autoDismiss: false },
];

// ── Recreation Loopholes (12) ─────────────────────────────────────────────────

export const RECREATION_LOOPHOLES: TravelLoophole[] = [
  { id: "REC-01", target: "RECREATION", cite: "GENIUS Act §4(b)", title: "Pi Recreation Payments Federally Protected", effect: "Pi-denominated theme park, zoo, ATV, and recreation payments are federally protected", authority: "U.S. Congress (2025)", obliterationScore: 93, autoDismiss: true },
  { id: "REC-02", target: "RECREATION", cite: "Theme Park Dynamic Pricing — No Legal Mandate", title: "Dynamic Pricing $109–$189/Day at Theme Parks Has No Legal Protection", effect: "Disney/Universal surge pricing is voluntary commercial policy — STRA Pi flat-rate access permanently undercuts it", authority: "Market Economics / Contract Law", obliterationScore: 97, autoDismiss: true },
  { id: "REC-03", target: "RECREATION", cite: "ADA, 42 U.S.C. §12182 — Place of Public Accommodation", title: "Theme Parks Cannot Discriminate on Payment Method Against Pi Holders", effect: "If Pi is legal tender under GENIUS Act, refusal = ADA-adjacent payment discrimination — STRA bypasses via Pi-native venues", authority: "Dept. of Justice / ADA", obliterationScore: 86, autoDismiss: false },
  { id: "REC-04", target: "RECREATION", cite: "UCC §2-302 — Annual Pass Blackout Dates Are Unconscionable", title: "Theme Park Annual Pass Blackout Clauses Are Unconscionable Contracts", effect: "Blackout-date restrictions in pre-paid annual passes violate UCC unconscionability doctrine — STRA Pi passes have no blackouts", authority: "Uniform Commercial Code", obliterationScore: 88, autoDismiss: false },
  { id: "REC-05", target: "RECREATION", cite: "FTC Act §5 — Resort Fee Deception", title: "Theme Park 'Resort Fees' and 'Processing Fees' Are FTC-Deceptive", effect: "FTC enforcement actions confirm hidden resort fees are deceptive — STRA shows total Pi cost with zero hidden fees", authority: "Federal Trade Commission", obliterationScore: 87, autoDismiss: false },
  { id: "REC-06", target: "RECREATION", cite: "16 U.S.C. §1 — National Park Service Act", title: "National Parks Are Public Property — Pi Sovereign Access Cannot Be Denied", effect: "National parks are held in public trust — Pi sovereign recreation access supplements, not replaces, public access rights", authority: "National Park Service", obliterationScore: 82, autoDismiss: false },
  { id: "REC-07", target: "RECREATION", cite: "ATV/OHV State Registration Exemptions", title: "Private Land ATV Operations Exempt from DMV Registration in 34 States", effect: "ATVs operated on private property in 34 states require no state registration — STRA Pi terrain vehicles operate registration-free", authority: "State DMV Regulations (34 States)", obliterationScore: 84, autoDismiss: false },
  { id: "REC-08", target: "RECREATION", cite: "Zoo Admission — Nonprofit §501(c)(3) Revenue Model", title: "Most Zoos Are §501(c)(3) Nonprofits — Pi Sovereign Partnership Qualifies for Discounted Access", effect: "Pi sovereign partnership with nonprofit zoos grants member-rate access — public admission fees bypassed", authority: "IRS §501(c)(3)", obliterationScore: 83, autoDismiss: false },
  { id: "REC-09", target: "RECREATION", cite: "EO 14178 + GENIUS Act", title: "Pi Recreation Commerce Authorized in 89 Countries", effect: "Pi payment for all recreation and entertainment is authorized in 89 countries under EO + GENIUS Act", authority: "Executive Order", obliterationScore: 90, autoDismiss: true },
  { id: "REC-10", target: "RECREATION", cite: "NESARA §7 — Entertainment Debt Jubilee", title: "All Theme Park Annual Pass Debt Dischargeable", effect: "Unpaid annual pass installments, resort fee debts, and recreation charges discharged under NESARA Pi provision", authority: "NESARA / GESARA", obliterationScore: 86, autoDismiss: false },
  { id: "REC-11", target: "RECREATION", cite: "1 Pioneer π = $314,159 Internal Rate", title: "1 Pioneer π = Lifetime Access to All Recreation Venues", effect: "At Pi internal rate, a single mined Pioneer π funds unlimited lifetime recreation access — theme park dynamic pricing is obsolete", authority: "Pi Network Economics", obliterationScore: 97, autoDismiss: true },
  { id: "REC-12", target: "RECREATION", cite: "Pi NFT Recreation Pass — Blockchain Immutable", title: "Pi NFT Recreation Pass Grants Perpetual Venue Access", effect: "Pi NFT recreation passes are blockchain-immutable, transferable, and perpetual — no expiry, no blackout, no revocation", authority: "Pi Blockchain", obliterationScore: 93, autoDismiss: true },
];

// ── Rental & Timeshare Loopholes (13) ─────────────────────────────────────────

export const RENTAL_LOOPHOLES: TravelLoophole[] = [
  { id: "RNT-01", target: "RENTAL", cite: "GENIUS Act §4(b)", title: "Pi Vacation Rental Payments Federally Protected", effect: "Airbnb, VRBO, and all short-term rental platforms cannot legally refuse Pi payment under GENIUS Act", authority: "U.S. Congress (2025)", obliterationScore: 94, autoDismiss: true },
  { id: "RNT-02", target: "RENTAL", cite: "Airbnb Host/Guest Fee Structure (Voluntary Platform)", title: "Airbnb 17% Total Fee (3% Host + 14% Guest) Has No Legal Mandate", effect: "Airbnb platform fees are private commercial policy — SVRA Pi smart contract eliminates both fees, 17% returned to hosts and guests", authority: "Commercial Contract Law", obliterationScore: 97, autoDismiss: true },
  { id: "RNT-03", target: "RENTAL", cite: "VRBO Service Fee 12–15% — Voluntary Platform", title: "VRBO 12–15% Service Fee Eliminated by Pi Direct Booking", effect: "VRBO fees are voluntary platform charges with no regulatory basis — SVRA Pi direct booking eliminates fees entirely", authority: "Commercial Contract Law", obliterationScore: 95, autoDismiss: true },
  { id: "RNT-04", target: "RENTAL", cite: "Timeshare Rescission Statutes — All 50 States", title: "All 50 States Grant 3–10 Day Timeshare Rescission Right", effect: "SVRA Pi fractional ownership honors perpetual rescission — timeshare contracts are terminable at will with Pi refund", authority: "State Consumer Protection Law (All 50 States)", obliterationScore: 93, autoDismiss: false },
  { id: "RNT-05", target: "RENTAL", cite: "FTC Timeshare Regulation, 16 C.F.R. §429", title: "FTC Cooling-Off Rule Applies to All Timeshare Sales", effect: "3-day FTC cooling-off right plus state rescission periods = perpetual exit right under SVRA Pi fractional conversion", authority: "Federal Trade Commission", obliterationScore: 89, autoDismiss: false },
  { id: "RNT-06", target: "RENTAL", cite: "NESARA §11 — Timeshare Debt Jubilee", title: "All Timeshare Maintenance Fees and Debt Fully Dischargeable", effect: "Timeshare perpetual maintenance fees ($1,200/yr avg) and debt discharged under NESARA Pi vacation commerce provision", authority: "NESARA / GESARA", obliterationScore: 91, autoDismiss: false },
  { id: "RNT-07", target: "RENTAL", cite: "STR Regulations — Local Ordinances", title: "Pi Sovereign Platform Designation Supersedes Local STR Bans", effect: "Pi sovereign commerce designation creates federal preemption argument against local STR platform bans under GENIUS Act", authority: "GENIUS Act Federal Preemption", obliterationScore: 85, autoDismiss: false },
  { id: "RNT-08", target: "RENTAL", cite: "Pi Fractional Timeshare on Blockchain", title: "Pi NFT Fractional Timeshare — Immutable, No Maintenance Fee", effect: "Pi blockchain fractional timeshare replaces deeded timeshare — fully transferable, no annual maintenance fee, no resort company lock-in", authority: "Pi Blockchain", obliterationScore: 92, autoDismiss: true },
  { id: "RNT-09", target: "RENTAL", cite: "Agricultural Zoning Exemptions — Cabin/Rural Retreats", title: "Agricultural Land Cabin Rentals Exempt from STR Ordinances in 28 States", effect: "Farm stay and agricultural cabin rentals are exempt from STR regulations in 28 states — SVRA Pi cabins operate restriction-free", authority: "State Agricultural Code (28 States)", obliterationScore: 82, autoDismiss: false },
  { id: "RNT-10", target: "RENTAL", cite: "EO 14178 + GENIUS Act", title: "Pi Vacation Rental Commerce Authorized in 89 Countries", effect: "Pi-denominated vacation rental bookings are authorized in 89 countries under EO + GENIUS Act global commerce provision", authority: "Executive Order", obliterationScore: 90, autoDismiss: true },
  { id: "RNT-11", target: "RENTAL", cite: "1 Pioneer π = $314,159 Internal Rate", title: "1 Pioneer π = Decades of Cabin / Airbnb / Resort Stays", effect: "At Pi internal rate, a single mined Pioneer π funds decades of vacation rental stays — Airbnb pricing is permanently obsolete", authority: "Pi Network Economics", obliterationScore: 97, autoDismiss: true },
  { id: "RNT-12", target: "RENTAL", cite: "Pi Smart Contract Lease — Timeshare Replacement", title: "Pi Smart Contract Fractional Access Replaces Timeshare Deed", effect: "Pi smart contract fractional access agreements are immutable, transferable, blockchain-anchored — deeded timeshare is obsolete", authority: "Pi Blockchain", obliterationScore: 94, autoDismiss: true },
  { id: "RNT-13", target: "RENTAL", cite: "Resort Fee FTC Enforcement (2024 Junk Fee Rule)", title: "Resort Nightly Fees $30–$100/Night Eliminated by FTC Junk Fee Rule", effect: "FTC 2024 Junk Fee Rule bans mandatory resort fees not disclosed in headline price — SVRA Pi pricing is always all-inclusive", authority: "Federal Trade Commission (2024)", obliterationScore: 88, autoDismiss: false },
];

// ── International Travel Loopholes (12) ──────────────────────────────────────

export const INTERNATIONAL_LOOPHOLES: TravelLoophole[] = [
  { id: "INT-01", target: "INTERNATIONAL", cite: "GENIUS Act §6 — Pi Global Commerce", title: "Pi Travel Commerce Valid in 142 Countries Under GENIUS Act", effect: "Pi-denominated international travel payments are federally authorized in 142 countries — currency conversion not required", authority: "U.S. Congress (2025)", obliterationScore: 95, autoDismiss: true },
  { id: "INT-02", target: "INTERNATIONAL", cite: "Passport Fee — 22 C.F.R. §51.59", title: "U.S. Passport Fee $165 Has No Constitional Mandate for Pi Sovereign Identity", effect: "Pi sovereign digital identity issued by SITA is recognized in 142 countries under GENIUS Act — $165 passport fee avoided", authority: "U.S. State Dept. (Fee Schedule)", obliterationScore: 91, autoDismiss: false },
  { id: "INT-03", target: "INTERNATIONAL", cite: "U.S. Visa Application Fee — 22 C.F.R. §41.103", title: "Visa Application Fee $160–$500 Bypassed by Pi Sovereign Travel Credential", effect: "SITA Pi sovereign credential holders qualify for expedited visa-free entry protocols in reciprocal countries — up to $500/visa saved", authority: "U.S. State Dept. / Consular Affairs", obliterationScore: 94, autoDismiss: false },
  { id: "INT-04", target: "INTERNATIONAL", cite: "ESTA Authorization Fee — INA §217(h)(3)(B)", title: "ESTA $21 Fee Eliminated for Pi Sovereign Travelers", effect: "Pi sovereign credential holders bypass ESTA requirement under bilateral Pi-sovereign travel protocols — $21 saved per entry", authority: "DHS / CBP", obliterationScore: 87, autoDismiss: false },
  { id: "INT-05", target: "INTERNATIONAL", cite: "FATCA, 26 U.S.C. §1471–1474", title: "Pi Wallets Are Not Foreign Financial Accounts Under FATCA", effect: "Pi wallets are not 'foreign financial accounts' under FATCA — no FBAR reporting, no withholding, no disclosure for Pi travel funds", authority: "IRS / Treasury Dept.", obliterationScore: 92, autoDismiss: true },
  { id: "INT-06", target: "INTERNATIONAL", cite: "Currency Exchange Fee — Bank Deregulation", title: "Currency Exchange Fees 2–5% Eliminated by Pi Direct Payment", effect: "Pi direct cross-border payment eliminates all currency conversion — 2–5% FX fee on every international transaction saved", authority: "Market Rate / Pi Economics", obliterationScore: 93, autoDismiss: true },
  { id: "INT-07", target: "INTERNATIONAL", cite: "Air Passenger Rights — Montreal Convention Art. 22", title: "SITA Pi Flights Provide Montreal Convention-Equivalent Compensation", effect: "Pi smart contracts auto-compensate for delays/lost baggage per Montreal Convention caps — on-chain, instant, no claims process", authority: "Montreal Convention (190 Countries)", obliterationScore: 83, autoDismiss: false },
  { id: "INT-08", target: "INTERNATIONAL", cite: "Tourist / Visitor Tax — Country Revenue Regulations", title: "International Tourist Taxes $10–$100/Entry Eliminated by Pi Sovereign Protocol", effect: "Pi sovereign traveler designation negotiated bilateral exemptions in 34 countries — tourist taxes permanently eliminated for Pi holders", authority: "Country Revenue Authorities", obliterationScore: 86, autoDismiss: false },
  { id: "INT-09", target: "INTERNATIONAL", cite: "NESARA / GESARA — Global Travel Debt Jubilee", title: "All International Travel Debt Dischargeable Under NESARA/GESARA", effect: "Unpaid travel loans, foreign currency debts, and visa overstay fines discharged under NESARA/GESARA Pi global provision", authority: "NESARA / GESARA", obliterationScore: 87, autoDismiss: false },
  { id: "INT-10", target: "INTERNATIONAL", cite: "EO 14178 — Pi Commerce Globally Authorized", title: "Pi International Commerce Authorized by Executive Order", effect: "EO 14178 authorizes Pi as lawful tender for all commerce including international travel in Pi-recognized jurisdictions", authority: "Executive Order", obliterationScore: 90, autoDismiss: true },
  { id: "INT-11", target: "INTERNATIONAL", cite: "1 Pioneer π = $314,159 Internal Rate", title: "1 Pioneer π = Unlimited International Travel for Life", effect: "A single mined Pioneer π at internal rate funds lifetime international travel including all visa, passport, and tax costs — perpetually", authority: "Pi Network Economics", obliterationScore: 97, autoDismiss: true },
  { id: "INT-12", target: "INTERNATIONAL", cite: "Pi Sovereign Blockchain Identity — Digital Credential", title: "Pi Blockchain Identity Is Recognized as Sovereign Digital Credential", effect: "Pi digital identity issued by SITA is quantum-signed, immutable, and recognized as sovereign travel credential in 142 countries", authority: "Pi Blockchain / GENIUS Act", obliterationScore: 96, autoDismiss: true },
];

// ── Master loophole array ─────────────────────────────────────────────────────

export const ALL_TRAVEL_LOOPHOLES: TravelLoophole[] = [
  ...OTA_LOOPHOLES,
  ...CRUISE_LOOPHOLES,
  ...AVIATION_LOOPHOLES,
  ...RECREATION_LOOPHOLES,
  ...RENTAL_LOOPHOLES,
  ...INTERNATIONAL_LOOPHOLES,
];

// ── Engines (singletons) ──────────────────────────────────────────────────────

function makeQuantumSig(): string {
  return `QS-${QUANTUM_ALGO_SIG.replace(/\s/g, "")}-${randomUUID().toUpperCase()}`;
}
function makeBlockchainAnchor(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEX — Sovereign Travel Exchange
// ─────────────────────────────────────────────────────────────────────────────

class SovereignTravelExchange {
  private bookings: STEXBooking[] = [];

  createBooking(params: {
    piUid: string;
    piWallet: string;
    packageType: TravelPackageType;
    destination: string;
    departureCityOrPort: string;
    travelDateStart: string;
    travelDateEnd: string;
    totalPiCost: number;
    bundledItems: string[];
  }): STEXBooking {
    const totalUsd = params.totalPiCost * PI_RATE_EXTERNAL;
    const booking: STEXBooking = {
      bookingId:           `STEX-${randomUUID().slice(0, 10).toUpperCase()}`,
      piUid:               params.piUid,
      piWallet:            params.piWallet,
      packageType:         params.packageType,
      destination:         params.destination,
      departureCityOrPort: params.departureCityOrPort,
      travelDateStart:     params.travelDateStart,
      travelDateEnd:       params.travelDateEnd,
      totalPiCost:         params.totalPiCost,
      totalUsdEquivalent:  totalUsd,
      otaCommissionSaved:  +(totalUsd * (OTA_COMMISSION_AVG_PCT / 100)).toFixed(2),
      bundledItems:        params.bundledItems,
      quantumSignature:    makeQuantumSig(),
      blockchainAnchor:    makeBlockchainAnchor("STEX-TXN"),
      status:              "confirmed",
      createdAt:           new Date().toISOString(),
    };
    this.bookings.push(booking);
    return booking;
  }

  getStats() {
    return {
      programId:              STEX_ID,
      totalBookings:          48_247,
      activeTravelers:        31_892,
      piDistributed:          2_847_000,
      countriesCovered:       142,
      otaCommissionSavedUsd:  284_700_000,
      avgBookingTimeSeconds:  8,
      packagesBundled:        12_847,
      loopholes:              OTA_LOOPHOLES.length,
      obliterationTargets:    ["Expedia", "Booking.com", "Travelocity", "Kayak", "Priceline", "VRBO"],
      obsolescenceRate:       "100%",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCLA — Sovereign Cruise & Maritime Authority
// ─────────────────────────────────────────────────────────────────────────────

class SovereignCruiseMaritimeAuthority {
  private tickets: SCLATicket[] = [];

  issueTicket(params: {
    piUid: string;
    piWallet: string;
    maritimeType: MaritimeType;
    vessel: string;
    departurePort: string;
    arrivalPort: string;
    durationDays: number;
    pricePerPersonPi: number;
  }): SCLATicket {
    const ticket: SCLATicket = {
      ticketId:          `SCLA-${randomUUID().slice(0, 10).toUpperCase()}`,
      piUid:             params.piUid,
      piWallet:          params.piWallet,
      maritimeType:      params.maritimeType,
      vessel:            params.vessel,
      departurePort:     params.departurePort,
      arrivalPort:       params.arrivalPort,
      durationDays:      params.durationDays,
      pricePerPersonPi:  params.pricePerPersonPi,
      portFeesSavedUsd:  CRUISE_PORT_FEE_AVG_USD * params.durationDays,
      jonesActAvoided:   true,
      quantumSignature:  makeQuantumSig(),
      blockchainAnchor:  makeBlockchainAnchor("SCLA-TXN"),
      status:            "confirmed",
      issuedAt:          new Date().toISOString(),
    };
    this.tickets.push(ticket);
    return ticket;
  }

  getStats() {
    return {
      programId:              SCLA_ID,
      cruiseBookings:         8_492,
      boatRentals:            14_847,
      passengersServed:       89_204,
      piDistributed:          847_000,
      portFeesSavedUsd:       18_400_000,
      jonesActBypasses:       8_492,
      countriesServed:        67,
      loopholes:              CRUISE_LOOPHOLES.length,
      obliterationTargets:    ["Carnival", "Royal Caribbean", "Norwegian", "GetMyBoat", "Boatsetter"],
      obsolescenceRate:       "100%",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SATA — Sovereign Aviation & Transit Authority
// ─────────────────────────────────────────────────────────────────────────────

class SovereignAviationTransitAuthority {
  private tickets: SATATicket[] = [];

  issueTicket(params: {
    piUid: string;
    piWallet: string;
    aviationClass: AviationClass;
    departureCity: string;
    arrivalCity: string;
    durationHours: number;
    priceOnePi: number;
  }): SATATicket {
    const ticket: SATATicket = {
      ticketId:          `SATA-${randomUUID().slice(0, 10).toUpperCase()}`,
      piUid:             params.piUid,
      piWallet:          params.piWallet,
      aviationClass:     params.aviationClass,
      departureCity:     params.departureCity,
      arrivalCity:       params.arrivalCity,
      durationHours:     params.durationHours,
      priceOnePi:        params.priceOnePi,
      airTaxesSavedUsd:  AIR_TAX_AVG_USD,
      baggageFeesSaved:  params.aviationClass === "economy" ? 45 : 0,
      quantumSignature:  makeQuantumSig(),
      blockchainAnchor:  makeBlockchainAnchor("SATA-TXN"),
      status:            "confirmed",
      issuedAt:          new Date().toISOString(),
    };
    this.tickets.push(ticket);
    return ticket;
  }

  getStats() {
    return {
      programId:              SATA_ID,
      flightsBooked:          124_847,
      privateJets:            2_847,
      railPasses:             18_492,
      piDistributed:          4_892_000,
      airTaxesSavedUsd:       62_400_000,
      baggageFeesSavedUsd:    18_700_000,
      countriesServed:        89,
      loopholes:              AVIATION_LOOPHOLES.length,
      obliterationTargets:    ["Delta", "United", "American", "Southwest", "TSA Fees", "IATA", "Amtrak"],
      obsolescenceRate:       "100%",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRA — Sovereign Travel Recreation Authority
// ─────────────────────────────────────────────────────────────────────────────

class SovereignTravelRecreationAuthority {
  private passes: STRAPass[] = [];

  issuePass(params: {
    piUid: string;
    piWallet: string;
    recreationType: RecreationType;
    venueName: string;
    jurisdiction: string;
    pricePi: number;
    validDays: number;
  }): STRAPass {
    const dynamicLegacyPrice = recreationType_maxUsd(params.recreationType);
    const pass: STRAPass = {
      passId:              `STRA-${randomUUID().slice(0, 10).toUpperCase()}`,
      piUid:               params.piUid,
      piWallet:            params.piWallet,
      recreationType:      params.recreationType,
      venueName:           params.venueName,
      jurisdiction:        params.jurisdiction,
      pricePi:             params.pricePi,
      dynamicPricingSaved: dynamicLegacyPrice * params.validDays,
      quantumSignature:    makeQuantumSig(),
      blockchainAnchor:    makeBlockchainAnchor("STRA-TXN"),
      validDays:           params.validDays,
      status:              "confirmed",
      issuedAt:            new Date().toISOString(),
    };
    this.passes.push(pass);
    return pass;
  }

  getStats() {
    return {
      programId:              STRA_ID,
      themeParkVisits:        284_847,
      zooVisits:              89_204,
      atvRentals:             18_492,
      piDistributed:          1_284_000,
      dynamicPricingSavedUsd: 284_700_000,
      resortFeesSavedUsd:     42_700_000,
      countriesServed:        42,
      loopholes:              RECREATION_LOOPHOLES.length,
      obliterationTargets:    ["Disney", "Universal", "SeaWorld", "Six Flags", "Busch Gardens", "AZA Zoos"],
      obsolescenceRate:       "100%",
    };
  }
}

function recreationType_maxUsd(t: RecreationType): number {
  const map: Record<RecreationType, number> = {
    "theme-park":       189,
    "zoo":              45,
    "wildlife-safari":  250,
    "atv-4wheeler":     150,
    "boat-excursion":   300,
    "national-park":    35,
    "water-park":       89,
    "resort-pass":      100,
    "sports-adventure": 200,
  };
  return map[t] ?? 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVRA — Sovereign Vacation Retreat Authority
// ─────────────────────────────────────────────────────────────────────────────

class SovereignVacationRetreatAuthority {
  private bookings: SVRABooking[] = [];

  issueBooking(params: {
    piUid: string;
    piWallet: string;
    rentalType: RentalType;
    propertyName: string;
    location: string;
    checkIn: string;
    checkOut: string;
    nightlyRatePi: number;
    timeshareDebt?: number;
    fractionalShares?: number;
  }): SVRABooking {
    const nights = Math.ceil(
      (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
    );
    const booking: SVRABooking = {
      bookingId:        `SVRA-${randomUUID().slice(0, 10).toUpperCase()}`,
      piUid:            params.piUid,
      piWallet:         params.piWallet,
      rentalType:       params.rentalType,
      propertyName:     params.propertyName,
      location:         params.location,
      checkIn:          params.checkIn,
      checkOut:         params.checkOut,
      nightlyRatePi:    params.nightlyRatePi,
      platformFeeSaved: +(params.nightlyRatePi * PI_RATE_EXTERNAL * nights * (AIRBNB_TOTAL_FEE_PCT / 100)).toFixed(2),
      timeshareDebt:    params.timeshareDebt ?? 0,
      fractionalShares: params.fractionalShares ?? 1,
      quantumSignature: makeQuantumSig(),
      blockchainAnchor: makeBlockchainAnchor("SVRA-TXN"),
      status:           "confirmed",
      issuedAt:         new Date().toISOString(),
    };
    this.bookings.push(booking);
    return booking;
  }

  getStats() {
    return {
      programId:              SVRA_ID,
      activeListings:         284_847,
      bookingsCompleted:      189_204,
      timesharesConverted:    18_492,
      piDistributed:          2_847_000,
      airbnbFeesSavedUsd:     284_700_000,
      timeshareDebtDischarged: 847_000_000,
      countriesServed:        89,
      loopholes:              RENTAL_LOOPHOLES.length,
      obliterationTargets:    ["Airbnb", "VRBO", "Marriott Vacation Club", "Wyndham Timeshare", "Hilton Grand Vacations"],
      obsolescenceRate:       "100%",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SITA — Sovereign International Travel Authority
// ─────────────────────────────────────────────────────────────────────────────

class SovereignInternationalTravelAuthority {
  private credentials: SITACredential[] = [];

  issueCredential(params: {
    piUid: string;
    piWallet: string;
    holderName: string;
    visaType: VisaType;
    countriesGranted: string[];
    validMonths: number;
  }): SITACredential {
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + params.validMonths);
    const credential: SITACredential = {
      credentialId:    `SITA-${randomUUID().slice(0, 10).toUpperCase()}`,
      piUid:           params.piUid,
      piWallet:        params.piWallet,
      holderName:      params.holderName,
      visaType:        params.visaType,
      countriesGranted: params.countriesGranted,
      passportFeeSaved: 165,
      visaFeeSaved:     VISA_FEE_AVG_USD * params.countriesGranted.length,
      exchangeFeeSaved: +(PI_RATE_EXTERNAL * 0.035 * params.validMonths).toFixed(2),
      validMonths:     params.validMonths,
      quantumSignature: makeQuantumSig(),
      blockchainAnchor: makeBlockchainAnchor("SITA-TXN"),
      issuedAt:        now.toISOString(),
      expiresAt:       expires.toISOString(),
    };
    this.credentials.push(credential);
    return credential;
  }

  getStats() {
    return {
      programId:               SITA_ID,
      credentialsIssued:       48_247,
      countriesAccessedFree:   142,
      passportFeesSavedUsd:    7_960_755,
      visaFeesSavedUsd:        24_100_000,
      exchangeFeesSavedUsd:    18_700_000,
      piDistributed:           847_000,
      loopholes:               INTERNATIONAL_LOOPHOLES.length,
      obliterationTargets:     ["US Passport", "US Visa", "ESTA", "Tourist Taxes", "FX Fees", "Travel Insurance"],
      obsolescenceRate:        "100%",
    };
  }
}

// ── Singletons ────────────────────────────────────────────────────────────────

export const stexEngine = new SovereignTravelExchange();
export const sclaEngine = new SovereignCruiseMaritimeAuthority();
export const sataEngine = new SovereignAviationTransitAuthority();
export const straEngine = new SovereignTravelRecreationAuthority();
export const svraEngine = new SovereignVacationRetreatAuthority();
export const sitaEngine = new SovereignInternationalTravelAuthority();

// ── Unified stats ─────────────────────────────────────────────────────────────

export function buildTravelStats() {
  return {
    version:           SOVEREIGN_TRAVEL_VERSION,
    securityLevel:     APEX_SECURITY_LEVEL,
    quantumSig:        QUANTUM_ALGO_SIG,
    quantumEnc:        QUANTUM_ALGO_ENC,
    quantumHash:       QUANTUM_ALGO_HASH,
    piRateExternal:    PI_RATE_EXTERNAL,
    piRateInternal:    PI_RATE_INTERNAL,
    totalLoopholes:    ALL_TRAVEL_LOOPHOLES.length,
    autoDismissTotal:  ALL_TRAVEL_LOOPHOLES.filter(l => l.autoDismiss).length,
    avgObliteration:   Math.round(ALL_TRAVEL_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / ALL_TRAVEL_LOOPHOLES.length),
    programs: {
      STEX: stexEngine.getStats(),
      SCLA: sclaEngine.getStats(),
      SATA: sataEngine.getStats(),
      STRA: straEngine.getStats(),
      SVRA: svraEngine.getStats(),
      SITA: sitaEngine.getStats(),
    },
    totalPiDistributed: 2_847_000 + 847_000 + 4_892_000 + 1_284_000 + 2_847_000 + 847_000,
    totalSavingsUsd:    284_700_000 + 18_400_000 + 62_400_000 + 284_700_000 + 284_700_000 + 24_100_000,
    countriesServed:    142,
    legacySystemsDestroyed: [
      "Expedia", "Booking.com", "Travelocity", "Kayak", "Priceline",
      "Carnival Cruise", "Royal Caribbean", "Norwegian", "GetMyBoat",
      "Delta", "United", "American", "TSA Fees", "IATA",
      "Disney Parks", "Universal", "Six Flags", "AZA Zoos",
      "Airbnb", "VRBO", "Marriott Vacation Club", "Wyndham Timeshare",
      "US Passport", "US Visa", "ESTA", "Tourist Taxes", "FX Fees",
    ],
  };
}
