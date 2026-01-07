/**
 * Biometric Registration Component
 * Allows users to register fingerprint/Face ID credentials
 */

'use client';

import { useState } from 'react';
import { useBiometric } from '@/lib/biometric/use-biometric';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Fingerprint, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

export function BiometricRegistration() {
  const {
    isSupported,
    isUserVerificationAvailable,
    isRegistering,
    registerError,
    registeredCredentials,
    initiateRegistration,
    completeRegistration,
    removeCredential,
    resetErrors,
  } = useBiometric();

  const [credentialName, setCredentialName] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'idle' | 'initiated' | 'pending'>('idle');

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Biometric Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Your device or browser does not support biometric authentication (WebAuthn).
              Please use a modern browser with biometric capabilities.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleInitiateRegistration = async () => {
    try {
      setIsInitiating(true);
      resetErrors();
      await initiateRegistration(credentialName);
      setRegistrationStep('initiated');
    } catch (error) {
      console.error('Failed to initiate registration:', error);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCompleteRegistration = async () => {
    try {
      setRegistrationStep('pending');
      const credential = await completeRegistration(credentialName);

      if (credential) {
        setCredentialName('');
        setRegistrationStep('idle');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setRegistrationStep('idle');
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    if (window.confirm('Remove this biometric credential?')) {
      await removeCredential(credentialId);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Registration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Register Biometric Credential
          </CardTitle>
          <CardDescription>
            {isUserVerificationAvailable
              ? 'Add a biometric (fingerprint, Face ID, etc.) for quick authentication'
              : 'Add a security key or other authenticator'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {registerError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{registerError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Credential Name (Optional)
            </label>
            <Input
              placeholder="e.g., iPhone Face ID, Windows Hello"
              value={credentialName}
              onChange={(e) => setCredentialName(e.target.value)}
              disabled={isRegistering || registrationStep !== 'idle'}
            />
            <p className="text-xs text-muted-foreground">
              Give this credential a name to identify it later
            </p>
          </div>

          {registrationStep === 'idle' && (
            <Button
              onClick={handleInitiateRegistration}
              disabled={isInitiating}
              className="w-full"
              size="lg"
            >
              {isInitiating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start Registration
            </Button>
          )}

          {registrationStep === 'initiated' && (
            <div className="space-y-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Place your finger on the reader or look at your camera to complete registration.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleCompleteRegistration}
                disabled={isRegistering}
                className="w-full"
                size="lg"
              >
                {isRegistering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isRegistering ? 'Registering...' : 'Complete Registration'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Credentials */}
      {registeredCredentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Registered Credentials ({registeredCredentials.length})
            </CardTitle>
            <CardDescription>
              Your registered biometric credentials
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {registeredCredentials.map((credential) => (
                <div
                  key={credential.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {credential.name || 'Unnamed Credential'}
                    </p>
                    <div className="text-xs text-muted-foreground space-x-2 mt-1">
                      <span>
                        Added:{' '}
                        {new Date(credential.createdAt).toLocaleDateString()}
                      </span>
                      {credential.lastUsedAt && (
                        <span>
                          Last used:{' '}
                          {new Date(credential.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {credential.credentialDeviceType && (
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 rounded px-2 py-1 mt-2">
                        {credential.credentialDeviceType === 'single_device'
                          ? 'Platform Device'
                          : 'Cross-Platform Key'}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCredential(credential.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            How Biometric Authentication Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 text-muted-foreground">
          <p>
            🔒 <strong>Secure:</strong> Your biometric data never leaves your device.
            Only encrypted credentials are stored on our servers.
          </p>
          <p>
            ⚡ <strong>Fast:</strong> Authenticate in seconds with your fingerprint,
            Face ID, or other biometric method.
          </p>
          <p>
            🔄 <strong>Reliable:</strong> Falls back to PIN/password if biometrics
            aren't available.
          </p>
          <p>
            🛡️ <strong>Standards-based:</strong> Uses WebAuthn (FIDO2), the security
            standard adopted by major platforms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
