/**
 * Contract Signing Component
 * User-facing component for viewing, accepting, and signing contracts
 */

"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContractSigningProps {
	contractId: string;
	contractTitle: string;
	contractContent: string;
	requiredToSign?: boolean;
	onSignatureComplete?: (signature: any) => void;
	onConsentChange?: (accepted: boolean) => void;
}

export function ContractSigningComponent({
	contractId,
	contractTitle,
	contractContent,
	requiredToSign = true,
	onSignatureComplete,
	onConsentChange,
}: ContractSigningProps) {
	const [accepted, setAccepted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [screenshot, setScreenshot] = useState<string | null>(null);
	const [showSignaturePad, setShowSignaturePad] = useState(false);

	// Capture device context
	const getSigningContext = async () => {
		const context = {
			ipAddress: await (await fetch("/api/user/ip")).json().then((r) => r.ip),
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			browser: getBrowserName(),
			deviceType: getDeviceType(),
			timestamp: new Date(),
			country: await getCountry(),
			city: await getCity(),
		};
		return context;
	};

	const getBrowserName = () => {
		const ua = navigator.userAgent;
		if (ua.indexOf("Chrome") > -1) {
			return "Chrome";
		}
		if (ua.indexOf("Safari") > -1) {
			return "Safari";
		}
		if (ua.indexOf("Firefox") > -1) {
			return "Firefox";
		}
		return "Unknown";
	};

	const getDeviceType = () => {
		const width = window.innerWidth;
		if (width < 768) {
			return "mobile";
		}
		if (width < 1024) {
			return "tablet";
		}
		return "desktop";
	};

	const getCountry = async () => {
		try {
			const response = await fetch("https://ipapi.co/json/");
			const data = await response.json();
			return data.country_name;
		} catch {
			return "Unknown";
		}
	};

	const getCity = async () => {
		try {
			const response = await fetch("https://ipapi.co/json/");
			const data = await response.json();
			return data.city;
		} catch {
			return "Unknown";
		}
	};

	// Capture screenshot evidence
	const captureScreenshot = async () => {
		try {
			const canvas = await (await import("html2canvas")).default(
				document.documentElement,
				{
					allowTaint: true,
					useCORS: true,
				},
			);
			return canvas.toDataURL("image/png");
		} catch {
			console.warn("Screenshot capture failed");
			return null;
		}
	};

	const handleAcceptance = (value: boolean) => {
		setAccepted(value);
		onConsentChange?.(value);
	};

	const handleSign = async () => {
		if (!accepted) {
			setError("You must accept the contract to sign");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Get signing context
			const context = await getSigningContext();

			// Capture screenshot evidence
			const screenshotBase64 = await captureScreenshot();

			// Get signature data
			const signatureData = `signed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Send signing request
			const response = await fetch(`/api/contracts/${contractId}/sign`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-User-ID": "user-id-placeholder", // Get from session
					"X-User-Email": "user@example.com", // Get from session
					"X-User-Name": "User Name", // Get from session
				},
				body: JSON.stringify({
					signatureData,
					method: "NATIVE_CLICK",
					screenshotBase64,
					...context,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to sign contract");
			}

			const result = await response.json();
			setSuccess(true);
			onSignatureComplete?.(result);

			// Show certificate
			setTimeout(() => {
				showSigningCertificate(result.certificate);
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Signing failed");
		} finally {
			setLoading(false);
		}
	};

	const showSigningCertificate = (certificate: string) => {
		const blob = new Blob([certificate], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `signing-certificate-${contractId}.txt`;
		a.click();
	};

	return (
		<div className="mx-auto w-full max-w-4xl space-y-6 p-6">
			{/* Legal Notice */}
			<Alert className="border-blue-500 bg-blue-50">
				<AlertTriangle className="h-4 w-4 text-blue-600" />
				<AlertDescription className="text-blue-900">
					<strong>Legal Notice:</strong> By signing this contract, you are
					entering into a legally binding agreement. Your signature will be
					recorded with timestamp, device information, and location for legal
					compliance (ESIGN Act, UETA).
				</AlertDescription>
			</Alert>

			{/* Contract Content */}
			<div className="overflow-hidden rounded-lg border">
				<div className="border-b bg-gray-100 px-6 py-4">
					<h2 className="font-semibold text-xl">{contractTitle}</h2>
					<p className="mt-1 text-gray-600 text-sm">
						Contract ID: {contractId}
					</p>
				</div>
				<ScrollArea className="h-96 w-full p-6">
					<div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 text-sm">
						{contractContent}
					</div>
				</ScrollArea>
			</div>

			{/* Error Display */}
			{error && (
				<Alert className="border-red-500 bg-red-50">
					<AlertTriangle className="h-4 w-4 text-red-600" />
					<AlertDescription className="text-red-900">{error}</AlertDescription>
				</Alert>
			)}

			{/* Success Display */}
			{success && (
				<Alert className="border-green-500 bg-green-50">
					<CheckCircle2 className="h-4 w-4 text-green-600" />
					<AlertDescription className="text-green-900">
						Contract signed successfully! A certificate has been generated and
						will be downloaded.
					</AlertDescription>
				</Alert>
			)}

			{/* Acceptance Checkbox */}
			<div className="space-y-4 rounded-lg border p-6">
				<div className="flex items-start space-x-3">
					<Checkbox
						checked={accepted}
						className="mt-1"
						disabled={loading || success}
						id="accept"
						onCheckedChange={handleAcceptance}
					/>
					<label
						className="flex-1 font-medium text-sm leading-relaxed"
						htmlFor="accept"
					>
						<span className="block">
							I have read and understand this contract and agree to be legally
							bound by all terms and conditions.
						</span>
						<span className="mt-2 block text-gray-600 text-xs">
							By checking this box, you are providing active electronic consent
							as required by law and acknowledge that your signature will be
							recorded with:
						</span>
						<ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600 text-xs">
							<li>Timestamp and timezone</li>
							<li>Device type and browser information</li>
							<li>IP address and geographic location</li>
							<li>Screenshot evidence</li>
						</ul>
					</label>
				</div>
			</div>

			{/* Signature Pad (Optional) */}
			{showSignaturePad && (
				<Dialog onOpenChange={setShowSignaturePad} open={showSignaturePad}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Draw Your Signature</DialogTitle>
						</DialogHeader>
						<canvas
							className="h-32 w-full cursor-crosshair rounded border border-gray-300"
							ref={canvasRef}
						/>
						<div className="flex gap-2">
							<Button
								onClick={() => setShowSignaturePad(false)}
								variant="outline"
							>
								Cancel
							</Button>
							<Button onClick={() => setShowSignaturePad(false)}>
								Confirm Signature
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Sign Button */}
			<Button
				className="h-12 w-full font-semibold text-base"
				disabled={!accepted || loading || success}
				onClick={handleSign}
				variant={success ? "secondary" : "default"}
			>
				{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				{success ? "✓ Signed" : "I Accept & Sign"}
			</Button>

			{/* Compliance Info */}
			<div className="rounded border border-gray-200 bg-gray-50 p-4 text-gray-600 text-xs">
				<p className="mb-2 font-semibold">Legal Compliance:</p>
				<ul className="ml-4 list-disc space-y-1">
					<li>ESIGN Act Compliant - Electronic signatures legally binding</li>
					<li>UETA Compliant - Uniform Electronic Transactions Act</li>
					<li>Audit Trail - Complete event logging with screenshots</li>
					<li>Consent Tracking - Active acceptance requirement</li>
					<li>Data Security - Encrypted storage and transmission</li>
				</ul>
			</div>
		</div>
	);
}

export default ContractSigningComponent;
