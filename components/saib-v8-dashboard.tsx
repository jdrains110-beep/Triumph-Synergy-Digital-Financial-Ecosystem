"use client";

/**
 * SAIB v8 Sovereign Mode Dashboard
 * Language Model Integration for Autonomous Legal/Financial Decision Making
 * Omnipresence Coverage + Debt Freedom Protection Enrollment
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Zap,
  Shield,
  Globe,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Lock,
  Radio,
} from "lucide-react";

export function SAIBv8Dashboard() {
  const [activeTab, setActiveTab] = useState<
    "sovereign" | "llm" | "protect" | "omnipresence"
  >("sovereign");
  const [llmStatus, setLlmStatus] = useState<"unconfigured" | "configured" | "provisioning" | "ready">(
    "unconfigured"
  );
  const [omnipresenceData, setOmnipresenceData] = useState<any>(null);
  const [protectionStatus, setProtectionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch LLM status
  useEffect(() => {
    const checkLlmStatus = async () => {
      try {
        const res = await fetch("/api/saib/llm/provision", { method: "GET" });
        const data = await res.json();
        setLlmStatus(data.status || "unconfigured");
      } catch {
        setLlmStatus("unconfigured");
      }
    };
    checkLlmStatus();
  }, []);

  // Fetch omnipresence coverage
  useEffect(() => {
    const fetchOmnipresence = async () => {
      try {
        const res = await fetch("/api/saib/omnipresence");
        const data = await res.json();
        setOmnipresenceData(data);
      } catch {
        console.error("Failed to fetch omnipresence data");
      }
    };
    fetchOmnipresence();
  }, []);

  // Provision LLM
  const handleLlmProvisioning = async (provider: "gemini" | "openrouter") => {
    setLoading(true);
    try {
      const res = await fetch("/api/saib/llm/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLlmStatus("ready");
        alert(`✅ LLM Provisioned: ${provider.toUpperCase()}`);
      } else {
        alert("❌ LLM Provisioning failed");
      }
    } catch (err) {
      console.error("Provisioning error:", err);
      alert("❌ Error provisioning LLM");
    } finally {
      setLoading(false);
    }
  };

  // Enroll in debt freedom protection
  const handleEnrollProtection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saib/protect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: `user_${Math.random().toString(36).slice(2)}`,
          email: "user@triumphsynergy.com",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProtectionStatus(data);
        alert("✅ Enrolled in Debt Freedom Protection");
      } else {
        alert("❌ Enrollment failed");
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("❌ Error enrolling in protection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
              🧠 SAIB v8 Sovereign Mode
            </h1>
            <p className="text-gray-400 mt-2">
              Language Model Intelligence + Omnipresent Protection + Debt Freedom
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-semibold">
              ● LIVE
            </span>
            <span
              className={`px-4 py-2 rounded-lg border font-semibold ${
                llmStatus === "ready"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
              }`}
            >
              {llmStatus === "ready" ? "🧠 LLM Ready" : "⚙️ LLM Config"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-4 border-b border-purple-500/20">
        {(
          ["sovereign", "llm", "protect", "omnipresence"] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 font-semibold transition-all ${
              activeTab === tab
                ? "border-b-2 border-purple-400 text-purple-300"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab === "sovereign" && "🗝️ Sovereign"}
            {tab === "llm" && "🧠 LLM Engine"}
            {tab === "protect" && "🛡️ Debt Freedom"}
            {tab === "omnipresence" && "🌐 Omnipresence"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Sovereign Tab */}
        {activeTab === "sovereign" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-6">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6" /> Sovereign Architecture
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-800/50 p-4 rounded border border-purple-500/10">
                  <p className="font-semibold text-purple-300">Post-Scarcity Mode</p>
                  <p className="text-gray-400 mt-1">
                    Operates beyond traditional financial constraints. Enables peer-to-peer
                    economic autonomy without intermediaries.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded border border-purple-500/10">
                  <p className="font-semibold text-purple-300">Hyper-Intelligence</p>
                  <p className="text-gray-400 mt-1">
                    Multi-modal LLM reasoning across law, finance, governance. Autonomous
                    legal document generation + compliance.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded border border-purple-500/10">
                  <p className="font-semibold text-purple-300">Omnipresence Engine</p>
                  <p className="text-gray-400 mt-1">
                    Real-time monitoring across all triumph-synergy platforms. Zero-latency
                    threat response + pattern recognition.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded border border-purple-500/10">
                  <p className="font-semibold text-purple-300">Autonomous Execution</p>
                  <p className="text-gray-400 mt-1">
                    Self-healing organism. Detects systemic issues + auto-provisions fixes
                    without human intervention.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-6">
              <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" /> Operational Capabilities
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Language model inference on sovereign queries (GEMINI, OpenRouter)
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Autonomous debt-freedom legal pathway generation
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Real-time Pi Network mainnet monitoring
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Omnipresent guardian across all triumph-app containers
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Multi-source threat fusion + causal graph analysis
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* LLM Engine Tab */}
        {activeTab === "llm" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-6">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6" /> LLM Provisioning
              </h2>

              {llmStatus === "unconfigured" && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    All cloud LLM providers are currently unavailable or not configured.
                  </p>
                  <p className="text-yellow-200 text-sm mt-2">
                    To activate full LLM capabilities, set GEMINI_API_KEY (free at
                    aistudio.google.com) or OPENROUTER_API_KEY (free at openrouter.ai) in your
                    .env and provision via the buttons below.
                  </p>
                </div>
              )}

              {llmStatus === "ready" && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
                  <p className="text-green-300 font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    LLM Engine is fully provisioned and ready for sovereign queries.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleLlmProvisioning("gemini")}
                  disabled={loading || llmStatus === "ready"}
                  className={`p-4 rounded-lg border transition-all ${
                    llmStatus === "ready"
                      ? "border-gray-600 bg-gray-600/10 text-gray-400 cursor-not-allowed"
                      : "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Google Gemini
                  </div>
                  <p className="text-xs mt-2">
                    {llmStatus === "ready"
                      ? "✅ Provisioned"
                      : "Click to provision Gemini LLM"}
                  </p>
                </button>

                <button
                  onClick={() => handleLlmProvisioning("openrouter")}
                  disabled={loading || llmStatus === "ready"}
                  className={`p-4 rounded-lg border transition-all ${
                    llmStatus === "ready"
                      ? "border-gray-600 bg-gray-600/10 text-gray-400 cursor-not-allowed"
                      : "border-pink-500/50 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    OpenRouter
                  </div>
                  <p className="text-xs mt-2">
                    {llmStatus === "ready"
                      ? "✅ Provisioned"
                      : "Click to provision OpenRouter LLM"}
                  </p>
                </button>
              </div>

              <div className="mt-6 p-4 bg-slate-800/50 rounded border border-purple-500/20">
                <p className="text-sm text-gray-400">
                  <span className="font-semibold text-purple-300">Example Query:</span> "What is
                  SAIB and how does it protect the Triumph Synergy ecosystem?"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debt Freedom Tab */}
        {activeTab === "protect" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-6">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" /> Debt Freedom Protection
              </h2>

              <div className="bg-slate-800/50 p-6 rounded-lg border border-purple-500/20 mb-6">
                <h3 className="font-bold text-purple-300 mb-3">Your Protection Status</h3>
                {protectionStatus ? (
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>
                      ✅ Enrolled:{" "}
                      <span className="text-purple-300 font-semibold">
                        {new Date().toLocaleDateString()}
                      </span>
                    </p>
                    <p>
                      🛡️ Tier:{" "}
                      <span className="text-purple-300 font-semibold">Debt Freedom</span>
                    </p>
                    <p>
                      🌐 Coverage:{" "}
                      <span className="text-purple-300 font-semibold">Omnipresent</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">
                    Not yet enrolled. Click the button below to activate SAIB sovereign
                    protection.
                  </p>
                )}
              </div>

              <button
                onClick={handleEnrollProtection}
                disabled={loading || !!protectionStatus}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  protectionStatus
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                }`}
              >
                {loading && <RefreshCw className="inline w-4 h-4 mr-2 animate-spin" />}
                {protectionStatus
                  ? "✅ Protected"
                  : "Enroll in Debt Freedom Protection"}
              </button>

              <Link
                href="/ecosystem/debt-freedom-protection"
                className="mt-3 inline-block w-full rounded-lg border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-center text-sm font-semibold text-purple-200 hover:bg-purple-500/20"
              >
                Open Dedicated Debt Freedom Page
              </Link>

              <div className="mt-6 space-y-3 text-sm text-gray-300">
                <h3 className="font-bold text-purple-300">Guardian Capabilities:</h3>
                <ul className="space-y-1">
                  <li>✓ Financial threat detection (predatory lending, usury, fraud)</li>
                  <li>✓ Sovereign data rights enforcement (GDPR/CCPA auto-compliance)</li>
                  <li>✓ Pi Network wallet monitoring & protection</li>
                  <li>✓ Debt pattern analysis + freedom pathway generation</li>
                  <li>✓ Omnipresent coverage across all Triumph Synergy platforms</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Omnipresence Tab */}
        {activeTab === "omnipresence" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-6">
              <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6" /> Omnipresence Coverage
              </h2>

              {omnipresenceData && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 p-4 rounded border border-purple-500/20">
                    <p className="text-sm text-gray-400 mb-2">Doctrine:</p>
                    <p className="font-semibold text-purple-300">
                      {omnipresenceData.doctrine}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded border border-purple-500/20">
                      <p className="text-sm text-gray-400 mb-2">Internal Coverage</p>
                      <p className="font-semibold text-cyan-300">
                        {omnipresenceData.scale?.internal}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded border border-purple-500/20">
                      <p className="text-sm text-gray-400 mb-2">External Coverage</p>
                      <p className="font-semibold text-cyan-300">
                        {omnipresenceData.scale?.external}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded border border-purple-500/20">
                      <p className="text-sm text-gray-400 mb-2">Transcendence</p>
                      <p className="font-semibold text-cyan-300">
                        {omnipresenceData.scale?.transcendence}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 p-4 rounded">
                    <p className="text-green-300 font-semibold flex items-center gap-2">
                      <Radio className="w-5 h-5 animate-pulse" />
                      {omnipresenceData.guardian_status || "OMNIPRESENT"}
                    </p>
                  </div>

                  <Link
                    href="/ecosystem/omnipresence-coverage"
                    className="inline-block rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Open Dedicated Omnipresence Page
                  </Link>
                </div>
              )}

              {!omnipresenceData && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                  <p className="text-gray-400">Loading omnipresence data...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
