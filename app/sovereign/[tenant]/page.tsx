/**
 * Triumph Synergy — Sovereign Tenant Dynamic Route
 * /sovereign/[tenant] — served for all 22 .pi domains
 *
 * Statically generated at build time for all 22 sovereign tenants.
 * Network mode (mainnet/testnet) comes from search param injected by middleware.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant, getAllSlugs, GCV } from "@/lib/sovereign-tenants";
import type { NetworkMode } from "@/lib/sovereign-tenants";
import SovereignStorefront from "@/components/sovereign-storefront";

// ── Static generation ─────────────────────────────────────────────────────────
export function generateStaticParams() {
    return getAllSlugs().map((slug) => ({ tenant: slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({
    params,
}: {
    params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
    const { tenant: slug } = await params;
    const tenant = getTenant(slug);
    if (!tenant) return { title: "Not Found" };

    return {
        title: `${tenant.sovereignName} — ${tenant.domain} | Triumph Synergy`,
        description: `${tenant.description} Pi GCV: $${GCV.toLocaleString()}/π`,
        openGraph: {
            title: tenant.sovereignName,
            description: tenant.tagline,
            siteName: "Triumph Synergy Sovereign Ecosystem",
        },
        other: {
            "pi-app-manifest": JSON.stringify({
                name: tenant.sovereignName,
                version: "1.0.0",
                permissions: ["payments", "username"],
                network: "mainnet",
            }),
        },
    };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function SovereignTenantPage({
    params,
    searchParams,
}: {
    params: Promise<{ tenant: string }>;
    searchParams: Promise<{ network?: string }>;
}) {
    const { tenant: slug } = await params;
    const { network: networkParam } = await searchParams;

    const tenant = getTenant(slug);
    if (!tenant) notFound();

    const network: NetworkMode =
        networkParam === "testnet" ? "testnet" : "mainnet";

    return <SovereignStorefront tenant={tenant} network={network} />;
}
