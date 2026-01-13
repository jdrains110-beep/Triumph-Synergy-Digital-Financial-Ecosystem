/**
 * Biometric Login Component
 * Handles biometric authentication during login
 */

"use client";

import {
	AlertCircle,
	CheckCircle2,
	Eye,
	EyeOff,
	Fingerprint,
	Loader2,
	Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBiometric } from "@/lib/biometric/use-biometric";

interface BiometricLoginProps {
	onSuccess?: (sessionToken: string) => void;
	onError?: (error: string) => void;
}

export function BiometricLogin({ onSuccess, onError }: BiometricLoginProps) {
	const {
		isSupported,
		registeredCredentials,
		isAuthenticating,
		authenticateError,
		sessionToken,
		authenticateBiometric,
		authenticateWithFallback,
		resetErrors,
	} = useBiometric();

	const [pin, setPin] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [activeTab, setActiveTab] = useState<"biometric" | "pin" | "password">(
		registeredCredentials.length > 0 ? "biometric" : "pin",
	);
	const [isPinLoading, setIsPinLoading] = useState(false);
	const [isPasswordLoading, setIsPasswordLoading] = useState(false);

	// Handle successful authentication
	useEffect(() => {
		if (sessionToken && onSuccess) {
			onSuccess(sessionToken);
		}
	}, [sessionToken, onSuccess]);

	const handleBiometricLogin = async () => {
		resetErrors();
		const success = await authenticateBiometric();

		if (!success && onError) {
			onError(authenticateError || "Biometric authentication failed");
		}
	};

	const handlePinLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!pin || pin.length < 4) {
			onError?.("PIN must be at least 4 digits");
			return;
		}

		try {
			setIsPinLoading(true);
			resetErrors();
			const success = await authenticateWithFallback(pin);

			if (!success) {
				onError?.(authenticateError || "PIN authentication failed");
			}
		} finally {
			setIsPinLoading(false);
			setPin("");
		}
	};

	const handlePasswordLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!password) {
			onError?.("Password is required");
			return;
		}

		try {
			setIsPasswordLoading(true);
			resetErrors();
			const success = await authenticateWithFallback(password);

			if (!success) {
				onError?.(authenticateError || "Password authentication failed");
			}
		} finally {
			setIsPasswordLoading(false);
			setPassword("");
		}
	};

	if (!isSupported) {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-orange-500" />
						Biometric Not Available
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert>
						<AlertDescription>
							Your device does not support biometric authentication. Please use
							PIN or password to log in.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Lock className="h-5 w-5" />
					Secure Login
				</CardTitle>
				<CardDescription>
					Choose your preferred authentication method
				</CardDescription>
			</CardHeader>

			<CardContent>
				<Tabs
					onValueChange={(value: string) =>
						setActiveTab(value as "biometric" | "pin" | "password")
					}
					value={activeTab}
				>
					<TabsList className="grid w-full grid-cols-3">
						{registeredCredentials.length > 0 && (
							<TabsTrigger className="text-xs" value="biometric">
								<Fingerprint className="mr-1 h-4 w-4" />
								Biometric
							</TabsTrigger>
						)}
						<TabsTrigger className="text-xs" value="pin">
							<Lock className="mr-1 h-4 w-4" />
							PIN
						</TabsTrigger>
						<TabsTrigger className="text-xs" value="password">
							<Lock className="mr-1 h-4 w-4" />
							Password
						</TabsTrigger>
					</TabsList>

					{/* Biometric Login */}
					{registeredCredentials.length > 0 && (
						<TabsContent className="mt-4 space-y-4" value="biometric">
							{authenticateError && (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>{authenticateError}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-4 text-center">
								<div className="flex justify-center">
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
										<Fingerprint className="h-8 w-8 text-blue-600" />
									</div>
								</div>

								<div>
									<h3 className="font-semibold">Biometric Authentication</h3>
									<p className="mt-1 text-muted-foreground text-sm">
										{registeredCredentials.length} credential
										{registeredCredentials.length !== 1 ? "s" : ""} registered
									</p>
								</div>

								<Button
									className="w-full"
									disabled={isAuthenticating}
									onClick={handleBiometricLogin}
									size="lg"
								>
									{isAuthenticating && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{isAuthenticating ? "Scanning..." : "Use Biometric"}
								</Button>

								<p className="text-muted-foreground text-xs">
									Place your finger on the reader or look at your camera
								</p>
							</div>
						</TabsContent>
					)}

					{/* PIN Login */}
					<TabsContent className="mt-4 space-y-4" value="pin">
						{authenticateError && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{authenticateError}</AlertDescription>
							</Alert>
						)}

						<form className="space-y-3" onSubmit={handlePinLogin}>
							<div>
								<label className="font-medium text-sm" htmlFor="pin-login">
									PIN
								</label>
								<Input
									className="mt-1"
									disabled={isPinLoading}
									id="pin-login"
									maxLength={6}
									onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
									placeholder="Enter your PIN"
									type="password"
									value={pin}
								/>
								<p className="mt-1 text-muted-foreground text-xs">
									Numeric PIN (4-6 digits)
								</p>
							</div>

							<Button
								className="w-full"
								disabled={isPinLoading || pin.length < 4}
								size="lg"
								type="submit"
							>
								{isPinLoading && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{isPinLoading ? "Verifying..." : "Login with PIN"}
							</Button>
						</form>
					</TabsContent>

					{/* Password Login */}
					<TabsContent className="mt-4 space-y-4" value="password">
						{authenticateError && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{authenticateError}</AlertDescription>
							</Alert>
						)}

						<form className="space-y-3" onSubmit={handlePasswordLogin}>
							<div>
								<label className="font-medium text-sm" htmlFor="password-login">
									Password
								</label>
								<div className="relative mt-1">
									<Input
										disabled={isPasswordLoading}
										id="password-login"
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Enter your password"
										type={showPassword ? "text" : "password"}
										value={password}
									/>
									<button
										className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground hover:text-foreground"
										onClick={() => setShowPassword(!showPassword)}
										type="button"
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							<Button
								className="w-full"
								disabled={isPasswordLoading || !password}
								size="lg"
								type="submit"
							>
								{isPasswordLoading && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{isPasswordLoading ? "Verifying..." : "Login with Password"}
							</Button>
						</form>
					</TabsContent>
				</Tabs>

				{/* Success State */}
				{sessionToken && (
					<Alert className="mt-4 border-green-200 bg-green-50">
						<CheckCircle2 className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-700">
							Authentication successful! Redirecting...
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}
