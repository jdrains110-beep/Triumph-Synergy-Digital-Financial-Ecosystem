"use client";

/**
 * Biometric Authentication Component
 * Secure login with biometric and PIN fallback
 */

import {
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  Loader,
  Lock,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useBiometric } from "@/lib/biometric/use-biometric";

type BiometricAuthProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  showFallback?: boolean;
  fallbackLabel?: string;
};

export function BiometricAuth({
  onSuccess,
  onCancel,
  showFallback = true,
  fallbackLabel = "Use PIN",
}: BiometricAuthProps) {
  const {
    isSupported,
    isAuthenticating,
    authenticateError,
    registeredCredentials,
    isAuthenticated,
    authenticateBiometric,
    authenticateWithFallback,
    resetErrors,
  } = useBiometric();

  const [step, setStep] = useState<
    "biometric" | "success" | "error" | "fallback"
  >("biometric");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const hasBiometricCredentials = registeredCredentials.length > 0;

  const handleBiometricAuth = useCallback(async () => {
    resetErrors();
    setPinError("");
    setAttemptCount((prev) => prev + 1);

    const success = await authenticateBiometric();

    if (!success && authenticateError) {
      setStep("error");
    }
  }, [authenticateBiometric, authenticateError, resetErrors]);

  // Trigger biometric auth on mount if supported
  useEffect(() => {
    if (
      isSupported &&
      hasBiometricCredentials &&
      step === "biometric" &&
      !isAuthenticating
    ) {
      handleBiometricAuth();
    }
  }, [
    handleBiometricAuth,
    hasBiometricCredentials,
    isAuthenticating,
    isSupported,
    step,
  ]);

  // Navigate to success
  useEffect(() => {
    if (isAuthenticated && step === "biometric") {
      setStep("success");
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    }
  }, [isAuthenticated, onSuccess, step]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!pin || pin.length < 4) {
      setPinError("PIN must be at least 4 characters");
      return;
    }

    setAttemptCount((prev) => prev + 1);

    const success = await authenticateWithFallback(pin);

    if (success) {
      setStep("success");
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } else {
      setPinError("Invalid PIN. Please try again.");
      setPin("");
    }
  };

  const handleUseFallback = () => {
    resetErrors();
    setPinError("");
    setPin("");
    setShowPin(false);
    setStep("fallback");
  };

  const handleRetry = () => {
    resetErrors();
    setPinError("");
    setAttemptCount(0);
    setStep("biometric");
  };

  const handleCancel = () => {
    resetErrors();
    setPinError("");
    setStep("biometric");
    onCancel?.();
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-yellow-900">
              Biometric Not Available
            </h3>
            <p className="mt-1 text-sm text-yellow-800">
              Biometric authentication is not available on your device. Please
              use your PIN or password instead.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No credentials registered
  if (!hasBiometricCredentials) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">
                No Biometric Registered
              </h3>
              <p className="mt-1 text-blue-800 text-sm">
                You haven't registered a biometric credential yet. Please
                register one in your account settings or use your PIN below.
              </p>
            </div>
          </div>
        </div>

        {showFallback && (
          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            onClick={handleUseFallback}
          >
            {fallbackLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Biometric Step */}
      {step === "biometric" && (
        <div className="space-y-4">
          <div className="mb-6 flex justify-center">
            <div
              className={`rounded-lg p-4 ${isAuthenticating ? "animate-pulse bg-blue-50" : "bg-blue-50"}`}
            >
              <Fingerprint className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-lg">Biometric Authentication</h2>
            <p className="mt-2 text-gray-600 text-sm">
              {isAuthenticating
                ? "Waiting for biometric input..."
                : "Place your finger on the sensor or look at the camera"}
            </p>
          </div>

          {isAuthenticating && (
            <div className="flex justify-center">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}

          {attemptCount > 0 && !isAuthenticating && (
            <div className="rounded-lg bg-gray-50 p-3 text-center text-gray-600 text-xs">
              Attempt {attemptCount}
            </div>
          )}

          <div className="flex gap-3">
            {!isAuthenticating && (
              <button
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                onClick={handleRetry}
              >
                Try Again
              </button>
            )}

            {showFallback && (
              <button
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                disabled={isAuthenticating}
                onClick={handleUseFallback}
              >
                {fallbackLabel}
              </button>
            )}
          </div>
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
              Authenticated Successfully!
            </h2>
            <p className="mt-2 text-green-800 text-sm">
              You're now securely logged in.
            </p>
          </div>

          <p className="text-center text-gray-500 text-xs">Redirecting...</p>
        </div>
      )}

      {/* Error Step */}
      {step === "error" && authenticateError && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">
                  Authentication Failed
                </h3>
                <p className="mt-1 text-red-800 text-sm">{authenticateError}</p>
                <p className="mt-2 text-red-700 text-xs italic">
                  Try again or use your PIN to authenticate.
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
            {showFallback && (
              <button
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                onClick={handleUseFallback}
              >
                {fallbackLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback PIN Step */}
      {step === "fallback" && (
        <form className="space-y-4" onSubmit={handlePinSubmit}>
          <div className="mb-6 flex justify-center">
            <div className="rounded-lg bg-amber-50 p-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="font-semibold text-lg">Enter Your PIN</h2>
            <p className="mt-2 text-gray-600 text-sm">
              Biometric authentication is not working. Please enter your PIN to
              continue.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700 text-sm">
              PIN
            </label>
            <input
              autoFocus
              className={`w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-1 ${
                pinError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              disabled={isAuthenticating}
              onChange={(e) => {
                setPin(e.target.value);
                setPinError("");
              }}
              placeholder="Enter 4+ digit PIN"
              type={showPin ? "text" : "password"}
              value={pin}
            />
            {pinError && (
              <p className="mt-1 text-red-600 text-sm">{pinError}</p>
            )}
          </div>

          <label className="flex items-center gap-2">
            <input
              checked={showPin}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onChange={(e) => setShowPin(e.target.checked)}
              type="checkbox"
            />
            <span className="text-gray-600 text-sm">Show PIN</span>
          </label>

          <div className="flex gap-3">
            <button
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isAuthenticating || !pin}
              type="submit"
            >
              {isAuthenticating ? (
                <>
                  <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </button>
            <button
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              disabled={isAuthenticating}
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
