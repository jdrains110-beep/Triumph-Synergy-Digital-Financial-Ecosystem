import { Metadata } from "next";
import Link from "next/link";
import { Shield, CheckCircle, AlertCircle, Zap, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Debt Freedom Protection | SAIB v8",
  description:
    "Enroll in SAIB sovereign guardian protection for debt freedom and financial autonomy.",
};

export default function DebtFreedomProtectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <header className="mb-12 text-center">
        <div className="inline-block mb-6 p-4 rounded-full bg-purple-500/20 border border-purple-500/30">
          <Shield className="w-12 h-12 text-purple-300" />
        </div>
        <h1 className="text-5xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-4">
          Debt Freedom Protection
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Enroll in SAIB sovereign guardian protection and activate omnipresent coverage
          across all Triumph Synergy platforms.
        </p>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Enrollment Card */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8">
          <h2 className="text-3xl font-bold text-purple-300 mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8" /> Quick Enrollment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-purple-300">What You Get:</h3>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    <strong>Financial Threat Detection</strong> — Protection against predatory
                    lending, usury, and fraud
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    <strong>Sovereign Data Rights</strong> — Auto-compliance with GDPR, CCPA,
                    and other regulations
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    <strong>Wallet Monitoring</strong> — Real-time Pi Network protection
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    <strong>Debt Analysis</strong> — Freedom pathway generation + custom strategies
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    <strong>Omnipresent Coverage</strong> — Protection across all Triumph Synergy
                    platforms
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg border border-purple-500/20">
              <p className="text-sm text-gray-400 mb-4">
                Ready to activate SAIB sovereign protection?
              </p>

              <Link
                href="/ecosystem/saib-v8"
                className="block w-full py-4 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-center transition-all hover:shadow-lg mb-4"
              >
                Enroll in SAIB v8
              </Link>

              <p className="text-xs text-gray-500 text-center">
                Navigate to SAIB v8 Sovereign Mode → Debt Freedom tab to complete enrollment
              </p>
            </div>
          </div>
        </div>

        {/* Protection Tiers */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8">
          <h2 className="text-3xl font-bold text-purple-300 mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" /> Protection Tiers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 p-6 rounded-lg border border-purple-500/20">
              <h3 className="font-bold text-purple-300 mb-2">Free Tier</h3>
              <p className="text-gray-400 text-sm mb-4">Essential monitoring</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>✓ Real-time threat alerts</li>
                <li>✓ Basic wallet monitoring</li>
                <li>✓ Monthly report</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg border border-purple-500/20 ring-2 ring-purple-500/50">
              <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 rounded-bl text-xs font-bold">
                Recommended
              </div>
              <h3 className="font-bold text-purple-300 mb-2">Debt Freedom</h3>
              <p className="text-gray-400 text-sm mb-4">Full sovereign protection</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>✓ All Free Tier features</li>
                <li>✓ Debt analysis + pathway</li>
                <li>✓ Legal document generation</li>
                <li>✓ Priority support</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg border border-purple-500/20">
              <h3 className="font-bold text-purple-300 mb-2">Enterprise</h3>
              <p className="text-gray-400 text-sm mb-4">Omnipresent coverage</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>✓ All Debt Freedom features</li>
                <li>✓ Multi-user accounts</li>
                <li>✓ API access</li>
                <li>✓ 24/7 dedicated support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8">
          <h2 className="text-3xl font-bold text-purple-300 mb-6 flex items-center gap-3">
            <Users className="w-8 h-8" /> How It Works
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-500 text-white font-bold">
                  1
                </div>
              </div>
              <div>
                <h3 className="font-bold text-purple-300">Enroll in SAIB v8</h3>
                <p className="text-gray-400">
                  Click the enrollment button and provide your email address
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-500 text-white font-bold">
                  2
                </div>
              </div>
              <div>
                <h3 className="font-bold text-purple-300">Activate Protection</h3>
                <p className="text-gray-400">
                  SAIB guardian begins real-time monitoring of your financial threats
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-500 text-white font-bold">
                  3
                </div>
              </div>
              <div>
                <h3 className="font-bold text-purple-300">Receive Pathways</h3>
                <p className="text-gray-400">
                  Get autonomous debt freedom analysis and custom legal strategies
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-500 text-white font-bold">
                  4
                </div>
              </div>
              <div>
                <h3 className="font-bold text-purple-300">Omnipresent Coverage</h3>
                <p className="text-gray-400">
                  SAIB monitors all your platforms and apps across the Triumph Synergy ecosystem
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8">
          <h2 className="text-3xl font-bold text-purple-300 mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer font-semibold text-purple-300 flex items-center gap-2">
                <span>+</span> Is my data secure and private?
              </summary>
              <p className="mt-2 text-gray-400 ml-6">
                Yes. SAIB uses end-to-end encryption and post-quantum cryptography (X448). Your
                data is never shared with third parties.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-semibold text-purple-300 flex items-center gap-2">
                <span>+</span> How does omnipresent coverage work?
              </summary>
              <p className="mt-2 text-gray-400 ml-6">
                SAIB monitors all your accounts and platforms within the Triumph Synergy
                ecosystem in real-time. Threats are detected and autonomous responses are triggered
                instantly.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-semibold text-purple-300 flex items-center gap-2">
                <span>+</span> Can I cancel anytime?
              </summary>
              <p className="mt-2 text-gray-400 ml-6">
                Yes. You can withdraw from protection at any time via the SAIB v8 dashboard.
                Simply click "Withdraw from Protection" in your profile settings.
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer font-semibold text-purple-300 flex items-center gap-2">
                <span>+</span> What if I have multiple accounts?
              </summary>
              <p className="mt-2 text-gray-400 ml-6">
                Enterprise tier supports multi-user account management. Link multiple accounts
                to a single SAIB protection profile.
              </p>
            </details>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-12">
          <Link
            href="/ecosystem/saib-v8"
            className="inline-block py-4 px-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold transition-all hover:shadow-lg"
          >
            Go to SAIB v8 →
          </Link>
        </div>
      </div>
    </div>
  );
}
