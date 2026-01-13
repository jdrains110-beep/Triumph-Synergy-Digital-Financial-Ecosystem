"use client";

/**
 * Biometric Registration Component
 * User-friendly workflow to register biometric credentials
 */

import {
	AlertCircle,
	CheckCircle2,
	Fingerprint,
	Loader,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useBiometric } from "@/lib/biometric/use-biometric";

interface BiometricRegistrationProps {
	onSuccess?: () => void;
	onCancel?: () => void;
	credentialName?: string;
	autoRegister?: boolean;
}

export function BiometricRegistration({
	onSuccess,
	onCancel,
	credentialName: initialCredentialName,
	autoRegister = false,
}: BiometricRegistrationProps) {
	const {
		isSupported,
		isRegistering,
		registerError,
		registeredCredentials,
		initiateRegistration,
		completeRegistration,
		resetErrors,
	} = useBiometric();

	const [step, setStep] = useState<
		"intro" | "setup" | "registering" | "success" | "error"
	>("intro");
	const [credentialName, setCredentialName] = useState(
		initialCredentialName || "",
	);
	const [successMessage, setSuccessMessage] = useState("");

	const handleStartRegistration = useCallback(async () => {
		resetErrors();
		setStep("setup");
		try {
			await initiateRegistration(credentialName);
			setStep("registering");
		} catch (error) {
			console.error("Registration initiation failed:", error);
			setStep("error");
		}
	}, [credentialName, initiateRegistration, resetErrors]);

	// Auto-register if requested and supported
	useEffect(() => {
		if (autoRegister && isSupported && step === "intro") {
			handleStartRegistration();
		}
	}, [autoRegister, isSupported, step, handleStartRegistration]);

	if (!isSupported) {
		return (
			<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
				<div className="flex items-start gap-3">
					<AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
					<div>
						<h3 className="font-semibold text-yellow-900">
							Biometric Not Supported
						</h3>
						<p className="mt-1 text-sm text-yellow-800">
							Your device does not support biometric authentication. You can
							still use PIN or password authentication.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const handleCompleteRegistration = async () => {
		try {
			const credential = await completeRegistration(credentialName);
			if (credential) {
				setStep("success");
				setSuccessMessage(
					`Biometric credential "${credential.name}" registered successfully!`,
				);
				setTimeout(() => {
					onSuccess?.();
				}, 2000);
			} else {
				setStep("error");
			}
		} catch (error) {
			console.error("Registration completion failed:", error);
			setStep("error");
		}
	};

	const handleRetry = () => {
		resetErrors();
		setStep("intro");
	};

	const handleCancel = () => {
		resetErrors();
		setStep("intro");
		onCancel?.();
	};

	return (
		<div className="w-full space-y-4">
			{/* Intro Step */}
			{step === "intro" && (
				<div className="space-y-4">
					<div className="mb-6 flex items-center justify-center">
						<div className="rounded-lg bg-blue-50 p-4">
							<Fingerprint className="h-8 w-8 text-blue-600" />
						</div>
					</div>

					<div>
						<h2 className="font-semibold text-lg">
							Register Biometric Authentication
						</h2>
						<p className="mt-2 text-gray-600 text-sm">
							Enhance your account security with biometric authentication. Use
							your fingerprint, face, or Windows Hello to securely access your
							account.
						</p>
					</div>

					<div className="rounded-lg bg-blue-50 p-4 text-blue-900 text-sm">
						<ul className="space-y-2">
							<li>✓ Fast and secure login</li>
							<li>✓ No passwords needed</li>
							<li>✓ Works offline after initial setup</li>
							<li>✓ Can add multiple biometric credentials</li>
						</ul>
					</div>

					<div className="flex gap-3">
						<button
							className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
							onClick={handleStartRegistration}
						>
							<Plus className="mr-2 inline h-4 w-4" />
							Start Registration
						</button>
						<button
							className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
							onClick={handleCancel}
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Setup Step */}
			{step === "setup" && (
				<div className="space-y-4">
					<div>
						<h2 className="font-semibold text-lg">Set Up Biometric</h2>
						<p className="mt-2 text-gray-600 text-sm">
							Give your biometric credential a name to identify it (e.g., "My
							Phone Face ID", "Work Laptop").
						</p>
					</div>

					<div>
						<label
							className="mb-2 block font-medium text-gray-700 text-sm"
							htmlFor="credential-name-input"
						>
							Credential Name (Optional)
						</label>
						<input
							className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							id="credential-name-input"
							onChange={(e) => setCredentialName(e.target.value)}
							placeholder="e.g., iPhone Face ID"
							type="text"
							value={credentialName}
						/>
					</div>

					<div className="rounded-lg bg-gray-50 p-4 text-gray-600 text-sm">
						<p className="mb-2 font-medium text-gray-700">
							Next, you'll need to:
						</p>
						<ol className="list-inside list-decimal space-y-2">
							<li>Follow the biometric prompt on your device</li>
							<li>Complete the authentication process</li>
							<li>Confirm the registration</li>
						</ol>
					</div>

					<div className="flex gap-3">
						<button
							className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isRegistering}
							onClick={handleCompleteRegistration}
						>
							{isRegistering ? (
								<>
									<Loader className="mr-2 inline h-4 w-4 animate-spin" />
									Setting Up...
								</>
							) : (
								"Continue"
							)}
						</button>
						<button
							className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isRegistering}
							onClick={handleCancel}
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Registering Step */}
			{step === "registering" && (
				<div className="space-y-4">
					<div className="mb-6 flex justify-center">
						<div className="animate-pulse rounded-lg bg-blue-50 p-4">
							<Fingerprint className="h-8 w-8 text-blue-600" />
						</div>
					</div>

					<div className="text-center">
						<h2 className="font-semibold text-lg">
							Biometric Authentication in Progress
						</h2>
						<p className="mt-2 text-gray-600 text-sm">
							Please provide your biometric input now. Follow the prompts on
							your device.
						</p>
					</div>

					<div className="rounded-lg bg-blue-50 p-4 text-center">
						<Loader className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
						<p className="text-blue-900 text-sm">
							Waiting for biometric input...
						</p>
					</div>

					<button
						className="w-full rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
						onClick={handleCancel}
					>
						Cancel
					</button>
				</div>
			)}

			{/* Success Step */}
			{step === "success" && (
				<div className="space-y-4">
					<div className="mb-6 flex justify-center">
						<div className="rounded-lg bg-green-50 p-4">
							<CheckCircle2 className="h-8 w-8 text-green-600" />
						</div>
					</div>

					<div className="text-center">
						<h2 className="font-semibold text-green-900 text-lg">
							Registration Successful!
						</h2>
						<p className="mt-2 text-green-800 text-sm">{successMessage}</p>
					</div>

					<div className="rounded-lg bg-green-50 p-4">
						<p className="text-green-900 text-sm">
							You can now use biometric authentication to log in quickly and
							securely.
						</p>
					</div>

					<p className="text-center text-gray-500 text-xs">Redirecting...</p>
				</div>
			)}

			{/* Error Step */}
			{step === "error" && registerError && (
				<div className="space-y-4">
					<div className="rounded-lg border border-red-200 bg-red-50 p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
							<div>
								<h3 className="font-semibold text-red-900">
									Registration Failed
								</h3>
								<p className="mt-1 text-red-800 text-sm">{registerError}</p>
								<p className="mt-2 text-red-700 text-xs italic">
									Please try again or contact support if the issue persists.
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-3">
						<button
							className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
							onClick={handleRetry}
						>
							Try Again
						</button>
						<button
							className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
							onClick={handleCancel}
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Registered Credentials Info */}
			{registeredCredentials.length > 0 && (
				<div className="rounded-lg bg-gray-50 p-4">
					<p className="font-medium text-gray-700 text-sm">
						{registeredCredentials.length} biometric credential
						{registeredCredentials.length !== 1 ? "s" : ""} registered
					</p>
					<ul className="mt-2 space-y-1">
						{registeredCredentials.map((cred) => (
							<li className="text-gray-600 text-xs" key={cred.id}>
								• {cred.name || "Unnamed"} (
								{new Date(cred.createdAt).toLocaleDateString()})
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
