// Reusable Checkout Modal Component with SAIB Integration
'use client';

import { useState } from 'react';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        name: string;
        description: string;
        price: number;
        currency: 'Pi' | 'TriSyn';
        type: 'flight' | 'hotel' | 'course' | 'rental' | 'delivery' | 'tour' | 'activity';
    };
}

export default function CheckoutModal({ isOpen, onClose, item }: CheckoutModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<'pi' | 'trisyn'>('pi');
    const [processing, setProcessing] = useState(false);
    const [saibEnforcement, setSaibEnforcement] = useState(false);

    const handlePayment = async () => {
        setProcessing(true);

        // Simulate SAIB Smart Contract Enforcement
        if (item.type === 'delivery' || item.type === 'rental') {
            setSaibEnforcement(true);
            // In production: Call /api/saib/enforce with the transaction details
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        setProcessing(false);
        // In production: Show success and clear modal
        alert(`✓ Payment processed: ${item.price} ${paymentMethod.toUpperCase()}\nFor: ${item.name}`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-purple-500/30 max-w-md w-full mx-4 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Complete Purchase</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Order Details */}
                <div className="rounded-lg bg-black/40 p-4 mb-6">
                    <p className="text-gray-400 text-xs mb-1">Order Summary</p>
                    <p className="font-bold text-white mb-3">{item.name}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">{item.description}</span>
                        <span className="font-bold text-cyan-400 text-lg">
                            {item.price} {item.currency}
                        </span>
                    </div>
                </div>

                {/* SAIB Enforcement Status */}
                {saibEnforcement && (
                    <div className="rounded-lg bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 p-4 mb-6">
                        <p className="text-sm text-cyan-300 font-semibold mb-2">🛡️ SAIB Enforcement Active</p>
                        <p className="text-xs text-gray-300">
                            Smart contract generated. Conditions enforced by SAIB network.
                        </p>
                    </div>
                )}

                {/* Payment Method Selection */}
                <div className="mb-6">
                    <p className="text-gray-300 text-sm font-semibold mb-3">Payment Method</p>
                    <div className="space-y-2">
                        <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${paymentMethod === 'pi'
                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/60'
                                : 'bg-black/40 border border-purple-500/20 hover:border-purple-400/40'
                            }`}>
                            <input
                                type="radio"
                                name="payment"
                                value="pi"
                                checked={paymentMethod === 'pi'}
                                onChange={(e) => setPaymentMethod(e.target.value as 'pi' | 'trisyn')}
                                className="w-4 h-4"
                            />
                            <div>
                                <p className="font-semibold text-white">π Pi Network</p>
                                <p className="text-xs text-gray-400">Mainnet • Testnet</p>
                            </div>
                            <span className="ml-auto text-cyan-400">∞ Available</span>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${paymentMethod === 'trisyn'
                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/60'
                                : 'bg-black/40 border border-purple-500/20 hover:border-purple-400/40'
                            }`}>
                            <input
                                type="radio"
                                name="payment"
                                value="trisyn"
                                checked={paymentMethod === 'trisyn'}
                                onChange={(e) => setPaymentMethod(e.target.value as 'pi' | 'trisyn')}
                                className="w-4 h-4"
                            />
                            <div>
                                <p className="font-semibold text-white">TriSyn Token</p>
                                <p className="text-xs text-gray-400">Docker SAIB • Testnet</p>
                            </div>
                            <span className="ml-auto text-purple-400">∞ Available</span>
                        </label>
                    </div>
                </div>

                {/* Fee Breakdown */}
                <div className="rounded-lg bg-black/40 p-4 mb-6 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                        <span>Subtotal</span>
                        <span>{item.price} {item.currency}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                        <span>Platform Fee (1%)</span>
                        <span>{(item.price * 0.01).toFixed(2)} {item.currency}</span>
                    </div>
                    <div className="border-t border-purple-500/10 pt-2 flex justify-between font-bold text-white">
                        <span>Total</span>
                        <span>{(item.price * 1.01).toFixed(2)} {item.currency}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 font-bold text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? '⏳ Processing...' : '✓ Pay & Confirm'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-lg border border-purple-400/50 font-bold text-purple-300 hover:bg-purple-500/10 transition-all"
                    >
                        Cancel
                    </button>
                </div>

                {/* Security Notice */}
                <p className="text-xs text-gray-500 text-center mt-4">
                    🔒 Secured by SAIB Network • Pi Network Blockchain
                </p>
            </div>
        </div>
    );
}
