import { tool } from "ai";
import { z } from "zod";

const PLATFORM_REGISTRY: Record<
  string,
  { name: string; alias: string; description: string; category: string; capabilities: string[] }
> = {
  SQTA: {
    name: "Sovereign Quantum Tax Authority",
    alias: "IRS",
    description:
      "Handles sovereign tax processing, GCV-based income reporting, and Pi-denominated tax obligations for ecosystem participants.",
    category: "financial-governance",
    capabilities: [
      "GCV income reporting",
      "Pi tax withholding",
      "Sovereign tax credit issuance",
      "Allodial deed tax exemptions",
    ],
  },
  SFPA: {
    name: "Sovereign Financial Protection Authority",
    alias: "DCF",
    description:
      "Consumer financial protection, dispute resolution, and sovereign credit oversight across all Pi-denominated transactions.",
    category: "financial-governance",
    capabilities: [
      "Pi transaction dispute resolution",
      "Credit oversight",
      "Consumer protection filings",
      "Fraud investigation",
    ],
  },
  SBCA: {
    name: "Sovereign Business Credit Authority",
    alias: "D&B",
    description:
      "Business credit scoring, Pi-denominated creditworthiness evaluation, and sovereign enterprise registry.",
    category: "credit",
    capabilities: [
      "Business credit scoring",
      "Pi-denominated credit lines",
      "Enterprise sovereignty registration",
      "Credit bureau integration",
    ],
  },
  STEX: {
    name: "Sovereign Travel Exchange",
    alias: "Expedia",
    description:
      "Travel bookings and hospitality services payable in Pi. Partners with global travel networks via GCV conversion.",
    category: "commerce",
    capabilities: [
      "Pi-denominated travel booking",
      "GCV hotel/flight pricing",
      "Sovereign traveler identity",
      "Reward point ↔ Pi conversion",
    ],
  },
  SCLA: {
    name: "Sovereign Cruise Line Authority",
    alias: "Carnival",
    description:
      "Sovereign maritime travel and cruise experiences payable in Pi via GCV.",
    category: "commerce",
    capabilities: [
      "Pi cruise bookings",
      "Sovereign port access",
      "GCV cabin pricing",
      "Maritime sovereign registry",
    ],
  },
  SATA: {
    name: "Sovereign Air Travel Authority",
    alias: "Delta",
    description:
      "Sovereign airline operations and Pi-denominated air travel worldwide.",
    category: "commerce",
    capabilities: [
      "Pi airfare payments",
      "Sovereign frequent flyer",
      "GCV seat pricing",
      "Priority boarding via SAIB identity",
    ],
  },
  STRA: {
    name: "Sovereign Theme & Recreation Authority",
    alias: "Disney",
    description:
      "Sovereign entertainment, theme parks, and media experiences powered by Pi.",
    category: "entertainment",
    capabilities: [
      "Pi park admission",
      "Sovereign media access",
      "GCV merchandise pricing",
      "Creator royalty distribution in Pi",
    ],
  },
  SVRA: {
    name: "Sovereign Vacation Rental Authority",
    alias: "Airbnb",
    description:
      "Short-term rental marketplace with Pi-native payments and sovereign host verification.",
    category: "real-estate",
    capabilities: [
      "Pi rental payments",
      "Host sovereignty certification",
      "GCV nightly rate conversion",
      "Allodial deed short-term licensing",
    ],
  },
  SITA: {
    name: "Sovereign International Travel Authority",
    alias: "Booking.com",
    description:
      "Global accommodation and transport booking using Pi as primary currency.",
    category: "commerce",
    capabilities: [
      "International Pi bookings",
      "Sovereign hotel registry",
      "Multi-currency GCV display",
      "Traveler SAIB identity verification",
    ],
  },
  SHA: {
    name: "Sovereign Housing Authority",
    alias: "HUD",
    description:
      "Affordable housing, allodial title management, and sovereign real-estate grants denominated in Pi.",
    category: "real-estate",
    capabilities: [
      "Allodial deed issuance",
      "Pi-denominated mortgages",
      "Sovereign housing grants",
      "Property title blockchain registry",
    ],
  },
  SWP: {
    name: "Sovereign Work Platform",
    alias: "LinkedIn",
    description:
      "Professional identity, job placement, and Pi-denominated labor contracts within the sovereign economy.",
    category: "workforce",
    capabilities: [
      "Sovereign work identity",
      "Pi salary contracts",
      "Skills verification on-chain",
      "GCV labor valuation",
    ],
  },
  SRE: {
    name: "Sovereign Real Estate Exchange",
    alias: "Zillow",
    description:
      "Property valuation, listing, and transactions using Pi and allodial title deeds.",
    category: "real-estate",
    capabilities: [
      "GCV property valuation",
      "Pi property transactions",
      "Allodial title listing",
      "Sovereign appraisal services",
    ],
  },
  SBA: {
    name: "Sovereign Banking Authority",
    alias: "JPMorgan",
    description:
      "Sovereign banking services: deposits, loans, wire transfers, and investment products denominated in Pi.",
    category: "banking",
    capabilities: [
      "Pi savings accounts",
      "GCV-collateralized loans",
      "Sovereign wire transfers",
      "Investment products in Pi",
    ],
  },
  SCJA: {
    name: "Sovereign Courts & Judicial Authority",
    alias: "Federal Courts",
    description:
      "Dispute resolution, contract enforcement, and sovereign judicial proceedings recorded on Pi blockchain.",
    category: "legal",
    capabilities: [
      "Smart contract enforcement",
      "Sovereign arbitration",
      "On-chain court records",
      "Pi-denominated legal fees",
    ],
  },
  SEDA: {
    name: "Sovereign Education Authority",
    alias: "Dept of Education",
    description:
      "Accredited sovereign education programs, scholarships, and credentials issued on-chain in Pi.",
    category: "education",
    capabilities: [
      "Pi-denominated tuition",
      "Sovereign degree issuance",
      "GCV scholarship grants",
      "On-chain credential verification",
    ],
  },
  SMEDIA: {
    name: "Sovereign Media Authority",
    alias: "Netflix",
    description:
      "Sovereign streaming platform for media, entertainment, and creator monetization in Pi.",
    category: "entertainment",
    capabilities: [
      "Pi subscription payments",
      "Creator royalties in Pi",
      "Sovereign content licensing",
      "GCV advertising revenue",
    ],
  },
  SQIA: {
    name: "Sovereign Quantum Intelligence Authority",
    alias: "OpenAI",
    description:
      "SAIB itself — sovereign AI infrastructure, quantum reasoning, and intelligence services for the ecosystem.",
    category: "ai",
    capabilities: [
      "Sovereign AI inference",
      "Quantum decision trees",
      "Pi-denominated AI credits",
      "Ecosystem fine-tuning and optimization",
    ],
  },
};

export const getSovereignPlatformInfo = tool({
  description:
    "Get detailed information about any of the 17 SAIB sovereign platforms (SQTA, SFPA, SBCA, STEX, SCLA, SATA, STRA, SVRA, SITA, SHA, SWP, SRE, SBA, SCJA, SEDA, SMEDIA, SQIA). Returns the platform's purpose, capabilities, category, and how Pi/GCV is used within it.",
  inputSchema: z.object({
    platform: z
      .string()
      .describe(
        "Platform code (e.g., 'SQTA', 'SHA') or alias name (e.g., 'IRS', 'HUD', 'LinkedIn'). Use 'all' to list every platform."
      ),
  }),
  execute: async ({ platform }) => {
    if (platform.toLowerCase() === "all") {
      return {
        totalPlatforms: Object.keys(PLATFORM_REGISTRY).length,
        platforms: Object.entries(PLATFORM_REGISTRY).map(([code, info]) => ({
          code,
          ...info,
        })),
      };
    }

    const upperPlatform = platform.toUpperCase();
    // Direct code lookup
    if (PLATFORM_REGISTRY[upperPlatform]) {
      return { code: upperPlatform, ...PLATFORM_REGISTRY[upperPlatform] };
    }

    // Alias lookup
    const byAlias = Object.entries(PLATFORM_REGISTRY).find(
      ([, info]) =>
        info.alias.toLowerCase() === platform.toLowerCase() ||
        info.name.toLowerCase().includes(platform.toLowerCase())
    );

    if (byAlias) {
      return { code: byAlias[0], ...byAlias[1] };
    }

    // Category lookup
    const byCategory = Object.entries(PLATFORM_REGISTRY).filter(
      ([, info]) =>
        info.category.toLowerCase() === platform.toLowerCase()
    );

    if (byCategory.length > 0) {
      return {
        category: platform,
        platforms: byCategory.map(([code, info]) => ({ code, ...info })),
      };
    }

    return {
      error: `Platform '${platform}' not found. Valid codes: ${Object.keys(PLATFORM_REGISTRY).join(", ")}`,
      availablePlatforms: Object.keys(PLATFORM_REGISTRY),
    };
  },
});
