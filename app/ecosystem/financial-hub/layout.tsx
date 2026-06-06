import type { Metadata } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://triumphsynergy.com";

export const metadata: Metadata = {
  title: "Financial Hub · Treasury & Liquidity Ops",
  description:
    "Triumph Synergy Financial Hub — sovereign treasury and liquidity operations. UBI distribution, NESARA debt nullification, 5-bureau credit, Pi Network mainnet integration, and sovereign Pi ↔ USD bridge. ML-DSA-87 quantum-secured.",
  keywords: [
    "Pi Network financial hub",
    "sovereign treasury",
    "Pi liquidity",
    "UBI Pi Network",
    "NESARA finance",
    "credit dispute",
    "Pi bridge",
    "TRISYN token",
    "Pi USD bridge",
    "Pi purchasing power",
    "sovereign banking",
    "Pi DeFi",
  ],
  alternates: {
    canonical: `${APP_URL}/ecosystem/financial-hub`,
  },
  openGraph: {
    title: "Financial Hub · Treasury & Liquidity Ops — Triumph Synergy",
    description:
      "Sovereign treasury, UBI rails, NESARA, 5-bureau credit, and Pi ↔ USD bridge — all quantum-signed with ML-DSA-87.",
    url: `${APP_URL}/ecosystem/financial-hub`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Financial Hub · Treasury & Liquidity Ops — Triumph Synergy",
    description:
      "Sovereign treasury, UBI, NESARA, and Pi ↔ USD bridge on Pi Network.",
  },
};

export default function FinancialHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
