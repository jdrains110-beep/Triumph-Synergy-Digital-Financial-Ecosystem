import type { Metadata } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.replit.app";

export const metadata: Metadata = {
  title: "NESARA · Reset & Remittance Engine",
  description:
    "Triumph Synergy NESARA/GESARA compliance hub — debt forgiveness, prosperity fund distribution, tax reform, quantum financial system (QFS), and birth-bond restitution. Powered by Pi Network. ML-DSA-87 quantum-signed.",
  keywords: [
    "NESARA",
    "GESARA",
    "debt forgiveness",
    "prosperity fund",
    "quantum financial system",
    "QFS",
    "Pi Network NESARA",
    "tax reform",
    "sovereign finance",
    "birth certificate bonds",
    "NESARA compliance",
    "Pi remittance",
  ],
  alternates: {
    canonical: `${APP_URL}/ecosystem/nesara`,
  },
  openGraph: {
    title: "NESARA · Reset & Remittance Engine — Triumph Synergy",
    description:
      "Debt forgiveness, prosperity distribution, QFS settlement, and GESARA global compliance — all Pi-powered with ML-DSA-87 quantum signatures.",
    url: `${APP_URL}/ecosystem/nesara`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NESARA · Reset & Remittance Engine — Triumph Synergy",
    description:
      "Debt forgiveness, QFS settlement, and GESARA compliance on Pi Network.",
  },
};

export default function NesaraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
