/**
 * components/providers/PiSDKProvider.tsx
 * Global Pi SDK provider component
 */

"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
	getPiBrowserInfo,
	initializePiSDKOnStartup,
	isPiNetworkAvailable,
	isRunningInPiBrowser,
} from "@/lib/pi-sdk/pi-sdk-initialization";
import { loadPiSDKScript } from "@/lib/pi-sdk/pi-sdk-script-loader";

export interface PiSDKProviderProps {
	children: ReactNode;
}

/**
 * Provider component that initializes Pi SDK globally
 * Wrap your root layout with this component
 */
export function PiSDKProvider({ children }: PiSDKProviderProps) {
	const [initialized, setInitialized] = useState(false);
	const [isPiBrowser, setIsPiBrowser] = useState(false);

	useEffect(() => {
		// Load Pi SDK script
		loadPiSDKScript();

		// Initialize Pi SDK on mount
		const init = async () => {
			await initializePiSDKOnStartup();

			// Log environment info
			const browserInfo = getPiBrowserInfo();
			const piAvailable = isPiNetworkAvailable();
			const inPiBrowser = isRunningInPiBrowser();

			setIsPiBrowser(inPiBrowser);
			setInitialized(true);

			// Console output
			console.log(
				"═══════════════════════════════════════════════════════════════",
			);
			console.log("              PI SDK & PI BROWSER INITIALIZATION");
			console.log(
				"═══════════════════════════════════════════════════════════════",
			);
			console.log(
				`✓ Environment: ${inPiBrowser ? "Pi Browser" : "Web Browser"}`,
			);
			console.log(
				`✓ Pi Network: ${piAvailable ? "Available" : "Not Available"}`,
			);
			console.log(`✓ User Agent: ${browserInfo?.userAgent}`);
			if (browserInfo?.version) {
				console.log(`✓ Version: ${browserInfo.version}`);
			}
			console.log(
				"═══════════════════════════════════════════════════════════════",
			);
		};

		init();
	}, []);

	// Optionally add environment attribute to document
	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute(
				"data-pi-browser",
				isPiBrowser ? "true" : "false",
			);
		}
	}, [isPiBrowser]);

	return <>{children}</>;
}

/**
 * Client component to display Pi SDK status
 */
export function PiSDKStatus() {
	const [status, setStatus] = useState<{
		isPiBrowser: boolean;
		isPiNetworkAvailable: boolean;
	}>({
		isPiBrowser: false,
		isPiNetworkAvailable: false,
	});

	useEffect(() => {
		setStatus({
			isPiBrowser: isRunningInPiBrowser(),
			isPiNetworkAvailable: isPiNetworkAvailable(),
		});
	}, []);

	return (
		<div className="space-y-1 text-gray-500 text-xs">
			<div>
				<span className="font-semibold">Pi Browser:</span>{" "}
				{status.isPiBrowser ? "✓ Yes" : "✗ No"}
			</div>
			<div>
				<span className="font-semibold">Pi Network:</span>{" "}
				{status.isPiNetworkAvailable ? "✓ Available" : "✗ Not Available"}
			</div>
		</div>
	);
}
