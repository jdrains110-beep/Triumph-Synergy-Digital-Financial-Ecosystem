'use client';

/**
 * Biometric Registration Component
 * User-friendly workflow to register biometric credentials
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Fingerprint, Loader, Plus } from 'lucide-react';
import { useBiometric } from '@/lib/biometric/use-biometric';
import { BiometricError } from '@/lib/biometric/errors';

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

  const [step, setStep] = useState<'intro' | 'setup' | 'registering' | 'success' | 'error'>('intro');
  const [credentialName, setCredentialName] = useState(initialCredentialName || '');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-register if requested and supported
  useEffect(() => {
    if (autoRegister && isSupported && step === 'intro') {
      handleStartRegistration();
    }
  }, [autoRegister, isSupported, step]);

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Biometric Not Supported</h3>
            <p className="mt-1 text-sm text-yellow-800">
              Your device does not support biometric authentication. You can still use PIN or password authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleStartRegistration = async () => {
    resetErrors();
    setStep('setup');
    try {
      await initiateRegistration(credentialName);
      setStep('registering');
    } catch (error) {
      console.error('Registration initiation failed:', error);
      setStep('error');
    }
  };

  const handleCompleteRegistration = async () => {
    try {
      const credential = await completeRegistration(credentialName);
      if (credential) {
        setStep('success');
        setSuccessMessage(`Biometric credential "${credential.name}" registered successfully!`);
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setStep('error');
      }
    } catch (error) {
      console.error('Registration completion failed:', error);
      setStep('error');
    }
  };

  const handleRetry = () => {
    resetErrors();
    setStep('intro');
  };

  const handleCancel = () => {
    resetErrors();
    setStep('intro');
    onCancel?.();
  };

  return (
    <div className="w-full space-y-4">
      {/* Intro Step */}
      {step === 'intro' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="rounded-lg bg-blue-50 p-4">
              <Fingerprint className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Register Biometric Authentication</h2>
            <p className="mt-2 text-sm text-gray-600">
              Enhance your account security with biometric authentication. Use your fingerprint, face, or Windows Hello to securely access your account.
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <ul className="space-y-2">
              <li>✓ Fast and secure login</li>
              <li>✓ No passwords needed</li>
              <li>✓ Works offline after initial setup</li>
              <li>✓ Can add multiple biometric credentials</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStartRegistration}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Start Registration
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Setup Step */}
      {step === 'setup' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Set Up Biometric</h2>
            <p className="mt-2 text-sm text-gray-600">
              Give your biometric credential a name to identify it (e.g., "My Phone Face ID", "Work Laptop").
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credential Name (Optional)
            </label>
            <input
              type="text"
              value={credentialName}
              onChange={(e) => setCredentialName(e.target.value)}
              placeholder="e.g., iPhone Face ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-2">Next, you'll need to:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Follow the biometric prompt on your device</li>
              <li>Complete the authentication process</li>
              <li>Confirm the registration</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCompleteRegistration}
              disabled={isRegistering}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRegistering ? (
                <>
                  <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                  Setting Up...
                </>
              ) : (
                'Continue'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isRegistering}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Registering Step */}
      {step === 'registering' && (
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="rounded-lg bg-blue-50 p-4 animate-pulse">
              <Fingerprint className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold">Biometric Authentication in Progress</h2>
            <p className="mt-2 text-sm text-gray-600">
              Please provide your biometric input now. Follow the prompts on your device.
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <Loader className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
            <p className="text-sm text-blue-900">Waiting for biometric input...</p>
          </div>

          <button
            onClick={handleCancel}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="rounded-lg bg-green-50 p-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-green-900">Registration Successful!</h2>
            <p className="mt-2 text-sm text-green-800">{successMessage}</p>
          </div>

          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-900">
              You can now use biometric authentication to log in quickly and securely.
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">Redirecting...</p>
        </div>
      )}

      {/* Error Step */}
      {step === 'error' && registerError && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Registration Failed</h3>
                <p className="mt-1 text-sm text-red-800">{registerError}</p>
                <p className="mt-2 text-xs text-red-700 italic">
                  Please try again or contact support if the issue persists.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Registered Credentials Info */}
      {registeredCredentials.length > 0 && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">
            {registeredCredentials.length} biometric credential{registeredCredentials.length !== 1 ? 's' : ''} registered
          </p>
          <ul className="mt-2 space-y-1">
            {registeredCredentials.map((cred) => (
              <li key={cred.id} className="text-xs text-gray-600">
                • {cred.name || 'Unnamed'} ({new Date(cred.createdAt).toLocaleDateString()})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
