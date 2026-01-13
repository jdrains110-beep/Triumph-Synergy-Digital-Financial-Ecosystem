/**
 * Pi Network Global Type Definitions
 * Unified type declarations for Pi SDK across the entire application
 *
 * This file contains the canonical Window.Pi type declaration.
 * All other files should import from here instead of declaring their own.
 */

// ============================================================================
// PI PAYMENT TYPES
// ============================================================================

export interface PiAuthResult {
	accessToken: string;
	user: {
		uid: string;
		username: string;
	};
}

export interface PiPaymentStatus {
	developer_approved: boolean;
	transaction_verified: boolean;
	developer_completed: boolean;
	cancelled: boolean;
	user_cancelled: boolean;
}

export interface PiPaymentTransaction {
	txid: string;
	verified: boolean;
}

export interface PiPayment {
	identifier: string;
	user_uid: string;
	amount: number;
	memo: string;
	metadata: Record<string, unknown>;
	status: PiPaymentStatus;
	transaction?: PiPaymentTransaction;
}

export interface PiPaymentData {
	amount: number;
	memo: string;
	metadata?: Record<string, unknown>;
}

export interface PiPaymentCallbacks {
	onReadyForServerApproval: (paymentId: string) => void;
	onReadyForServerCompletion: (paymentId: string, txid: string) => void;
	onCancel: (paymentId: string) => void;
	onError: (error: Error, payment?: PiPayment) => void;
}

export interface PiSDKConfig {
	version: string;
	sandbox?: boolean;
}

// ============================================================================
// GLOBAL WINDOW.PI DECLARATION
// ============================================================================

declare global {
	interface Window {
		Pi?: {
			/**
			 * Initialize the Pi SDK
			 */
			init: (config: PiSDKConfig) => void;

			/**
			 * Authenticate with Pi Network
			 */
			authenticate: (
				scopes: string[],
				onIncompletePaymentFound?: (payment: PiPayment) => void,
			) => Promise<PiAuthResult>;

			/**
			 * Create a Pi payment
			 */
			createPayment: (
				paymentData: PiPaymentData,
				callbacks: PiPaymentCallbacks,
			) => Promise<PiPayment>;
		};
	}
}
