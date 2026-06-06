import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://triumphsynergy.com";

// Priority / changefreq helpers
const P_HIGH   = { priority: 0.9, changeFrequency: "weekly"  } as const;
const P_MED    = { priority: 0.7, changeFrequency: "monthly" } as const;
const P_LOW    = { priority: 0.5, changeFrequency: "monthly" } as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const url = (path: string) => `${APP_URL}${path}`;

  return [
    // ── Core pages ────────────────────────────────────────────────────────
    {
      url: url("/"),
      lastModified: now,
      priority: 1.0,
      changeFrequency: "daily",
    },
    {
      url: url("/ecosystem"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/transactions"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ubi"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/trisyn"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/saib"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/onboarding"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/real-estate"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/judicial"),
      lastModified: now,
      ...P_MED,
    },

    // ── Financial & Banking ───────────────────────────────────────────────
    {
      url: url("/ecosystem/tokenization"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/credit-dispute"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/sovereign-pidex"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/sovereign-pi-bank"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/sovereign-insurance"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-quantum-credit"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/nesara"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/financial-hub"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/sovereign-nesara-gesara"),
      lastModified: now,
      ...P_HIGH,
    },

    // ── Citizen & Social ──────────────────────────────────────────────────
    {
      url: url("/ecosystem/sovereign-citizenship"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-health"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-housing"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/work-programs"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/applications"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-sports"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-estate"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-work-nexus"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-gaming-nexus"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-education"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-senior-care"),
      lastModified: now,
      ...P_MED,
    },

    // ── Commerce & Logistics ──────────────────────────────────────────────
    {
      url: url("/ecosystem/sovereign-commerce-regulation"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-delivery"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-wawa"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-travel"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-aviation"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-frontier"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/publix-phygital"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/saib-retail"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/merchant-rail"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/subscriptions"),
      lastModified: now,
      ...P_LOW,
    },

    // ── Governance & Defense ──────────────────────────────────────────────
    {
      url: url("/ecosystem/sovereign-military"),
      lastModified: now,
      ...P_LOW,
    },
    {
      url: url("/ecosystem/sovereign-judicial"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/hq"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-positions"),
      lastModified: now,
      ...P_LOW,
    },

    // ── Intelligence & AI ─────────────────────────────────────────────────
    {
      url: url("/ecosystem/sovereign-ai-bot"),
      lastModified: now,
      ...P_HIGH,
    },
    {
      url: url("/ecosystem/loopholes"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-rivals"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-account-fusion"),
      lastModified: now,
      ...P_MED,
    },

    // ── Infrastructure & Mesh ─────────────────────────────────────────────
    {
      url: url("/ecosystem/quantum-shield"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-mesh"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-nodes"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/pi-registry"),
      lastModified: now,
      ...P_MED,
    },
    {
      url: url("/ecosystem/sovereign-telecom"),
      lastModified: now,
      ...P_LOW,
    },
    {
      url: url("/ecosystem/sovereign-utilities"),
      lastModified: now,
      ...P_LOW,
    },
    {
      url: url("/ecosystem/sovereign-pi-framework"),
      lastModified: now,
      ...P_MED,
    },

    // ── Legal ─────────────────────────────────────────────────────────────
    {
      url: url("/legal/trademark"),
      lastModified: now,
      ...P_LOW,
    },
  ];
}
