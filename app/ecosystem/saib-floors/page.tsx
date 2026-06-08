import Link from "next/link";
import { SAIB_VERSION_ORDER, SAIB_VERSION_CATALOG } from "@/lib/saib/version-catalog";

export const metadata = {
  title: "SAIB All Floors v1-v10",
  description: "Unified command center for SAIB floors and capabilities from v1 through v10.",
};

export default function SaibFloorsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border border-indigo-500/30 bg-black/30 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">SAIB Command Center</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">All Floors v1 to v10</h1>
          <p className="mt-2 text-gray-300">
            Dedicated operational pages for every SAIB generation. Each floor has live capability probes so you can see what is active, not just static text.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAIB_VERSION_ORDER.map((version) => {
            const spec = SAIB_VERSION_CATALOG[version];
            return (
              <Link
                key={version}
                href={`/ecosystem/saib-${version}`}
                className="rounded-xl border border-white/10 bg-black/25 p-5 transition hover:border-indigo-400/40 hover:bg-black/35"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-300">{version.toUpperCase()}</p>
                <h2 className="mt-1 text-xl font-bold">{spec.title}</h2>
                <p className="mt-2 text-sm text-gray-300">{spec.mission}</p>
                <p className="mt-3 text-xs text-gray-400">Capabilities: {spec.capabilities.length}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
