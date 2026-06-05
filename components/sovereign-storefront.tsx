"use client";
/**
 * Triumph Synergy — Sovereign Storefront
 * Universal interactive storefront for all 22 .pi web3 domains.
 *
 * Mainnet mode:  real Pi payments via Pi Browser SDK
 * Testnet mode:  test Pi payments via Pi Browser testnet — real flow, test network
 *
 * Pioneer & non-pioneer access. Loyalty rewards, cart, products, loopholes.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    SovereignTenant,
    GCV,
    NetworkMode,
    ProductItem,
    formatPi,
    formatUsd,
    piToUsd,
} from "@/lib/sovereign-tenants";

// ─── Cart types ────────────────────────────────────────────────────────────────
interface CartItem {
    product: ProductItem;
    qty: number;
}

// ─── Pi Browser SDK types ──────────────────────────────────────────────────────
declare global {
    interface Window {
        Pi?: {
            init: (opts: { version: string; sandbox?: boolean }) => void;
            authenticate: (
                scopes: string[],
                onIncompletePaymentFound: (payment: unknown) => void
            ) => Promise<{ accessToken: string; user: { uid: string; username: string } }>;
            createPayment: (
                data: {
                    amount: number;
                    memo: string;
                    metadata: Record<string, unknown>;
                },
                callbacks: {
                    onReadyForServerApproval: (paymentId: string) => void;
                    onReadyForServerCompletion: (paymentId: string, txid: string) => void;
                    onCancel: (paymentId: string) => void;
                    onError: (error: Error, payment: unknown) => void;
                }
            ) => void;
        };
    }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface SovereignStorefrontProps {
    tenant: SovereignTenant;
    network: NetworkMode;
}

export default function SovereignStorefront({
    tenant,
    network,
}: SovereignStorefrontProps) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeTab, setActiveTab] = useState<
        "store" | "services" | "loopholes" | "loyalty"
    >("store");
    const [piUser, setPiUser] = useState<{
        uid: string;
        username: string;
    } | null>(null);
    const [payStatus, setPayStatus] = useState<{
        status: "idle" | "pending" | "approved" | "completed" | "cancelled" | "error";
        message: string;
        txid?: string;
    }>({ status: "idle", message: "" });
    const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
    const [sdkReady, setSdkReady] = useState(false);
    const [expandedLoophole, setExpandedLoophole] = useState<number | null>(null);
    const [expandedService, setExpandedService] = useState<string | null>(null);

    const isTestnet = network === "testnet";
    const piSymbol = isTestnet ? "tπ" : "π";
    const networkLabel = isTestnet ? "Testnet" : "Mainnet";
    const networkColor = isTestnet
        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

    // ── Init Pi SDK ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://sdk.minepi.com/pi-sdk.js";
        script.async = true;
        script.onload = () => {
            try {
                window.Pi?.init({ version: "2.0", sandbox: isTestnet });
                setSdkReady(true);
            } catch {
                setSdkReady(false);
            }
        };
        document.head.appendChild(script);
        return () => {
            document.head.removeChild(script);
        };
    }, [isTestnet]);

    // ── Authenticate pioneer ────────────────────────────────────────────────────
    const authenticatePi = useCallback(async () => {
        if (!window.Pi) {
            setPayStatus({
                status: "error",
                message: isTestnet
                    ? "Open in Pi Browser (testnet) to authenticate."
                    : "Open in Pi Browser to authenticate.",
            });
            return;
        }
        try {
            const auth = await window.Pi.authenticate(
                ["username", "payments"],
                (incompletePay) => {
                    console.warn("[Sovereign] Incomplete payment found:", incompletePay);
                }
            );
            setPiUser(auth.user);
            // Simulate loading on-chain loyalty balance
            setLoyaltyBalance(+(Math.random() * 0.05).toFixed(6));
        } catch (err) {
            setPayStatus({
                status: "error",
                message: `Auth failed: ${(err as Error).message}`,
            });
        }
    }, [isTestnet]);

    // ── Cart helpers ────────────────────────────────────────────────────────────
    const addToCart = useCallback((product: ProductItem) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.product.id === product.id);
            if (existing) {
                return prev.map((c) =>
                    c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
                );
            }
            return [...prev, { product, qty: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart((prev) =>
            prev
                .map((c) =>
                    c.product.id === productId ? { ...c, qty: c.qty - 1 } : c
                )
                .filter((c) => c.qty > 0)
        );
    }, []);

    const cartTotal = cart.reduce(
        (sum, c) =>
            sum +
            (isTestnet ? c.product.testPiPrice : c.product.piPrice) * c.qty,
        0
    );
    const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

    // ── Checkout ────────────────────────────────────────────────────────────────
    const checkout = useCallback(async () => {
        if (cartTotal <= 0) return;
        if (!window.Pi) {
            setPayStatus({
                status: "error",
                message: isTestnet
                    ? "Open in Pi Browser (testnet mode) to pay with test Pi."
                    : "Open in Pi Browser to pay with Pi.",
            });
            return;
        }
        if (!piUser) {
            await authenticatePi();
            return;
        }

        setPayStatus({ status: "pending", message: `Processing ${piSymbol} payment…` });

        const memo = `${tenant.sovereignName} — ${cartCount} item(s) @ GCV $${GCV.toLocaleString()}/π`;
        const metadata = {
            tenant: tenant.slug,
            domain: tenant.domain,
            network,
            items: cart.map((c) => ({
                id: c.product.id,
                name: c.product.name,
                qty: c.qty,
                pi: isTestnet ? c.product.testPiPrice : c.product.piPrice,
            })),
            gcv: GCV,
            usd_total: piToUsd(cartTotal),
        };

        window.Pi.createPayment(
            { amount: cartTotal, memo, metadata },
            {
                onReadyForServerApproval: (paymentId) => {
                    setPayStatus({
                        status: "approved",
                        message: `Payment approved — ID: ${paymentId.slice(0, 16)}…`,
                    });
                    // POST to sovereign settlement API
                    fetch("/api/pi_payment/approve", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            paymentId,
                            amount: cartTotal,
                            tenant: tenant.slug,
                            network,
                        }),
                    }).catch(console.error);
                },
                onReadyForServerCompletion: (paymentId, txid) => {
                    setPayStatus({
                        status: "completed",
                        message: `✓ Settled on ${isTestnet ? "testnet" : "mainnet"} ledger — Ref: ${txid.slice(0, 16)}…`,
                        txid,
                    });
                    fetch("/api/pi_payment/complete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paymentId, txid }),
                    }).catch(console.error);
                    // Earn loyalty Pi-back
                    const earned = +(cartTotal * (tenant.loyaltyPiback / 100)).toFixed(8);
                    setLoyaltyBalance((prev) => +(prev + earned).toFixed(8));
                    setCart([]);
                },
                onCancel: (paymentId) => {
                    setPayStatus({
                        status: "cancelled",
                        message: `Payment cancelled — ID: ${paymentId.slice(0, 16)}…`,
                    });
                },
                onError: (error) => {
                    setPayStatus({
                        status: "error",
                        message: `Payment error: ${error.message}`,
                    });
                },
            }
        );
    }, [
        cart,
        cartTotal,
        cartCount,
        isTestnet,
        network,
        piSymbol,
        piUser,
        tenant,
        authenticatePi,
    ]);

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            {/* ── Header ── */}
            <header
                className={`border-b ${tenant.borderColor} bg-gradient-to-r ${tenant.color} px-4 py-5`}
            >
                <div className="max-w-6xl mx-auto">
                    {/* Top row */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-4xl">{tenant.icon}</span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-extrabold text-white">
                                        {tenant.sovereignName}
                                    </h1>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${networkColor}`}
                                    >
                                        {networkLabel}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/20 text-purple-300 font-semibold">
                                        SOVEREIGN ESTATE
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/20 text-yellow-300 font-mono">
                                        {tenant.domain}
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm max-w-xl">
                                    {tenant.tagline}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Formerly{" "}
                                    <span className="text-gray-300 font-medium">
                                        {tenant.brandName}
                                    </span>{" "}
                                    · Triumph Synergy Sovereign · Founder: Jeremiah Joel Drains ·{" "}
                                    {tenant.ownershipModel}
                                </p>
                            </div>
                        </div>

                        {/* GCV + Cart block */}
                        <div className="flex gap-3 flex-shrink-0">
                            {/* GCV badge */}
                            <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-3 text-center min-w-[130px]">
                                <div className="text-xs text-gray-400 mb-0.5">
                                    {isTestnet ? "Test Pi Rate" : "GCV Rate"}
                                </div>
                                <div className="text-lg font-bold text-yellow-300">
                                    $314,159/{piSymbol}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {isTestnet ? "testnet simulation" : "sovereign GCV"}
                                </div>
                            </div>

                            {/* Cart */}
                            {cartCount > 0 && (
                                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center min-w-[120px]">
                                    <div className="text-xs text-gray-400 mb-0.5">Cart</div>
                                    <div className="text-lg font-bold text-white">
                                        {formatPi(cartTotal, network)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {cartCount} item{cartCount !== 1 ? "s" : ""}
                                    </div>
                                    <button
                                        onClick={checkout}
                                        className="mt-2 w-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                                    >
                                        {piUser
                                            ? `Pay ${piSymbol}`
                                            : `Sign In & Pay ${piSymbol}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                        {tenant.stats.map(({ label, value, color }) => (
                            <div
                                key={label}
                                className="bg-black/30 border border-white/5 rounded-xl p-2.5 text-center"
                            >
                                <div className={`text-xl font-bold ${color}`}>{value}</div>
                                <div className="text-xs text-gray-400">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Token record */}
                    <div className="mt-3 bg-black/30 rounded-xl px-3 py-2 text-xs font-mono text-gray-500 border border-white/5 flex flex-wrap gap-3">
                        <span>
                            <span className="text-purple-400">Token:</span>{" "}
                            {tenant.tokenId.slice(0, 24)}…
                        </span>
                        <span>
                            <span className="text-emerald-400">Ledger:</span>{" "}
                            {tenant.stellarLedger.toLocaleString()}
                        </span>
                        <span className="text-yellow-400">APEX-QUANTUM-SOVEREIGN</span>
                    </div>

                    {/* Pi user bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        {piUser ? (
                            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-300 font-medium">
                                    @{piUser.username}
                                </span>
                                <span className="text-gray-400 text-xs">
                                    · {networkLabel} Pioneer
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={authenticatePi}
                                disabled={!sdkReady}
                                className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5 text-sm text-yellow-300 hover:bg-yellow-500/20 transition-colors disabled:opacity-40"
                            >
                                <span>π</span>
                                <span>Sign In with Pi</span>
                                {isTestnet && (
                                    <span className="text-xs text-gray-400">(testnet)</span>
                                )}
                            </button>
                        )}
                        {piUser && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                <span className="text-yellow-300 font-medium">
                                    {formatPi(loyaltyBalance, network)}
                                </span>
                                <span>{tenant.loyaltyName}</span>
                                <span className="text-xs text-emerald-400">
                                    +{tenant.loyaltyPiback}% back
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Testnet banner */}
                    {isTestnet && (
                        <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2.5 text-sm text-yellow-200 flex items-start gap-2">
                            <span className="text-lg flex-shrink-0">🧪</span>
                            <div>
                                <span className="font-bold">Testnet Mode — Test Pi Active.</span>{" "}
                                Payments use <strong>test Pi</strong> through Pi Browser testnet.
                                Same flow as mainnet — real SDK, real settlement calls, real ledger recording on testnet. Test Pi cannot be exchanged for value. Switch to mainnet for live GCV transactions.
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="border-b border-white/10 bg-gray-900/50 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 flex gap-0 overflow-x-auto">
                    {(
                        [
                            { key: "store", label: "🛒 Store", count: tenant.products.length },
                            { key: "services", label: "⚡ Services", count: tenant.services.length },
                            { key: "loopholes", label: "⚖️ Pi Loopholes", count: tenant.loopholes.length },
                            { key: "loyalty", label: "🏆 Loyalty", count: null },
                        ] as const
                    ).map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === key
                                    ? `border-yellow-400 text-yellow-300`
                                    : "border-transparent text-gray-400 hover:text-gray-200"
                                }`}
                        >
                            {label}
                            {count !== null && (
                                <span className="ml-1.5 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 py-6">

                {/* ── Pay status ── */}
                {payStatus.status !== "idle" && (
                    <div
                        className={`mb-4 rounded-xl px-4 py-3 text-sm border flex items-start gap-2 ${payStatus.status === "completed"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                : payStatus.status === "error" || payStatus.status === "cancelled"
                                    ? "bg-red-500/10 border-red-500/30 text-red-200"
                                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
                            }`}
                    >
                        <span className="text-lg flex-shrink-0">
                            {payStatus.status === "completed"
                                ? "✅"
                                : payStatus.status === "pending" || payStatus.status === "approved"
                                    ? "⏳"
                                    : "❌"}
                        </span>
                        <div>
                            <div className="font-medium">{payStatus.message}</div>
                            {payStatus.txid && (
                                <div className="text-xs text-gray-400 mt-0.5 font-mono">
                                    Tx: {payStatus.txid}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setPayStatus({ status: "idle", message: "" })}
                            className="ml-auto text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ══ STORE TAB ══════════════════════════════════════════════════════ */}
                {activeTab === "store" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">
                                {tenant.sovereignName} — Sovereign Product Catalog
                            </h2>
                            {cartCount > 0 && (
                                <button
                                    onClick={checkout}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    Checkout · {formatPi(cartTotal, network)}
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tenant.products.map((product) => {
                                const price = isTestnet
                                    ? product.testPiPrice
                                    : product.piPrice;
                                const inCart = cart.find((c) => c.product.id === product.id);

                                return (
                                    <div
                                        key={product.id}
                                        className={`relative bg-gray-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all hover:border-white/20 ${product.popular
                                                ? `${tenant.borderColor} shadow-lg`
                                                : "border-white/8"
                                            }`}
                                    >
                                        {product.popular && (
                                            <div
                                                className={`absolute -top-2 right-4 text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-black font-bold`}
                                            >
                                                Pioneer Fav
                                            </div>
                                        )}

                                        <div className="flex items-start gap-3">
                                            <span className="text-3xl">{product.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-white text-sm">
                                                    {product.name}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {product.description}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {product.category}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <div className={`${tenant.accentColor} font-bold text-lg`}>
                                                {piSymbol} {price.toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 6,
                                                })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                ≈ {formatUsd(piToUsd(price))} USD at GCV
                                            </div>

                                            <div className="flex gap-2 mt-2">
                                                {inCart ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <button
                                                            onClick={() => removeFromCart(product.id)}
                                                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="text-white font-bold">
                                                            {inCart.qty}
                                                        </span>
                                                        <button
                                                            onClick={() => addToCart(product)}
                                                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => addToCart(product)}
                                                        className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setCart([{ product, qty: 1 }]);
                                                        checkout();
                                                    }}
                                                    className="flex-1 bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Buy {piSymbol}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Cart summary */}
                        {cart.length > 0 && (
                            <div className="mt-6 bg-gray-900 border border-white/10 rounded-2xl p-4">
                                <h3 className="font-bold text-white mb-3">
                                    🛒 Cart Summary
                                </h3>
                                <div className="space-y-2">
                                    {cart.map(({ product, qty }) => {
                                        const price = isTestnet
                                            ? product.testPiPrice
                                            : product.piPrice;
                                        return (
                                            <div
                                                key={product.id}
                                                className="flex items-center justify-between text-sm"
                                            >
                                                <span className="text-gray-300">
                                                    {product.emoji} {product.name} × {qty}
                                                </span>
                                                <span className={`font-medium ${tenant.accentColor}`}>
                                                    {formatPi(price * qty, network)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-white font-bold">
                                            Total: {formatPi(cartTotal, network)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            ≈ {formatUsd(piToUsd(cartTotal))} at GCV
                                        </div>
                                        <div className="text-xs text-emerald-400 mt-0.5">
                                            Earn{" "}
                                            {formatPi(
                                                +(cartTotal * (tenant.loyaltyPiback / 100)).toFixed(8),
                                                network
                                            )}{" "}
                                            {tenant.loyaltyName} (+{tenant.loyaltyPiback}% back)
                                        </div>
                                    </div>
                                    <button
                                        onClick={checkout}
                                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
                                    >
                                        {piUser ? `Pay with ${piSymbol}` : `Sign In & Pay`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ SERVICES TAB ═══════════════════════════════════════════════════ */}
                {activeTab === "services" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-white">
                            Sovereign Services — {tenant.sovereignName}
                        </h2>
                        {tenant.services.map((service) => (
                            <div
                                key={service.id}
                                className={`bg-gray-900 border rounded-2xl overflow-hidden ${expandedService === service.id
                                        ? tenant.borderColor
                                        : "border-white/8"
                                    }`}
                            >
                                <button
                                    className="w-full text-left px-5 py-4 flex items-center justify-between"
                                    onClick={() =>
                                        setExpandedService(
                                            expandedService === service.id ? null : service.id
                                        )
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{service.icon}</span>
                                        <div>
                                            <div className="font-semibold text-white">
                                                {service.title}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                From {service.priceFrom.replace("π", piSymbol)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">
                                        {expandedService === service.id ? "▲" : "▼"}
                                    </span>
                                </button>

                                {expandedService === service.id && (
                                    <div className="px-5 pb-5 border-t border-white/8 pt-4 space-y-4">
                                        <p className="text-gray-300 text-sm">{service.description}</p>

                                        {/* Rival vs Sovereign */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                                                <div className="text-xs text-red-400 font-semibold mb-1">
                                                    ✗ Traditional ({service.rival})
                                                </div>
                                                <div className="text-sm text-gray-300">
                                                    {service.rivalFee}
                                                </div>
                                            </div>
                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                                                <div className="text-xs text-emerald-400 font-semibold mb-1">
                                                    ✓ Sovereign ({piSymbol} Settlement)
                                                </div>
                                                <div className="text-sm text-gray-300">
                                                    {service.sovereignFee.replace("π", piSymbol)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Highlights */}
                                        <div className="flex flex-wrap gap-2">
                                            {service.highlights.map((h) => (
                                                <span
                                                    key={h}
                                                    className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-gray-300"
                                                >
                                                    ✓ {h}
                                                </span>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setActiveTab("store");
                                                setPayStatus({ status: "idle", message: "" });
                                            }}
                                            className="bg-yellow-500/90 hover:bg-yellow-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-colors"
                                        >
                                            Book / Buy with {piSymbol}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ══ LOOPHOLES TAB ══════════════════════════════════════════════════ */}
                {activeTab === "loopholes" && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-white">
                                ⚖️ Pi Sovereign Loopholes — {tenant.sovereignName}
                            </h2>
                            <span className="text-xs text-gray-400">
                                {tenant.loopholes.length} legal instruments active
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Legal frameworks, regulatory exemptions, and sovereign commerce principles
                            that give {tenant.sovereignName} structural advantages over traditional
                            corporate operations.
                        </p>
                        {tenant.loopholes.map((lh, i) => (
                            <div
                                key={i}
                                className={`bg-gray-900 border rounded-2xl overflow-hidden ${expandedLoophole === i
                                        ? "border-purple-500/40"
                                        : "border-white/8"
                                    }`}
                            >
                                <button
                                    className="w-full text-left px-5 py-4 flex items-center justify-between"
                                    onClick={() =>
                                        setExpandedLoophole(expandedLoophole === i ? null : i)
                                    }
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Score */}
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${lh.score >= 90
                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                    : lh.score >= 80
                                                        ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                                        : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                                }`}
                                        >
                                            {lh.score}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-white text-sm truncate">
                                                {lh.title}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {lh.cite}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 ml-3 flex-shrink-0">
                                        {expandedLoophole === i ? "▲" : "▼"}
                                    </span>
                                </button>

                                {expandedLoophole === i && (
                                    <div className="px-5 pb-4 border-t border-white/8 pt-4">
                                        <div className="text-xs font-mono text-purple-300 mb-2">
                                            {lh.cite}
                                        </div>
                                        <p className="text-sm text-gray-300">{lh.effect}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="flex-1 bg-white/5 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${lh.score >= 90
                                                            ? "bg-emerald-400"
                                                            : lh.score >= 80
                                                                ? "bg-yellow-400"
                                                                : "bg-orange-400"
                                                        }`}
                                                    style={{ width: `${lh.score}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                Sovereign strength: {lh.score}/100
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ══ LOYALTY TAB ════════════════════════════════════════════════════ */}
                {activeTab === "loyalty" && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-white">
                            🏆 {tenant.loyaltyName}
                        </h2>

                        {/* Balance card */}
                        <div
                            className={`bg-gradient-to-r ${tenant.color} border ${tenant.borderColor} rounded-2xl p-5`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <div className="text-sm text-gray-400 mb-1">
                                        Your {networkLabel} Balance
                                    </div>
                                    <div className="text-3xl font-extrabold text-white">
                                        {formatPi(loyaltyBalance, network)}
                                    </div>
                                    <div className="text-sm text-gray-300 mt-1">
                                        ≈ {formatUsd(piToUsd(loyaltyBalance))} at GCV
                                    </div>
                                    {!piUser && (
                                        <button
                                            onClick={authenticatePi}
                                            className="mt-3 text-sm bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-4 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-colors"
                                        >
                                            Sign In to Load Balance
                                        </button>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className={`text-4xl font-extrabold ${tenant.accentColor}`}>
                                        +{tenant.loyaltyPiback}%
                                    </div>
                                    <div className="text-sm text-gray-400">Pi-back on every purchase</div>
                                </div>
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="bg-gray-900 border border-white/8 rounded-2xl p-5 space-y-3">
                            <h3 className="font-bold text-white">How {tenant.loyaltyName} Works</h3>
                            {[
                                {
                                    step: "1",
                                    title: "Shop with Pi",
                                    desc: `Buy any product or service on ${tenant.domain} using ${isTestnet ? "test Pi" : "Pi"}.`,
                                    icon: "🛒",
                                },
                                {
                                    step: "2",
                                    title: `Earn ${tenant.loyaltyPiback}% Pi-Back`,
                                    desc: `${tenant.loyaltyPiback}% of every purchase credited as ${piSymbol} instantly on settlement.`,
                                    icon: "⚡",
                                },
                                {
                                    step: "3",
                                    title: "On-Chain — Never Expires",
                                    desc: "Rewards are real Pi tokens on the Stellar ledger. No expiry, no blackout dates, fully portable.",
                                    icon: "🔗",
                                },
                                {
                                    step: "4",
                                    title: "Ecosystem-Wide Redemption",
                                    desc: "Redeem across all 22 Triumph Synergy sovereign .pi domains. One loyalty pool, all storefronts.",
                                    icon: "🌐",
                                },
                            ].map(({ step, title, desc, icon }) => (
                                <div key={step} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {step}
                                    </div>
                                    <div>
                                        <div className="font-medium text-white text-sm">
                                            {icon} {title}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Ecosystem domains */}
                        <div className="bg-gray-900 border border-white/8 rounded-2xl p-5">
                            <h3 className="font-bold text-white mb-3">
                                Redeem Across 22 Sovereign Domains
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    "wingstop.pi", "netjets.pi", "sonnysbbq.pi", "ufhealth.pi", "ufl.pi",
                                    "gracekennedy.pi", "shands.pi", "circuit7.pi", "daytonainternationalspeedway.pi",
                                    "magellanjets.pi", "gru.pi", "pioscapital.pi", "sovereignpay.pi",
                                    "triumphsynergy.pi", "winnebago.pi", "appleandeve.pi", "checkbeck.pi",
                                    "jamrockmart.pi", "palatkaha.pi", "putnamclerk.pi", "rulonco.pi", "seprod.pi",
                                ].map((d) => (
                                    <span
                                        key={d}
                                        className={`text-xs px-2 py-1 rounded-full border font-mono ${d === tenant.domain
                                                ? `${tenant.borderColor} ${tenant.accentColor} bg-white/5`
                                                : "border-white/10 text-gray-500"
                                            }`}
                                    >
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-white/8 mt-10 px-4 py-6 text-center text-xs text-gray-600">
                <p>
                    Powered by{" "}
                    <a href="http://triumphsynergy.pi" className="text-yellow-400 hover:underline">
                        Triumph Synergy
                    </a>{" "}
                    · Sovereign Pi-OS Ecosystem · GCV $314,159/π · Central Node{" "}
                    <span className="font-mono text-gray-500">GA6Z5…GL7V</span>
                </p>
                <p className="mt-1">
                    {isTestnet ? (
                        <span className="text-yellow-600">
                            🧪 Testnet — test Pi only · Not real value · For pioneer simulation
                        </span>
                    ) : (
                        <span className="text-emerald-600">
                            ✓ Mainnet · Real Pi at GCV · Sovereign Stellar ledger
                        </span>
                    )}
                </p>
            </footer>
        </div>
    );
}
