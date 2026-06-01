import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
    title: "SAIB — Sovereign Autonomous Intelligence Backbone | Triumph Synergy",
    description:
        "SAIB (Sovereign Autonomous Intelligence Backbone) v7.0.0 INTREPID CLASS — the sovereign AI layer enforcing Triumph Synergy's internal and external value across Pi Network testnet and mainnet. Live status, Pi KYC guidance, global dispatch mesh, blockchain guardian.",
    keywords: [
        "SAIB",
        "Sovereign AI",
        "Pi Network",
        "Triumph Synergy",
        "Blockchain AI",
        "KYC Guide",
        "Digital Financial Ecosystem",
        "AI Backbone",
        "Mainnet",
        "INTREPID CLASS",
    ],
    openGraph: {
        title: "SAIB — Sovereign Autonomous Intelligence Backbone",
        description:
            "Triumph Synergy's sovereign AI backbone — live v7 INTREPID CLASS status, Pi Network motherboard, global dispatch mesh, and blockchain guardian.",
        type: "website",
        url: "https://triumphsynergy.io/saib",
        images: [
            {
                url: "/og-saib.png",
                width: 1200,
                height: 630,
                alt: "SAIB Sovereign AI Dashboard",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "SAIB — Sovereign Autonomous Intelligence Backbone",
        description:
            "Live v7 INTREPID CLASS status — Pi Network motherboard, global mesh, blockchain guardian.",
        creator: "@jaymoney0300",
    },
    robots: {
        index: true,
        follow: true,
    },
    authors: [{ name: "Jeremiah Joel Drains", url: "https://x.com/jaymoney0300" }],
};

export const viewport: Viewport = {
    themeColor: "#0a1628",
};

/**
 * Clean public layout for the SAIB sovereign page.
 * Inherits root-level providers (ThemeProvider, PiProvider, Web3Provider)
 * from the root layout.tsx, but does NOT render the app sidebar or
 * chat-specific chrome so external visitors get a clean experience.
 */
export default function SAIBLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
