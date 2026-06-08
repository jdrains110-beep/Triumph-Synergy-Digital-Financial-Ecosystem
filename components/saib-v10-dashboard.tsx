"use client";

/**
 * SAIB v10 Dashboard
 * Sovereign Nano - Self-Evolving Intelligence
 * Community governance, autonomous mutations, Byzantine consensus
 */

import { useState } from "react";
import { Users, Vote, GitBranch, Shield, Zap, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

export function SAIBv10Dashboard() {
    const [selectedTab, setSelectedTab] = useState<"overview" | "governance" | "mutations" | "consensus">("overview");

    const metrics = {
        totalValidators: 2847,
        activeProposals: 12,
        totalMutations: 47,
        mutationSuccessRate: 96.8,
        consensusHealth: 98.5,
        merchantCount: 324,
        totalVolume: 2.8,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900 p-6">
            {/* Header */}
            <div className="mb-8 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                            🧬 SAIB v10 Sovereign Nano
                        </h1>
                        <p className="text-gray-400 mt-2">Self-Evolving Intelligence - Autonomous Mutations + Community Governance + BFT Consensus</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-semibold">
                            ● LIVE
                        </span>
                        <span className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-300 font-semibold">
                            v10 Operational
                        </span>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <V10MetricCard
                    icon={<Users className="h-6 w-6" />}
                    title="Active Validators"
                    value={metrics.totalValidators.toLocaleString()}
                    description="Byzantine consensus network"
                    status="excellent"
                    trend="Target: 10K"
                />
                <V10MetricCard
                    icon={<Vote className="h-6 w-6" />}
                    title="Active Proposals"
                    value={metrics.activeProposals}
                    description="Community voting"
                    status="good"
                    trend="Vote now"
                />
                <V10MetricCard
                    icon={<GitBranch className="h-6 w-6" />}
                    title="Safe Mutations"
                    value={metrics.totalMutations}
                    description="Auto-improvements generated"
                    status="excellent"
                    trend={`${metrics.mutationSuccessRate}% success rate`}
                />
                <V10MetricCard
                    icon={<Shield className="h-6 w-6" />}
                    title="Consensus Health"
                    value={`${metrics.consensusHealth}%`}
                    description="BFT network strength"
                    status="excellent"
                    trend="0 failures"
                />
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-purple-500/20">
                {(["overview", "governance", "mutations", "consensus"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`px-6 py-3 font-semibold transition-colors capitalize ${selectedTab === tab
                                ? "border-b-2 border-purple-400 text-purple-400"
                                : "text-gray-400 hover:text-gray-300"
                            }`}
                    >
                        {tab === "overview" && "📊 Overview"}
                        {tab === "governance" && "🗳️ Governance"}
                        {tab === "mutations" && "🧬 Mutations"}
                        {tab === "consensus" && "🛡️ Consensus"}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {selectedTab === "overview" && <V10OverviewTab metrics={metrics} />}
            {selectedTab === "governance" && <GovernanceTab />}
            {selectedTab === "mutations" && <MutationsTab metrics={metrics} />}
            {selectedTab === "consensus" && <ConsensusTab metrics={metrics} />}

            {/* Architecture Footer */}
            <div className="mt-12 rounded-2xl border border-purple-500/20 bg-black/40 p-8">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">🏗️ v10 Architecture</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <ArchCardV10 title="Meta-Builder" desc="Auto-generates mutations" icon="🤖" />
                    <ArchCardV10 title="Version Controller" desc="Immutable snapshots" icon="📦" />
                    <ArchCardV10 title="Proposal Engine" desc="Community voting" icon="🗳️" />
                    <ArchCardV10 title="Witness Network" desc="BFT consensus" icon="🛡️" />
                    <ArchCardV10 title="PI SDK" desc="One-click integration" icon="🔗" />
                </div>
            </div>
        </div>
    );
}

function V10MetricCard({
    icon,
    title,
    value,
    description,
    status,
    trend,
}: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    description: string;
    status: "excellent" | "good" | "fair";
    trend: string;
}) {
    const statusColors = {
        excellent: "from-green-900/40 to-emerald-900/40 border-green-500/30",
        good: "from-blue-900/40 to-cyan-900/40 border-blue-500/30",
        fair: "from-yellow-900/40 to-amber-900/40 border-yellow-500/30",
    };

    const iconColors = {
        excellent: "text-green-400",
        good: "text-blue-400",
        fair: "text-yellow-400",
    };

    return (
        <div className={`rounded-xl border bg-gradient-to-br ${statusColors[status]} p-6`}>
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 ${iconColors[status]}`}>
                {icon}
            </div>
            <p className="text-sm text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white mb-2">{value}</p>
            <p className="text-xs text-gray-500 mb-2">{description}</p>
            <p className={`text-xs font-semibold ${iconColors[status]}`}>{trend}</p>
        </div>
    );
}

function ArchCardV10({ title, desc, icon }: { title: string; desc: string; icon: string }) {
    return (
        <div className="rounded-lg border border-purple-500/20 bg-black/40 p-4 hover:border-purple-400/60 transition-colors">
            <p className="text-2xl mb-2">{icon}</p>
            <p className="font-semibold text-purple-400 text-sm">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
        </div>
    );
}

function V10OverviewTab({ metrics }: { metrics: typeof metrics }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-purple-500/20 bg-black/40 p-6">
                    <h3 className="text-lg font-bold text-purple-400 mb-4">🧠 Self-Evolution Status</h3>
                    <div className="space-y-3">
                        <StatusItem label="Mutation Cycle" status="Active" icon="🔄" />
                        <StatusItem label="Latest Release" status="v10.3.2" icon="📦" />
                        <StatusItem label="Consensus Status" status="Healthy" icon="✓" />
                        <StatusItem label="Validator Network" status={`${metrics.totalValidators} active`} icon="👥" />
                    </div>
                </div>

                <div className="rounded-xl border border-pink-500/20 bg-pink-900/20 p-6">
                    <h3 className="text-lg font-bold text-pink-400 mb-4">📈 Ecosystem Metrics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-pink-500/10">
                            <span className="text-gray-400">Integrated Merchants</span>
                            <span className="text-pink-400 font-bold">{metrics.merchantCount}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-pink-500/10">
                            <span className="text-gray-400">Total Volume (M)</span>
                            <span className="text-pink-400 font-bold">${metrics.totalVolume.toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-pink-500/10">
                            <span className="text-gray-400">Growth This Month</span>
                            <span className="text-green-400 font-bold">+24%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Immutable Core</span>
                            <span className="text-purple-400 font-bold">Protected</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-green-500/20 bg-green-900/20 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <h3 className="text-lg font-bold text-green-400">✅ System Status: OPTIMAL</h3>
                </div>
                <p className="text-gray-300">
                    All v10 components operational. Community governance active. 2,847 validators maintaining Byzantine consensus. Self-evolution cycle running smoothly with 96.8% mutation success rate.
                </p>
            </div>
        </div>
    );
}

function StatusItem({ label, status, icon }: { label: string; status: string; icon: string }) {
    return (
        <div className="flex justify-between items-center pb-2 border-b border-purple-500/10">
            <span className="text-gray-400">{icon} {label}</span>
            <span className="text-white font-semibold">{status}</span>
        </div>
    );
}

function GovernanceTab() {
    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-purple-500/20 bg-black/40 p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">🗳️ Active Proposals</h3>
                <div className="space-y-3">
                    <ProposalCard
                        title="Performance Optimization v10.4"
                        description="Reduce latency by 15% through distributed caching"
                        votes={{ yes: 847, no: 43, abstain: 12 }}
                        timeLeft="2 days"
                        status="voting"
                    />
                    <ProposalCard
                        title="New Merchant Feature: Deed Batching"
                        description="Allow merchants to batch-process multiple deeds"
                        votes={{ yes: 623, no: 8, abstain: 5 }}
                        timeLeft="5 hours"
                        status="voting"
                    />
                    <ProposalCard
                        title="Validator Reward Adjustment"
                        description="Increase rewards for high-performance validators"
                        votes={{ yes: 1250, no: 145, abstain: 87 }}
                        timeLeft="1 hour"
                        status="voting"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-900/20 p-6">
                <h3 className="text-lg font-bold text-cyan-400 mb-4">🔒 Immutable Core (Cannot be Voted On)</h3>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        <span className="text-cyan-400">🔐</span>
                        <span className="text-gray-300">quantum_builder - Core quantum infrastructure</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-cyan-400">🔐</span>
                        <span className="text-gray-300">meta_builder - Autonomous mutation engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-cyan-400">🔐</span>
                        <span className="text-gray-300">gcv_peg_enforcement - GCV stability mechanism</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-cyan-400">🔐</span>
                        <span className="text-gray-300">witness_network_core - Byzantine consensus foundation</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

function ProposalCard({
    title,
    description,
    votes,
    timeLeft,
    status,
}: {
    title: string;
    description: string;
    votes: { yes: number; no: number; abstain: number };
    timeLeft: string;
    status: "voting" | "passed" | "failed";
}) {
    const totalVotes = votes.yes + votes.no + votes.abstain;
    const yesPercentage = (votes.yes / totalVotes) * 100;

    return (
        <div className="rounded-lg border border-purple-500/20 bg-black/40 p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-sm text-gray-400 mt-1">{description}</p>
                </div>
                <span className="px-3 py-1 rounded text-xs font-semibold bg-purple-500/30 text-purple-300">{timeLeft}</span>
            </div>

            <div className="mb-3">
                <div className="flex gap-2 mb-1 text-xs">
                    <span className="text-green-400">Yes: {votes.yes}</span>
                    <span className="text-red-400">No: {votes.no}</span>
                    <span className="text-gray-400">Abstain: {votes.abstain}</span>
                </div>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden flex">
                    <div className="bg-green-500" style={{ width: `${yesPercentage}%` }} />
                    <div className="bg-red-500" style={{ width: `${((votes.no / totalVotes) * 100)}%` }} />
                    <div className="bg-gray-500" style={{ width: `${((votes.abstain / totalVotes) * 100)}%` }} />
                </div>
            </div>
        </div>
    );
}

function MutationsTab({ metrics }: { metrics: typeof metrics }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-purple-500/20 bg-purple-900/20 p-6">
                    <div className="text-3xl mb-2">🧬</div>
                    <h3 className="text-lg font-bold text-purple-400 mb-4">Safe Mutations Generated</h3>
                    <div className="text-4xl font-bold text-white mb-2">{metrics.totalMutations}</div>
                    <p className="text-xs text-gray-500">This month</p>
                </div>

                <div className="rounded-xl border border-green-500/20 bg-green-900/20 p-6">
                    <div className="text-3xl mb-2">✅</div>
                    <h3 className="text-lg font-bold text-green-400 mb-4">Success Rate</h3>
                    <div className="text-4xl font-bold text-white mb-2">{metrics.mutationSuccessRate}%</div>
                    <p className="text-xs text-gray-500">All mutations auto-tested</p>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-900/20 p-6">
                    <div className="text-3xl mb-2">📅</div>
                    <h3 className="text-lg font-bold text-blue-400 mb-4">Cycle Frequency</h3>
                    <div className="text-4xl font-bold text-white mb-2">Weekly</div>
                    <p className="text-xs text-gray-500">Automated schedule</p>
                </div>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-black/40 p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">🔄 Recent Mutations</h3>
                <div className="space-y-3">
                    <MutationItem
                        title="Cache Optimization"
                        pr="PR #4521"
                        risk="12%"
                        status="merged"
                        impact="↓ 18% latency"
                    />
                    <MutationItem
                        title="API Rate Limiting Improvement"
                        pr="PR #4519"
                        risk="8%"
                        status="merged"
                        impact="↑ Stability"
                    />
                    <MutationItem
                        title="Database Query Tuning"
                        pr="PR #4517"
                        risk="6%"
                        status="merged"
                        impact="↓ 22% query time"
                    />
                    <MutationItem
                        title="Memory Pool Efficiency"
                        pr="PR #4515"
                        risk="15%"
                        status="pending_review"
                        impact="Awaiting tests"
                    />
                </div>
            </div>
        </div>
    );
}

function MutationItem({
    title,
    pr,
    risk,
    status,
    impact,
}: {
    title: string;
    pr: string;
    risk: string;
    status: "merged" | "pending_review" | "failed";
    impact: string;
}) {
    const statusColors = {
        merged: "bg-green-500/20 text-green-400",
        pending_review: "bg-yellow-500/20 text-yellow-400",
        failed: "bg-red-500/20 text-red-400",
    };

    const statusLabel = {
        merged: "✓ Merged",
        pending_review: "⏳ Pending",
        failed: "✗ Failed",
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-purple-500/10 bg-black/20">
            <div className="flex-1">
                <p className="font-semibold text-white">{title}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{pr}</span>
                    <span>Risk: {risk}</span>
                </div>
            </div>
            <div className="text-right">
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-1 ${statusColors[status]}`}>
                    {statusLabel[status]}
                </span>
                <p className="text-xs text-gray-400">{impact}</p>
            </div>
        </div>
    );
}

function ConsensusTab({ metrics }: { metrics: typeof metrics }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-900/20 p-6">
                    <h3 className="text-lg font-bold text-cyan-400 mb-4">🛡️ Byzantine Fault Tolerance</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/10">
                            <span className="text-gray-400">Total Validators</span>
                            <span className="text-cyan-400 font-bold">{metrics.totalValidators}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/10">
                            <span className="text-gray-400">Faulty Tolerance (f)</span>
                            <span className="text-cyan-400 font-bold">{Math.floor(metrics.totalValidators / 4)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-cyan-500/10">
                            <span className="text-gray-400">Required Signatures</span>
                            <span className="text-cyan-400 font-bold">{Math.floor((metrics.totalValidators * 2) / 3) + 1}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Network Security</span>
                            <span className="text-green-400 font-bold">Optimal</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-900/20 p-6">
                    <h3 className="text-lg font-bold text-indigo-400 mb-4">🤝 Consensus Metrics</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-indigo-500/10">
                            <span className="text-gray-400">Consensus Health</span>
                            <span className="text-indigo-400 font-bold">{metrics.consensusHealth}%</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-indigo-500/10">
                            <span className="text-gray-400">Consensus Timeout</span>
                            <span className="text-indigo-400 font-bold">10 seconds</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-indigo-500/10">
                            <span className="text-gray-400">Avg Block Time</span>
                            <span className="text-indigo-400 font-bold">2.3 seconds</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Failed Blocks</span>
                            <span className="text-green-400 font-bold">0</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-black/40 p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">📋 Recent Consensus Decisions</h3>
                <div className="space-y-3">
                    <ConsensusDecision
                        description="Approved: v10.3.2 deployment to mainnet"
                        signatures="2,124 / 2,232"
                        timestamp="2 hours ago"
                    />
                    <ConsensusDecision
                        description="Approved: Increase validator rewards 5%"
                        signatures="1,987 / 2,232"
                        timestamp="6 hours ago"
                    />
                    <ConsensusDecision
                        description="Approved: New merchant KYC policy"
                        signatures="2,156 / 2,232"
                        timestamp="12 hours ago"
                    />
                    <ConsensusDecision
                        description="Approved: GCV stability mechanism tuning"
                        signatures="2,089 / 2,232"
                        timestamp="1 day ago"
                    />
                </div>
            </div>
        </div>
    );
}

function ConsensusDecision({
    description,
    signatures,
    timestamp,
}: {
    description: string;
    signatures: string;
    timestamp: string;
}) {
    return (
        <div className="flex items-start justify-between p-3 rounded-lg border border-purple-500/10 bg-black/20">
            <div>
                <p className="font-semibold text-white">{description}</p>
                <p className="text-xs text-gray-500 mt-1">{signatures} signatures • {timestamp}</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        </div>
    );
}
