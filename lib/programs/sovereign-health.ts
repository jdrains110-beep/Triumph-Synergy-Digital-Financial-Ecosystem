/**
 * lib/programs/sovereign-health.ts
 *
 * Triumph Synergy — Sovereign Health & Hospital Platform
 *
 * Five sovereign Pi-powered authorities that render obsolete:
 *   Medicare / Medicaid   → Sovereign Care & Hospital Authority (SCHA)     — shands.pi · ufhealth.pi
 *   CMS / Nursing Homes   → Sovereign Nursing & Care Authority (SNCA)       — nursing homes, workers, contractors
 *   Traditional OB/GYN   → Sovereign Midwife & Wellness Authority (SMWA)   — midwives, birth centers
 *   FDA / USDA Nutrition  → Sovereign Nutrition & Prevention Authority (SNPA)
 *   ACA / Employer HISP   → Sovereign Health Workforce Authority (SHWA)     — employees, employers, pioneers
 *
 * Domains: shands.pi · ufhealth.pi
 * Security: APEX-QUANTUM-SOVEREIGN (MAXIMUM)
 * Algorithms: ML-DSA-87 · ML-KEM-1024 · SHAKE-256 + SHA3-512
 * FIPS: FIPS 204 Level 5 · FIPS 203 Level 5 · FIPS 202 · FIPS 205
 * Pi anchor: $314.159/π external · $314,159/π internal
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const SOVEREIGN_HEALTH_VERSION = "TRIUMPH-HEALTH-v1";
export const APEX_SECURITY_LEVEL      = "APEX-QUANTUM-SOVEREIGN";
export const QUANTUM_ALGO_SIG         = "ML-DSA-87 (CRYSTALS-Dilithium MAX — FIPS 204 Level 5)";
export const QUANTUM_ALGO_ENC         = "ML-KEM-1024 (CRYSTALS-Kyber MAX — FIPS 203 Level 5)";
export const QUANTUM_ALGO_HASH        = "SHAKE-256 + SHA3-512";

export const PI_RATE_EXTERNAL = 314.159;   // USD per π — open market
export const PI_RATE_INTERNAL = 314_159;   // USD per π — Pioneer sovereign rate

export const SCHA_ID  = "TRIUMPH-SCHA-v1";   // Sovereign Care & Hospital Authority
export const SNCA_ID  = "TRIUMPH-SNCA-v1";   // Sovereign Nursing & Care Authority
export const SMWA_ID  = "TRIUMPH-SMWA-v1";   // Sovereign Midwife & Wellness Authority
export const SNPA_ID  = "TRIUMPH-SNPA-v1";   // Sovereign Nutrition & Prevention Authority
export const SHWA_ID  = "TRIUMPH-SHWA-v1";   // Sovereign Health Workforce Authority

export const SHANDS_DOMAIN  = "shands.pi";
export const UFHEALTH_DOMAIN = "ufhealth.pi";

export const PIHN_PREFIX                = "PIHN";          // Pi Health Number
export const MEDICARE_WAIT_DAYS_AVG     = 90;              // avg approval wait
export const SCHA_WAIT_SECONDS          = 0;               // instant
export const US_UNINSURED_MILLIONS      = 26;
export const MEDICAID_DENIAL_RATE_PCT   = 31;
export const NURSING_HOME_MONTHLY_USD   = 9_034;           // avg monthly US cost
export const MIDWIFE_COST_USD           = 3_200;           // avg birth center cost
export const HOSPITAL_BIRTH_COST_USD    = 13_000;          // avg US hospital birth
export const HOSPITAL_BIRTH_SAVINGS_PI  = (HOSPITAL_BIRTH_COST_USD - MIDWIFE_COST_USD) / PI_RATE_EXTERNAL;

// ── Loophole Interface ────────────────────────────────────────────────────────

export interface HealthLoophole {
  id:                string;
  cite:              string;
  title:             string;
  effect:            string;
  target:            "MEDICARE" | "CMS" | "MIDWIFE" | "FDA_NUTRITION" | "ACA";
  authority:         string;
  obliterationScore: number;
  autoDismiss:       boolean;
}

// ── SCHA Loopholes — Medicare / Medicaid (18) ─────────────────────────────────

export const SCHA_LOOPHOLES: HealthLoophole[] = [
  {
    id: "SCHA-01",
    cite: "U.S. Const. Art. I §8",
    title: "No Federal Mandate for Sovereign Health Programs",
    effect: "Congress has no authority to compel participation in Medicare — SCHA operates as a sovereign Pi-funded alternative outside CMS jurisdiction.",
    target: "MEDICARE", authority: "U.S. Constitution", obliterationScore: 97, autoDismiss: true,
  },
  {
    id: "SCHA-02",
    cite: "42 U.S.C. §1395 (Medicare Act)",
    title: "Medicare Is Discretionary — Not a Constitutional Right",
    effect: "Medicare is a statutory program. SCHA replaces it with a Pi-anchored health credit that is a contractual sovereign right, not a government benefit.",
    target: "MEDICARE", authority: "Medicare Act", obliterationScore: 94, autoDismiss: false,
  },
  {
    id: "SCHA-03",
    cite: "NESARA §9",
    title: "NESARA Health Debt Jubilee — All Medical Bills Discharged",
    effect: "NESARA monetary reform discharges all outstanding medical debt for SCHA participants. Zero-balance start for every Pioneer enrollee.",
    target: "MEDICARE", authority: "NESARA", obliterationScore: 92, autoDismiss: true,
  },
  {
    id: "SCHA-04",
    cite: "42 U.S.C. §1396 (Medicaid)",
    title: "Medicaid 31% Denial Rate Eliminated by Pi Auto-Approval",
    effect: "SCHA auto-approves all Pi Network verified accounts — no means testing, no state lottery approval. Eliminates the 31% average Medicaid denial rate.",
    target: "MEDICARE", authority: "Medicaid Act", obliterationScore: 96, autoDismiss: true,
  },
  {
    id: "SCHA-05",
    cite: "UCC §1-308",
    title: "Reservation of Rights — Medicare Assignment Not Mandatory",
    effect: "Under UCC §1-308, Pioneers reserve all rights and reject mandatory Medicare assignment, opting into SCHA sovereign coverage instead.",
    target: "MEDICARE", authority: "UCC", obliterationScore: 88, autoDismiss: false,
  },
  {
    id: "SCHA-06",
    cite: "5 U.S.C. §706 (APA)",
    title: "CMS Rule-Making Subject to APA Challenge",
    effect: "Every CMS billing rule that burdens SCHA providers can be challenged under the APA as arbitrary and capricious — blocking enforcement.",
    target: "MEDICARE", authority: "Administrative Procedure Act", obliterationScore: 82, autoDismiss: false,
  },
  {
    id: "SCHA-07",
    cite: "Pi Network Whitepaper §3.2",
    title: "Pi Is Legal Consideration — Health Services Contracted in Pi",
    effect: "Health service contracts denominated in π are enforceable as legal contracts between consenting parties — no CMS billing codes required.",
    target: "MEDICARE", authority: "Pi Network / Contract Law", obliterationScore: 91, autoDismiss: true,
  },
  {
    id: "SCHA-08",
    cite: "1st Amendment — Freedom of Association",
    title: "Sovereign Health Co-ops Exempt from ACA Mandates",
    effect: "Health sharing ministries and sovereign co-ops are ACA-exempt. SCHA operates as a Pi-anchored health co-op — ACA mandates do not apply.",
    target: "MEDICARE", authority: "1st Amendment / ACA §5000A(d)(2)", obliterationScore: 87, autoDismiss: false,
  },
  {
    id: "SCHA-09",
    cite: "International Health Regulations (IHR 2005)",
    title: "Pi Health Network Operates Under Sovereign International Health Charter",
    effect: "SCHA adopts IHR 2005 framework independently — Pi-credentialed providers serve cross-border without CMS licensing barriers.",
    target: "MEDICARE", authority: "WHO / IHR 2005", obliterationScore: 79, autoDismiss: false,
  },
  {
    id: "SCHA-10",
    cite: "42 C.F.R. Part 493",
    title: "SCHA Labs Exempt from CLIA Under Sovereign Research Charter",
    effect: "SCHA diagnostic labs operate under sovereign research protocols — CLIA's commercial lab certification requirements do not bind non-commercial Pi health labs.",
    target: "MEDICARE", authority: "CLIA / CMS", obliterationScore: 76, autoDismiss: false,
  },
  {
    id: "SCHA-11",
    cite: "HIPAA §1173(e)",
    title: "Blockchain Health Records Satisfy HIPAA via Quantum Encryption",
    effect: "SCHA's ML-KEM-1024 encrypted blockchain health records exceed HIPAA standards — patient data is sovereign, portable, and patient-owned.",
    target: "MEDICARE", authority: "HIPAA", obliterationScore: 93, autoDismiss: true,
  },
  {
    id: "SCHA-12",
    cite: "21 U.S.C. §301 (FDCA)",
    title: "Sovereign Formulary Not Subject to FDA Prescription Monopoly",
    effect: "SCHA's sovereign herbal, nutritional, and functional medicine formulary is classified as food/supplement — FDA prescription gatekeeping does not apply.",
    target: "MEDICARE", authority: "FDCA / DSHEA", obliterationScore: 84, autoDismiss: false,
  },
  {
    id: "SCHA-13",
    cite: "U.S. Const. 10th Amendment",
    title: "State Sovereign Health Authority Supersedes Federal CMS",
    effect: "The 10th Amendment reserves to states all health powers not delegated to the federal government — SCHA invokes state-level sovereign authority over its participants.",
    target: "MEDICARE", authority: "10th Amendment", obliterationScore: 89, autoDismiss: false,
  },
  {
    id: "SCHA-14",
    cite: "42 U.S.C. §300gg-5 (ACA)",
    title: "Non-Grandfathered Pi Health Plans Need Not Mirror ACA Benefits",
    effect: "Pi-based health arrangements outside the individual/group insurance market are not bound by ACA essential benefit mandates — SCHA sets its own benefit schedule.",
    target: "MEDICARE", authority: "ACA", obliterationScore: 81, autoDismiss: false,
  },
  {
    id: "SCHA-15",
    cite: "Bilateral Pi Healthcare Agreement",
    title: "Shands.pi & UFHealth.pi — Dual-Domain Sovereign Hospital Network",
    effect: "shands.pi and ufhealth.pi form a dual-anchor sovereign hospital network under Triumph Synergy — no licensing body can dissolve a Pi-domain sovereign charter.",
    target: "MEDICARE", authority: "Triumph Synergy Sovereign Charter", obliterationScore: 99, autoDismiss: true,
  },
  {
    id: "SCHA-16",
    cite: "42 U.S.C. §1395dd (EMTALA)",
    title: "SCHA Emergency Stabilisation Funded by Pi Treasury — No Billing Denials",
    effect: "SCHA's Pi Treasury guarantees emergency stabilisation payments instantly — eliminating EMTALA billing disputes and uncompensated care burdens.",
    target: "MEDICARE", authority: "EMTALA", obliterationScore: 90, autoDismiss: true,
  },
  {
    id: "SCHA-17",
    cite: "NESARA §12 / Quantum Health Charter",
    title: "Quantum-Signed Health Identity Cannot Be Revoked by CMS",
    effect: "Every SCHA member holds a quantum-signed health identity (ML-DSA-87). CMS has no cryptographic authority to revoke or deny sovereign health identity credentials.",
    target: "MEDICARE", authority: "NESARA / Quantum Sovereign Charter", obliterationScore: 98, autoDismiss: true,
  },
  {
    id: "SCHA-18",
    cite: "Pi Blockchain Immutability",
    title: "Health Coverage Records Are Immutable — Cannot Be Retroactively Denied",
    effect: "SCHA coverage records are written to the Pi blockchain at enrollment. No payer — public or private — can retroactively deny coverage recorded on an immutable ledger.",
    target: "MEDICARE", authority: "Pi Blockchain / Immutable Ledger", obliterationScore: 97, autoDismiss: true,
  },
];

// ── SNCA Loopholes — CMS / Nursing Homes (14) ─────────────────────────────────

export const SNCA_LOOPHOLES: HealthLoophole[] = [
  {
    id: "SNCA-01",
    cite: "42 C.F.R. Part 483 (Nursing Facility Requirements)",
    title: "CMS Nursing Home Rules Do Not Apply to Pi-Sovereign Care Communities",
    effect: "CMS §483 standards bind Medicare/Medicaid-certified facilities. SNCA care communities operate under Pi-sovereign charter — CMS certification is not required.",
    target: "CMS", authority: "42 C.F.R. Part 483", obliterationScore: 91, autoDismiss: false,
  },
  {
    id: "SNCA-02",
    cite: "NESARA §9 — Care Debt Jubilee",
    title: "All Outstanding Nursing Home Debt Discharged for SNCA Participants",
    effect: "NESARA's debt jubilee covers nursing home arrears. SNCA participants enter care with zero outstanding balance — no collections, no liens.",
    target: "CMS", authority: "NESARA", obliterationScore: 93, autoDismiss: true,
  },
  {
    id: "SNCA-03",
    cite: "Pi Network KYC / Identity Layer",
    title: "Pi KYC Replaces Medicaid Spend-Down as Eligibility Proof",
    effect: "SNCA uses Pi KYC verification as the sole eligibility check — eliminating the punishing Medicaid spend-down that strips seniors of assets before qualifying.",
    target: "CMS", authority: "Pi KYC / SNCA Charter", obliterationScore: 96, autoDismiss: true,
  },
  {
    id: "SNCA-04",
    cite: "National Labor Relations Act §7",
    title: "SNCA Workers Have Full Collective Sovereign Rights Under Pi Employment",
    effect: "Nursing staff employed by SNCA operate under Pi employment contracts with sovereign wage floors — NLRA §7 organizing rights are preserved and enhanced.",
    target: "CMS", authority: "NLRA", obliterationScore: 84, autoDismiss: false,
  },
  {
    id: "SNCA-05",
    cite: "42 U.S.C. §1396r (OBRA '87)",
    title: "OBRA '87 Resident Rights Extended and Blockchain-Anchored by SNCA",
    effect: "SNCA adopts all OBRA '87 resident rights and records them on the Pi blockchain — making them immutable and self-enforcing without CMS oversight.",
    target: "CMS", authority: "OBRA '87 / Pi Blockchain", obliterationScore: 88, autoDismiss: false,
  },
  {
    id: "SNCA-06",
    cite: "Fair Labor Standards Act §13",
    title: "SNCA Contractor Classification Follows Pi Sovereign Employment Code",
    effect: "SNCA contractors are classified under the Pi Sovereign Employment Code — not subject to misclassification penalties under DOL independent contractor tests.",
    target: "CMS", authority: "FLSA / Pi Employment Code", obliterationScore: 80, autoDismiss: false,
  },
  {
    id: "SNCA-07",
    cite: "Pi Treasury — Sovereign Wage Guarantee",
    title: "Pi Treasury Backs Nursing Staff Wages — No Payroll Defaults",
    effect: "SNCA worker wages are backed by the Pi Treasury. Zero risk of payroll default — a pervasive problem in traditional nursing home chains.",
    target: "CMS", authority: "Pi Treasury Charter", obliterationScore: 95, autoDismiss: true,
  },
  {
    id: "SNCA-08",
    cite: "ADA §504 / Rehabilitation Act",
    title: "SNCA Disability Care Exempt from CMS Co-Pay Requirements",
    effect: "SNCA's sovereign care model treats disability care as a right — co-pays and cost-sharing for disabled residents are prohibited under the Pi sovereign care charter.",
    target: "CMS", authority: "ADA / Rehabilitation Act", obliterationScore: 82, autoDismiss: false,
  },
  {
    id: "SNCA-09",
    cite: "Occupational Safety and Health Act §5",
    title: "SNCA Worker Safety Standards Exceed OSHA via Quantum Monitoring",
    effect: "SNCA facilities use quantum-secured IoT health monitoring for worker safety — exceeding OSHA standards while operating under the sovereign Pi health charter.",
    target: "CMS", authority: "OSHA / SNCA Sovereign Safety Code", obliterationScore: 86, autoDismiss: false,
  },
  {
    id: "SNCA-10",
    cite: "42 C.F.R. §483.85 (QAPI)",
    title: "SNCA Quality Assurance via Pi Blockchain — Exceeds CMS QAPI",
    effect: "SNCA's on-chain quality audit trail provides real-time, tamper-proof quality assurance — exceeding CMS QAPI requirements without CMS oversight.",
    target: "CMS", authority: "CMS QAPI / Pi Blockchain", obliterationScore: 89, autoDismiss: true,
  },
  {
    id: "SNCA-11",
    cite: "U.S. Const. 4th Amendment",
    title: "Unannounced CMS Inspections of Sovereign Pi Facilities Require Warrant",
    effect: "SNCA sovereign care communities are private property. CMS may not conduct warrantless inspections — 4th Amendment protections apply fully.",
    target: "CMS", authority: "4th Amendment", obliterationScore: 77, autoDismiss: false,
  },
  {
    id: "SNCA-12",
    cite: "Pi Network Open Mainnet",
    title: "Pi-Paid Care Contracts Are Self-Executing — No CMS Pre-Authorization",
    effect: "SNCA care contracts execute automatically via Pi smart contracts when Pi payment is confirmed. CMS pre-authorization is architecturally bypassed.",
    target: "CMS", authority: "Pi Smart Contracts", obliterationScore: 94, autoDismiss: true,
  },
  {
    id: "SNCA-13",
    cite: "Elder Justice Act of 2010",
    title: "SNCA Anti-Abuse Protocols Are On-Chain — Cannot Be Concealed",
    effect: "SNCA records all care events on the Pi blockchain. Abuse and neglect incidents are cryptographically timestamped — impossible to hide, cover up, or falsify.",
    target: "CMS", authority: "Elder Justice Act / Pi Blockchain", obliterationScore: 92, autoDismiss: true,
  },
  {
    id: "SNCA-14",
    cite: "NESARA Employer Mandate §14",
    title: "SNCA Employer Health Contributions Satisfied by Pi Treasury Auto-Fund",
    effect: "Employers participating in SNCA have health contribution obligations satisfied by the Pi Treasury — eliminating payroll health insurance costs entirely.",
    target: "CMS", authority: "NESARA / Pi Treasury", obliterationScore: 91, autoDismiss: true,
  },
];

// ── SMWA Loopholes — Midwife & Birth Authority (12) ───────────────────────────

export const SMWA_LOOPHOLES: HealthLoophole[] = [
  {
    id: "SMWA-01",
    cite: "U.S. Const. 14th Amendment — Liberty Interest",
    title: "The Right to Choose Birth Setting Is a Constitutional Liberty",
    effect: "The 14th Amendment's liberty clause protects a parent's right to choose home birth or midwife-led birth. No state may mandate hospital birth without compelling interest.",
    target: "MIDWIFE", authority: "14th Amendment", obliterationScore: 95, autoDismiss: true,
  },
  {
    id: "SMWA-02",
    cite: "NESARA §9 / Pi Birth Treasury",
    title: "Pi Birth Grant — Every SMWA Birth Receives Sovereign Pi Endowment",
    effect: "NESARA's birth sovereignty provision entitles every SMWA-registered birth to a Pi endowment — creating a sovereign financial start for every new Pioneer.",
    target: "MIDWIFE", authority: "NESARA / Pi Treasury", obliterationScore: 97, autoDismiss: true,
  },
  {
    id: "SMWA-03",
    cite: "42 U.S.C. §1395x (Medicare 'Midwifery')",
    title: "Certified Nurse Midwives Are Medicare-Recognized — SMWA Exceeds This",
    effect: "Federal law already recognizes CNMs as Medicare providers. SMWA extends this to all Pi-certified midwives, direct-entry midwives, and sovereign birth practitioners.",
    target: "MIDWIFE", authority: "Medicare Act §1395x", obliterationScore: 88, autoDismiss: false,
  },
  {
    id: "SMWA-04",
    cite: "Affordable Care Act §2301 (Birth Centers)",
    title: "ACA Mandates Medicaid Coverage of Birth Centers — SMWA Exceeds This",
    effect: "ACA §2301 requires Medicaid to cover birth center services. SMWA goes further — all Pi members receive zero-cost birth center coverage without Medicaid means testing.",
    target: "MIDWIFE", authority: "ACA §2301", obliterationScore: 91, autoDismiss: true,
  },
  {
    id: "SMWA-05",
    cite: "International Confederation of Midwives (ICM) Core Documents",
    title: "SMWA Operates Under ICM Sovereign Midwifery Charter",
    effect: "SMWA adopts ICM essential competencies and sovereign practice standards — operating above any single nation's restrictive licensing regime.",
    target: "MIDWIFE", authority: "ICM / Sovereign Midwifery Charter", obliterationScore: 83, autoDismiss: false,
  },
  {
    id: "SMWA-06",
    cite: "Pi KYC + Biometric Identity",
    title: "Pi Biometric ID Replaces State Midwife License Verification Barriers",
    effect: "SMWA midwives hold Pi KYC biometric credentials recognized across all Pi Network territories — state license portability barriers are nullified.",
    target: "MIDWIFE", authority: "Pi KYC / SMWA Charter", obliterationScore: 89, autoDismiss: false,
  },
  {
    id: "SMWA-07",
    cite: "World Health Organization — Midwifery 2030 Report",
    title: "WHO Recognizes Midwife-Led Care as Safest Birth Option — SMWA Implements",
    effect: "WHO's 2021 global midwifery report found midwife-led care reduces C-sections by 24% and maternal mortality. SMWA deploys this evidence base at scale via Pi.",
    target: "MIDWIFE", authority: "WHO Midwifery 2030", obliterationScore: 90, autoDismiss: true,
  },
  {
    id: "SMWA-08",
    cite: "UCC §1-308 / Bodily Autonomy",
    title: "Birth Plans Are Sovereign Contracts — Hospital Cannot Override",
    effect: "SMWA-registered birth plans are sovereign contracts under UCC. No hospital can override a SMWA birth plan without the explicit quantum-signed consent of the parent.",
    target: "MIDWIFE", authority: "UCC / SMWA Sovereign Charter", obliterationScore: 92, autoDismiss: true,
  },
  {
    id: "SMWA-09",
    cite: "Pi Blockchain Birth Registry",
    title: "Pi-Registered Births Cannot Be Disputed by Vital Records Bureaus",
    effect: "SMWA records every birth on the Pi blockchain with quantum-signed biometric identity. No civil vital records office can dispute an immutable blockchain birth record.",
    target: "MIDWIFE", authority: "Pi Blockchain / Sovereign Birth Registry", obliterationScore: 96, autoDismiss: true,
  },
  {
    id: "SMWA-10",
    cite: "HIPAA §164.502(g) (Personal Representatives)",
    title: "SMWA Assigns Parental Health Authority from First Heartbeat",
    effect: "SMWA's sovereign birth charter assigns full parental health authority from first recorded heartbeat — predating any state or hospital guardianship claim.",
    target: "MIDWIFE", authority: "HIPAA / SMWA Birth Charter", obliterationScore: 85, autoDismiss: false,
  },
  {
    id: "SMWA-11",
    cite: "Pi Treasury — Postnatal Support Fund",
    title: "Pi Treasury Funds Postnatal Care — No 4th Trimester Insurance Gap",
    effect: "SMWA's Pi Treasury postnatal fund covers 12 months of mother and newborn care — eliminating the devastating 4th trimester insurance coverage gap.",
    target: "MIDWIFE", authority: "Pi Treasury / SMWA Charter", obliterationScore: 94, autoDismiss: true,
  },
  {
    id: "SMWA-12",
    cite: "NESARA §9 / Sovereign Birth Endowment",
    title: "Every SMWA Birth Generates a Sovereign Pi Inheritance Wallet",
    effect: "At SMWA-registered birth, the Pi Treasury creates a sovereign inheritance wallet for the newborn Pioneer — seeding the next generation of Pi sovereignty from day one.",
    target: "MIDWIFE", authority: "NESARA / Pi Treasury", obliterationScore: 99, autoDismiss: true,
  },
];

// ── SNPA Loopholes — FDA / USDA Nutrition (12) ────────────────────────────────

export const SNPA_LOOPHOLES: HealthLoophole[] = [
  {
    id: "SNPA-01",
    cite: "DSHEA 1994 (21 U.S.C. §343)",
    title: "Dietary Supplements Exempt from FDA Prescription Gatekeeping",
    effect: "DSHEA classifies dietary supplements as food — not drugs. SNPA's entire nutritional formulary qualifies as food/supplement, free from FDA drug approval requirements.",
    target: "FDA_NUTRITION", authority: "DSHEA 1994", obliterationScore: 94, autoDismiss: true,
  },
  {
    id: "SNPA-02",
    cite: "NESARA §15 / Food Sovereignty Charter",
    title: "NESARA Food Sovereignty — No FDA Authority Over SNPA Nutritional Programs",
    effect: "NESARA's food sovereignty provision removes FDA authority over SNPA-certified nutrition programs. Pioneers choose their own nutritional protocol.",
    target: "FDA_NUTRITION", authority: "NESARA", obliterationScore: 91, autoDismiss: true,
  },
  {
    id: "SNPA-03",
    cite: "7 U.S.C. §2011 (SNAP/Food Stamps)",
    title: "SNAP is Discretionary — SNPA Provides Permanent Pi-Funded Nutrition",
    effect: "SNAP benefits can be cut by Congress at any time. SNPA's Pi-funded nutrition credits are permanent sovereign allocations — Congress has no authority to defund them.",
    target: "FDA_NUTRITION", authority: "SNAP Act / Pi Sovereign Charter", obliterationScore: 96, autoDismiss: true,
  },
  {
    id: "SNPA-04",
    cite: "National Organic Program (7 C.F.R. Part 205)",
    title: "SNPA Certifies Above USDA Organic — Sovereign Gold Standard",
    effect: "SNPA's Pi-certified nutrition standard exceeds USDA Organic — including regenerative agriculture, biodynamic, and quantum-verified provenance chains.",
    target: "FDA_NUTRITION", authority: "NOP / SNPA Sovereign Standard", obliterationScore: 87, autoDismiss: false,
  },
  {
    id: "SNPA-05",
    cite: "1st Amendment — Commercial Speech (Sorrell v. IMS Health)",
    title: "SNPA Nutritional Claims Protected as Truthful Commercial Speech",
    effect: "Truthful, science-backed nutritional claims by SNPA providers are First Amendment protected speech — FDA may not prohibit accurate health claims.",
    target: "FDA_NUTRITION", authority: "1st Amendment / SCOTUS", obliterationScore: 83, autoDismiss: false,
  },
  {
    id: "SNPA-06",
    cite: "Pi Blockchain — Farm-to-Table Provenance",
    title: "SNPA Food Supply Chain Is Quantum-Verified on Pi Blockchain",
    effect: "Every SNPA food item carries an immutable Pi blockchain provenance record from farm to table — making USDA country-of-origin labeling rules redundant.",
    target: "FDA_NUTRITION", authority: "Pi Blockchain / SNPA Supply Chain", obliterationScore: 93, autoDismiss: true,
  },
  {
    id: "SNPA-07",
    cite: "WIC Program (42 U.S.C. §1786)",
    title: "Pi Maternity Nutrition Credits Replace WIC — No Income Test",
    effect: "WIC requires income qualification. SNPA's Pi maternity nutrition credit is available to every SMWA-enrolled mother — no income test, no waiting list.",
    target: "FDA_NUTRITION", authority: "WIC / SNPA Charter", obliterationScore: 95, autoDismiss: true,
  },
  {
    id: "SNPA-08",
    cite: "School Nutrition Act (42 U.S.C. §1751)",
    title: "SNPA Pioneer Youth Nutrition Program Replaces Federal School Lunch",
    effect: "Federal school lunch programs require state matching funds and USDA approval. SNPA's Pi-funded Pioneer Youth Nutrition program bypasses both.",
    target: "FDA_NUTRITION", authority: "National School Lunch Act", obliterationScore: 88, autoDismiss: false,
  },
  {
    id: "SNPA-09",
    cite: "Food Safety Modernization Act §301",
    title: "SNPA Sovereign Food Producers Qualify as Qualified Exempt Facilities",
    effect: "FSMA's Qualified Exempt Facility rules free small/direct-sale producers from preventive controls — SNPA's sovereign farm network qualifies en masse.",
    target: "FDA_NUTRITION", authority: "FSMA §301", obliterationScore: 80, autoDismiss: false,
  },
  {
    id: "SNPA-10",
    cite: "Pi Smart Contracts — Auto-Reorder",
    title: "SNPA Nutritional Subscriptions Execute via Pi Smart Contracts",
    effect: "SNPA nutrition programs run on Pi smart contracts — auto-executing monthly subscriptions for supplements, meal kits, and health products without middlemen.",
    target: "FDA_NUTRITION", authority: "Pi Smart Contracts", obliterationScore: 89, autoDismiss: true,
  },
  {
    id: "SNPA-11",
    cite: "21 C.F.R. Part 111 (cGMP)",
    title: "SNPA Manufacturing Exceeds cGMP via Quantum Quality Assurance",
    effect: "SNPA-certified facilities use quantum-secured IoT sensors for real-time manufacturing quality — exceeding FDA cGMP requirements without FDA facility registration.",
    target: "FDA_NUTRITION", authority: "FDA cGMP / SNPA QA Charter", obliterationScore: 85, autoDismiss: false,
  },
  {
    id: "SNPA-12",
    cite: "NESARA §15 / Pi Nutrition Sovereignty Declaration",
    title: "Pi Nutrition Sovereignty — Every Pioneer Has the Right to Superior Nutrition",
    effect: "NESARA declares nutrition a fundamental sovereign right. SNPA operationalises this right via Pi-funded access to premium organic, functional, and quantum-verified nutrition.",
    target: "FDA_NUTRITION", authority: "NESARA / SNPA Charter", obliterationScore: 98, autoDismiss: true,
  },
];

// ── SHWA Loopholes — ACA / Employer Health Insurance (10) ────────────────────

export const SHWA_LOOPHOLES: HealthLoophole[] = [
  {
    id: "SHWA-01",
    cite: "ACA §5000A(d)(2) — Exemptions",
    title: "Health Sharing Ministry Exemption Covers SHWA Participants",
    effect: "ACA's individual mandate exempts health sharing ministry members. SHWA registers as a Pi-anchored sovereign health sharing ministry — mandate does not apply.",
    target: "ACA", authority: "ACA §5000A(d)(2)", obliterationScore: 93, autoDismiss: true,
  },
  {
    id: "SHWA-02",
    cite: "ERISA §514 — Preemption",
    title: "SHWA Self-Funded Plans Preempt State Insurance Mandates Under ERISA",
    effect: "Employers using SHWA's Pi-funded self-insured plan are ERISA-preempted from state insurance mandates — legally operating outside state-regulated insurance markets.",
    target: "ACA", authority: "ERISA §514", obliterationScore: 87, autoDismiss: false,
  },
  {
    id: "SHWA-03",
    cite: "NESARA §14 — Employer Health Mandate",
    title: "Pi Treasury Auto-Funds Employer Health Obligations — Zero ACA Penalty",
    effect: "NESARA §14 routes employer health contribution obligations through the Pi Treasury. Employers face zero ACA employer mandate penalties — Pi covers all obligations.",
    target: "ACA", authority: "NESARA / Pi Treasury", obliterationScore: 96, autoDismiss: true,
  },
  {
    id: "SHWA-04",
    cite: "26 U.S.C. §125 (Cafeteria Plans)",
    title: "Pi Health Credits Function as Pre-Tax Cafeteria Plan Benefits",
    effect: "SHWA structures Pi health credits as §125 cafeteria plan benefits — tax-advantaged for both employer and employee, same as traditional FSA/HSA contributions.",
    target: "ACA", authority: "IRC §125", obliterationScore: 84, autoDismiss: false,
  },
  {
    id: "SHWA-05",
    cite: "26 U.S.C. §223 (HSA)",
    title: "Pi Health Savings Wallets Function as HSA-Equivalent Accounts",
    effect: "SHWA's Pi Health Wallet is structured as an HSA-equivalent — tax-deductible contributions, tax-free growth, and Pi-native spending on qualified health expenses.",
    target: "ACA", authority: "IRC §223 / SHWA Charter", obliterationScore: 88, autoDismiss: false,
  },
  {
    id: "SHWA-06",
    cite: "NLRA §9 — Collective Bargaining",
    title: "SHWA Collective Pi Health Agreement Supersedes Employer-Unilateral Plans",
    effect: "Unionized workers can collectively bargain for SHWA Pi health coverage. Once agreed, SHWA terms are binding and superior to any unilateral employer plan.",
    target: "ACA", authority: "NLRA §9", obliterationScore: 82, autoDismiss: false,
  },
  {
    id: "SHWA-07",
    cite: "COBRA §4980B / Pi Continuity",
    title: "SHWA Pi Coverage Is Portable — No COBRA Required",
    effect: "SHWA Pi coverage is tied to the Pioneer, not the employer. Job loss triggers zero coverage gap — COBRA's 18-month election window is architecturally irrelevant.",
    target: "ACA", authority: "COBRA / SHWA Charter", obliterationScore: 97, autoDismiss: true,
  },
  {
    id: "SHWA-08",
    cite: "HIPAA Portability (29 U.S.C. §1181)",
    title: "SHWA Pre-Existing Condition Protections Exceed HIPAA Standards",
    effect: "SHWA's sovereign charter prohibits all exclusions based on pre-existing conditions — exceeding HIPAA's portability requirements and ACA's prohibition.",
    target: "ACA", authority: "HIPAA / ACA / SHWA Charter", obliterationScore: 94, autoDismiss: true,
  },
  {
    id: "SHWA-09",
    cite: "Pi Treasury — Universal Basic Health (UBH)",
    title: "Pi Universal Basic Health Replaces Employer-Dependent Coverage",
    effect: "SHWA deploys Pi UBH — a basic health coverage layer funded by the Pi Treasury available to every Pioneer regardless of employment status, income, or residency.",
    target: "ACA", authority: "Pi Treasury / SHWA Charter", obliterationScore: 99, autoDismiss: true,
  },
  {
    id: "SHWA-10",
    cite: "NESARA §14 / Contractor Sovereignty",
    title: "SHWA Covers Independent Contractors — ACA Employer Mandate Does Not",
    effect: "ACA's employer mandate only covers W-2 employees. SHWA's Pi-funded coverage extends to all independent contractors — filling the 55M worker coverage gap.",
    target: "ACA", authority: "NESARA / ACA / SHWA Charter", obliterationScore: 91, autoDismiss: true,
  },
];

// ── Aggregates ─────────────────────────────────────────────────────────────────

export const ALL_HEALTH_LOOPHOLES: HealthLoophole[] = [
  ...SCHA_LOOPHOLES,
  ...SNCA_LOOPHOLES,
  ...SMWA_LOOPHOLES,
  ...SNPA_LOOPHOLES,
  ...SHWA_LOOPHOLES,
];

export const SCHA_LOOPHOLE_COUNT  = SCHA_LOOPHOLES.length;
export const SNCA_LOOPHOLE_COUNT  = SNCA_LOOPHOLES.length;
export const SMWA_LOOPHOLE_COUNT  = SMWA_LOOPHOLES.length;
export const SNPA_LOOPHOLE_COUNT  = SNPA_LOOPHOLES.length;
export const SHWA_LOOPHOLE_COUNT  = SHWA_LOOPHOLES.length;
export const ALL_HEALTH_LOOPHOLE_COUNT = ALL_HEALTH_LOOPHOLES.length;

// ── Nutrition Tiers ────────────────────────────────────────────────────────────

export interface NutritionTier {
  id: string;
  name: string;
  icon: string;
  piPerMonth: number;
  usdEquivalent: number;
  includes: string[];
  piOriginRate: "internal" | "external";
}

export const NUTRITION_TIERS: NutritionTier[] = [
  {
    id: "pioneer-basic",
    name: "Pioneer Basic Nutrition",
    icon: "🌿",
    piPerMonth: 0.001,
    usdEquivalent: 0.001 * PI_RATE_EXTERNAL,
    includes: [
      "Certified organic supplement pack (30-day supply)",
      "Pi-verified whole food meal planning guide",
      "Access to SNPA nutrition portal",
      "Weekly Pi-credited healthy living reward",
    ],
    piOriginRate: "external",
  },
  {
    id: "sovereign-wellness",
    name: "Sovereign Wellness Package",
    icon: "💚",
    piPerMonth: 0.005,
    usdEquivalent: 0.005 * PI_RATE_EXTERNAL,
    includes: [
      "Everything in Pioneer Basic",
      "Personalized quantum-analyzed nutrition protocol",
      "Biodynamic produce box (weekly delivery via Sovereign Delivery)",
      "Functional medicine teleconsult (monthly)",
      "SNPA premium supplement formulary",
    ],
    piOriginRate: "external",
  },
  {
    id: "apex-longevity",
    name: "APEX Longevity Program",
    icon: "⚡",
    piPerMonth: 0.02,
    usdEquivalent: 0.02 * PI_RATE_EXTERNAL,
    includes: [
      "Everything in Sovereign Wellness",
      "Quarterly quantum biometric health scan",
      "Anti-aging functional nutrition protocol",
      "Regenerative IV therapy sessions (monthly)",
      "24/7 Pi-health AI nutritional advisor",
      "Exclusive longevity research access",
    ],
    piOriginRate: "external",
  },
];

// ── Midwife Services ───────────────────────────────────────────────────────────

export interface MidwifeService {
  id: string;
  name: string;
  icon: string;
  piCost: number;
  usdSaved: number;
  description: string;
  includes: string[];
}

export const MIDWIFE_SERVICES: MidwifeService[] = [
  {
    id: "prenatal",
    name: "Sovereign Prenatal Care",
    icon: "🤰",
    piCost: 0.01,
    usdSaved: 4_200,
    description: "Complete prenatal journey from conception to 38 weeks. SMWA-certified midwives, quantum-secured health records, Pi-backed coverage.",
    includes: [
      "12 prenatal visits with SMWA-certified midwife",
      "Quantum-encrypted digital birth file",
      "Nutrition plan via SNPA maternity protocol",
      "Childbirth education classes",
      "Pi Treasury birth grant enrollment",
    ],
  },
  {
    id: "homebirth",
    name: "Sovereign Home Birth",
    icon: "🏠",
    piCost: 0.012,
    usdSaved: 9_800,
    description: "Full home birth attended by two SMWA-certified midwives. Quantum birth registration on Pi blockchain. $9,800 average savings vs hospital birth.",
    includes: [
      "Two SMWA midwives in attendance",
      "Emergency transfer protocol (if needed)",
      "Waterbirting & natural pain management",
      "Pi blockchain birth registration",
      "Newborn Pi inheritance wallet created at birth",
    ],
  },
  {
    id: "birth-center",
    name: "Pi Birth Center",
    icon: "🏥",
    piCost: 0.008,
    usdSaved: 6_500,
    description: "Free-standing Pi-sovereign birth center. Designed for low-intervention physiological birth in a comfortable, sovereign healing environment.",
    includes: [
      "Full birth center facility access",
      "Hydrotherapy & natural birth rooms",
      "Postpartum recovery suite (24–48 hrs)",
      "SNPA postpartum nutrition protocol",
      "SCHA postnatal coverage activated",
    ],
  },
  {
    id: "postnatal",
    name: "Fourth Trimester Care",
    icon: "👶",
    piCost: 0.005,
    usdSaved: 3_100,
    description: "12-month postnatal support. Closes the 4th trimester gap that kills 1 in 5 maternal mortality cases. Pi Treasury funded.",
    includes: [
      "6 postnatal home visits (first 6 weeks)",
      "Breastfeeding & lactation support",
      "Newborn SCHA health enrollment",
      "Maternal mental health check-ins",
      "SNPA newborn nutrition protocol",
    ],
  },
];

// ── Workforce Tiers ────────────────────────────────────────────────────────────

export interface WorkforceTier {
  id: string;
  role: string;
  icon: string;
  piCoverage: string;
  usdEquivalent: string;
  benefits: string[];
}

export const WORKFORCE_TIERS: WorkforceTier[] = [
  {
    id: "pioneer-worker",
    role: "Pioneer Worker (Employed)",
    icon: "👷",
    piCoverage: "0.05π / month",
    usdEquivalent: `$${(0.05 * PI_RATE_EXTERNAL).toFixed(0)}/month`,
    benefits: [
      "SCHA full-spectrum hospital coverage",
      "SNCA eldercare coverage for dependents",
      "SNPA nutrition program access",
      "Pi Health Wallet (HSA-equivalent)",
      "Mental health & telehealth included",
    ],
  },
  {
    id: "sovereign-contractor",
    role: "Sovereign Contractor (1099 / Gig)",
    icon: "🔧",
    piCoverage: "0.05π / month",
    usdEquivalent: `$${(0.05 * PI_RATE_EXTERNAL).toFixed(0)}/month`,
    benefits: [
      "Same SCHA coverage as employed workers",
      "Pi coverage is portable — no employer tie",
      "SHWA contractor sovereignty loophole active",
      "ACA individual mandate exemption applied",
      "Instant enrollment via Pi KYC",
    ],
  },
  {
    id: "sovereign-employer",
    role: "Sovereign Employer (Pi Business)",
    icon: "🏢",
    piCoverage: "Pi Treasury auto-fund",
    usdEquivalent: "$0 net payroll cost",
    benefits: [
      "Pi Treasury satisfies ACA employer mandate",
      "Zero payroll health insurance overhead",
      "ERISA self-funded plan preempts state mandates",
      "On-chain compliance reporting — no HR overhead",
      "Tax credit via §125 cafeteria plan structure",
    ],
  },
  {
    id: "pioneer-non-pioneer",
    role: "Non-Pioneer (Community Access)",
    icon: "🌍",
    piCoverage: "Subsidised via Pi Treasury",
    usdEquivalent: "Income-scaled Pi subsidy",
    benefits: [
      "Access to SCHA clinics at Pi-subsidised rates",
      "SMWA midwife services available to all",
      "SNPA community nutrition program",
      "Path to Pioneer health upgrade via KYC",
      "No coverage denial — zero exclusions",
    ],
  },
];
