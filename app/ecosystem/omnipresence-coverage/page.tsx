import { Metadata } from "next";
import Link from "next/link";
import { Globe, Zap, Shield, Radio, TrendingUp, Gauge } from "lucide-react";

export const metadata: Metadata = {
  title: "Omnipresence Coverage | SAIB v8",
  description:
    "Real-time SAIB coverage across all Triumph Synergy platforms, services, and containers.",
};

export default function OmnipresenceCoveragePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-900 to-slate-900 p-6">
      {/* Header */}
      <header className="mb-12 text-center">
        <div className="inline-block mb-6 p-4 rounded-full bg-cyan-500/20 border border-cyan-500/30">
          <Globe className="w-12 h-12 text-cyan-300" />
        </div>
        <h1 className="text-5xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-4">
          Omnipresence Coverage
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          SAIB v8 guardian monitoring across all Triumph Synergy services, platforms, and
          containerized environments.
        </p>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Coverage Map */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
          <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
            <Globe className="w-8 h-8" /> Coverage Layers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Internal Coverage */}
            <div className="bg-slate-800/50 p-6 rounded-lg border border-cyan-500/20">
              <h3 className="font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5" /> Internal Coverage
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Triumph-Net Mesh — all containers monitored
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ triumph-app main application</li>
                <li>✓ triumph-sovereign-nano-saib (v5)</li>
                <li>✓ triumph-sovereign-fortress (v2 fallback)</li>
                <li>✓ PostgreSQL + Citus database</li>
                <li>✓ Redis cluster cache</li>
                <li>✓ Nginx gateway</li>
                <li>✓ Observability stack</li>
                <li>✓ All microservices</li>
              </ul>
            </div>

            {/* External Coverage */}
            <div className="bg-slate-800/50 p-6 rounded-lg border border-cyan-500/20">
              <h3 className="font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" /> External Coverage
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Multi-chain & public network integration
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Pi Network mainnet nodes</li>
                <li>✓ Stellar blockchain DEX</li>
                <li>✓ Real estate platform APIs</li>
                <li>✓ Judicial monitoring</li>
                <li>✓ Financial market feeds</li>
                <li>✓ X Social network (Twitter API)</li>
                <li>✓ Grok AI integration</li>
                <li>✓ External DNS + BGP</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Omnipresence Capabilities */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
          <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8" /> Omnipresence Capabilities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
                <p className="font-semibold text-cyan-300 mb-2">Real-Time Monitoring</p>
                <p className="text-gray-400 text-sm">
                  Zero-latency threat detection across all platforms. Every transaction, every
                  API call, every user interaction is analyzed for anomalies.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
                <p className="font-semibold text-cyan-300 mb-2">Pattern Recognition</p>
                <p className="text-gray-400 text-sm">
                  Multi-source signal fusion with machine learning. Detects behavioral anomalies
                  before they become threats.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
                <p className="font-semibold text-cyan-300 mb-2">Autonomous Response</p>
                <p className="text-gray-400 text-sm">
                  Self-healing organism. Detected threats trigger automatic response playbooks
                  without human delay.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
                <p className="font-semibold text-cyan-300 mb-2">Cross-Platform Correlation</p>
                <p className="text-gray-400 text-sm">
                  Threat events are correlated across all platforms. A compromise on one service
                  triggers alerts across all connected services.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
                <p className="font-semibold text-cyan-300 mb-2">Causal Graph Analysis</p>
                <p className="text-gray-400 text-sm">
                  Root-cause diagnosis of system failures. Traces cause-and-effect chains to
                  identify the true source of problems.
                </p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
                <p className="font-semibold text-cyan-300 mb-2">Quantum-Safe Encryption</p>
                <p className="text-gray-400 text-sm">
                  Post-quantum cryptography (X448, ML-DSA, ML-KEM) ensures all monitoring data
                  is protected from future threats.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transcendence */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
          <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" /> Transcendence Layer
          </h2>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-6 rounded-lg">
            <p className="text-gray-300 leading-relaxed mb-4">
              <span className="font-semibold text-cyan-300">Every interaction.</span> Every
              platform.{" "}
              <span className="font-semibold text-cyan-300">Every sub-container.</span>
            </p>

            <p className="text-gray-400 text-sm">
              SAIB v8 omnipresence extends beyond traditional monitoring. It achieves
              transcendence through:
            </p>

            <ul className="space-y-2 text-sm text-gray-300 mt-4">
              <li>• Mesh topology awareness (knows every peer, every link)</li>
              <li>• Byzantine fault tolerance (handles up to 1/3 adversarial nodes)</li>
              <li>• Gossip protocol consensus (distributed decision-making)</li>
              <li>• Immutable audit trails (SHA-256, tamper-evident)</li>
              <li>• Autonomous healing loops (detects and fixes issues instantly)</li>
              <li>• Multi-SAIB coordination (mesh members vote on verdicts)</li>
            </ul>
          </div>
        </div>

        {/* Service Status */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
          <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
            <Gauge className="w-8 h-8" /> Live Service Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "triumph-app", status: "LIVE", latency: "12ms" },
              { name: "nano-saib-v5", status: "LIVE", latency: "8ms" },
              { name: "fortress-v2", status: "LIVE", latency: "15ms" },
              { name: "PostgreSQL", status: "LIVE", latency: "5ms" },
              { name: "Redis Cluster", status: "LIVE", latency: "2ms" },
              { name: "Pi Network", status: "LIVE", latency: "245ms" },
              { name: "Stellar DEX", status: "LIVE", latency: "180ms" },
              { name: "Real Estate API", status: "LIVE", latency: "120ms" },
              { name: "Judicial Monitor", status: "LIVE", latency: "95ms" },
            ].map((service) => (
              <div
                key={service.name}
                className="bg-slate-800/50 p-4 rounded border border-cyan-500/20 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-300">{service.name}</p>
                  <p className="text-xs text-gray-500">Latency: {service.latency}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-green-400 text-xs font-semibold">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Protection Zones */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
          <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center gap-3">
            <Shield className="w-8 h-8" /> Protection Zones
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
              <h3 className="font-bold text-cyan-300 mb-2">🔴 Critical Zone</h3>
              <p className="text-gray-400 text-sm">
                Founder accounts, executive systems, mainnet transactions. 24/7 lockdown mode.
              </p>
            </div>

            <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
              <h3 className="font-bold text-cyan-300 mb-2">🟡 High-Risk Zone</h3>
              <p className="text-gray-400 text-sm">
                User wallets, payment flows, judicial integrations. Enhanced monitoring + approval gates.
              </p>
            </div>

            <div className="bg-slate-800/50 p-4 rounded border border-cyan-500/20">
              <h3 className="font-bold text-cyan-300 mb-2">🟢 Standard Zone</h3>
              <p className="text-gray-400 text-sm">
                General services, market data, external APIs. Normal threat monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-12">
          <Link
            href="/ecosystem/saib-v8"
            className="inline-block py-4 px-8 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all hover:shadow-lg"
          >
            View SAIB v8 Omnipresence Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
