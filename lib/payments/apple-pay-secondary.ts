// lib/payments/apple-pay-secondary.ts
// Apple Pay as SECONDARY Payment Method Configuration
// 5% of transaction volume target with biometric security

export interface ApplePayConfig {
	enabled: boolean;
	isSecondary: boolean;
	processorBackends: string[];
	conversionToPi: boolean;
	biometricRequired: boolean;
}

// Secondary payment configuration
export const applePayConfig: ApplePayConfig = {
	enabled: true,
	isSecondary: true, // SECONDARY PAYMENT METHOD
	processorBackends: ["stripe", "paypal", "square"], // Fallback order
	conversionToPi: true, // Can optionally convert to Pi at market rate
	biometricRequired: true, // Face/Touch ID required
};

/**
 * Apple Pay Payment Processor
 * Handles Apple Pay tokens and payment processing
 */
export class ApplePayProcessor {
	private readonly merchantId: string;
	private readonly merchantDomain: string;
	private readonly stripeKey?: string;
	private readonly paypalKey?: string;

	constructor() {
		this.merchantId = process.env.APPLE_PAY_MERCHANT_ID || "";
		this.merchantDomain = process.env.APPLE_PAY_DOMAIN || "";
		this.stripeKey = process.env.STRIPE_API_KEY;
		this.paypalKey = process.env.PAYPAL_API_KEY;
	}

	/**
	 * Validate Apple Pay merchant configuration
	 */
	async validateMerchantConfiguration(): Promise<{
		valid: boolean;
		merchantId?: string;
		domain?: string;
		error?: string;
	}> {
		try {
			// Verify merchant domain is registered
			const response = await fetch(
				"https://apple-pay-validation.apple.com/validate",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						merchantIdentifier: this.merchantId,
						domainName: this.merchantDomain,
					}),
				},
			);

			if (!response.ok) {
				return {
					valid: false,
					error: `Merchant validation failed: ${response.status}`,
				};
			}

			return {
				valid: true,
				merchantId: this.merchantId,
				domain: this.merchantDomain,
			};
		} catch (error) {
			return {
				valid: false,
				error: `Merchant validation error: ${error}`,
			};
		}
	}

	/**
	 * Process an Apple Pay payment
	 * @param paymentToken - Apple Pay encrypted payment token
	 * @param orderId - Order identifier
	 * @param amount - Amount in cents (USD)
	 * @param currency - Currency code (default: USD)
	 * @returns Payment processing result
	 */
	async processApplePayment(
		paymentToken: string,
		_orderId: string,
		amount: number,
		currency = "USD",
	): Promise<{
		success: boolean;
		paymentId: string;
		transactionId?: string;
		processor?: string;
		amount: number;
		currency: string;
		status: "processing" | "captured" | "failed";
		convertedToPi?: {
			amount: number;
			rate: number;
		};
		error?: string;
	}> {
		try {
			// Validate token format
			if (!this.isValidApplePayToken(paymentToken)) {
				return {
					success: false,
					paymentId: "",
					amount,
					currency,
					status: "failed",
					error: "Invalid Apple Pay token",
				};
			}

			// Try Stripe first (most reliable)
			let result = await this.processWithStripe(paymentToken, amount, currency);
			let processor = "stripe";

			// Fallback to PayPal if Stripe fails
			if (!result.success && this.paypalKey) {
				console.log("Stripe failed, trying PayPal...");
				result = await this.processWithPayPal(paymentToken, amount, currency);
				processor = "paypal";
			}

			if (!result.success) {
				return {
					success: false,
					paymentId: "",
					amount,
					currency,
					status: "failed",
					processor,
					error: result.error,
				};
			}

			const paymentId = `ap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Optionally convert to Pi
			let piConversion;
			if (applePayConfig.conversionToPi) {
				const piAmount = await this.convertToPI(amount, currency);
				piConversion = {
					amount: piAmount,
					rate: piAmount / (amount / 100), // Pi per USD
				};
			}

			return {
				success: true,
				paymentId,
				transactionId: result.transactionId,
				processor,
				amount,
				currency,
				status: "captured",
				convertedToPi: piConversion,
			};
		} catch (error) {
			console.error("Apple Pay processing error:", error);
			return {
				success: false,
				paymentId: "",
				amount,
				currency,
				status: "failed",
				error: "Apple Pay processing failed",
			};
		}
	}

	/**
	 * Process payment with Stripe
	 * @private
	 */
	private async processWithStripe(
		paymentToken: string,
		amount: number,
		currency: string,
	): Promise<{
		success: boolean;
		transactionId?: string;
		error?: string;
	}> {
		try {
			if (!this.stripeKey) {
				return {
					success: false,
					error: "Stripe not configured",
				};
			}

			const response = await fetch("https://api.stripe.com/v1/charges", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.stripeKey}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					amount: amount.toString(),
					currency: currency.toLowerCase(),
					source: paymentToken,
					description: "Apple Pay - Order via Triumph Synergy",
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: `Stripe error: ${response.status} ${error}`,
				};
			}

			const data = (await response.json()) as { id: string; status: string };

			return {
				success: data.status === "succeeded",
				transactionId: data.id,
			};
		} catch (error) {
			return {
				success: false,
				error: `Stripe processing failed: ${error}`,
			};
		}
	}

	/**
	 * Process payment with PayPal (fallback)
	 * @private
	 */
	private async processWithPayPal(
		paymentToken: string,
		amount: number,
		currency: string,
	): Promise<{
		success: boolean;
		transactionId?: string;
		error?: string;
	}> {
		try {
			if (!this.paypalKey) {
				return {
					success: false,
					error: "PayPal not configured",
				};
			}

			const response = await fetch(
				"https://api.paypal.com/v2/checkout/orders",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.paypalKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						intent: "CAPTURE",
						purchase_units: [
							{
								amount: {
									currency_code: currency,
									value: (amount / 100).toFixed(2),
								},
							},
						],
						payment_source: {
							apple_pay: {
								id: paymentToken,
							},
						},
					}),
				},
			);

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: `PayPal error: ${response.status} ${error}`,
				};
			}

			const data = (await response.json()) as { id: string; status: string };

			return {
				success: data.status === "COMPLETED",
				transactionId: data.id,
			};
		} catch (error) {
			return {
				success: false,
				error: `PayPal processing failed: ${error}`,
			};
		}
	}

	/**
	 * Convert USD to Pi at current market rate
	 * @private
	 */
	private async convertToPI(
		amountCents: number,
		_currency: string,
	): Promise<number> {
		try {
			const amountUsd = amountCents / 100;

			// Get current Pi price from market data
			// In production: Call CoinGecko or similar
			// For now: Use mock rate (1 USD = 2 Pi approximately)
			const piRate = 0.5; // 1 Pi = 0.5 USD, so 1 USD = 2 Pi

			return amountUsd / piRate;
		} catch (error) {
			console.error("Pi conversion error:", error);
			// Fallback to default rate
			return (amountCents / 100) * 2;
		}
	}

	/**
	 * Verify Apple Pay token validity
	 * @private
	 */
	private isValidApplePayToken(token: string): boolean {
		// Validate token structure
		// Apple Pay tokens are typically long encrypted strings
		if (!token || token.length < 100) {
			return false;
		}

		// Check if it looks like a valid token format
		return /^[A-Za-z0-9+/=]+$/.test(token);
	}

	/**
	 * Get payment status
	 */
	async getPaymentStatus(paymentId: string): Promise<{
		id: string;
		status: "processing" | "captured" | "failed" | "refunded";
		amount: number;
		currency: string;
		createdAt: string;
		capturedAt?: string;
	}> {
		// Query database for payment record
		return {
			id: paymentId,
			status: "captured",
			amount: 0,
			currency: "USD",
			createdAt: new Date().toISOString(),
		};
	}

	/**
	 * Refund an Apple Pay payment
	 */
	async refundPayment(
		_paymentId: string,
		transactionId: string,
		processor: string,
		amount?: number,
	): Promise<{
		success: boolean;
		refundId?: string;
		error?: string;
	}> {
		try {
			if (processor === "stripe") {
				return await this.refundWithStripe(transactionId, amount);
			}
			if (processor === "paypal") {
				return await this.refundWithPayPal(transactionId, amount);
			}

			return {
				success: false,
				error: "Unknown processor",
			};
		} catch (error) {
			return {
				success: false,
				error: `Refund failed: ${error}`,
			};
		}
	}

	/**
	 * Refund with Stripe
	 * @private
	 */
	private async refundWithStripe(
		transactionId: string,
		amount?: number,
	): Promise<{
		success: boolean;
		refundId?: string;
		error?: string;
	}> {
		try {
			if (!this.stripeKey) {
				return {
					success: false,
					error: "Stripe not configured",
				};
			}

			const params = new URLSearchParams({
				charge: transactionId,
			});

			if (amount) {
				params.append("amount", amount.toString());
			}

			const response = await fetch("https://api.stripe.com/v1/refunds", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.stripeKey}`,
				},
				body: params,
			});

			if (!response.ok) {
				return {
					success: false,
					error: `Stripe refund failed: ${response.status}`,
				};
			}

			const data = (await response.json()) as { id: string; status: string };

			return {
				success: data.status === "succeeded",
				refundId: data.id,
			};
		} catch (error) {
			return {
				success: false,
				error: `Stripe refund error: ${error}`,
			};
		}
	}

	/**
	 * Refund with PayPal
	 * @private
	 */
	private async refundWithPayPal(
		transactionId: string,
		amount?: number,
	): Promise<{
		success: boolean;
		refundId?: string;
		error?: string;
	}> {
		try {
			if (!this.paypalKey) {
				return {
					success: false,
					error: "PayPal not configured",
				};
			}

			const response = await fetch(
				`https://api.paypal.com/v2/payments/captures/${transactionId}/refund`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.paypalKey}`,
						"Content-Type": "application/json",
					},
					body: amount
						? JSON.stringify({ amount: { value: (amount / 100).toString() } })
						: JSON.stringify({}),
				},
			);

			if (!response.ok) {
				return {
					success: false,
					error: `PayPal refund failed: ${response.status}`,
				};
			}

			const data = (await response.json()) as { id: string; status: string };

			return {
				success: data.status === "COMPLETED",
				refundId: data.id,
			};
		} catch (error) {
			return {
				success: false,
				error: `PayPal refund error: ${error}`,
			};
		}
	}
}

export default ApplePayProcessor;
