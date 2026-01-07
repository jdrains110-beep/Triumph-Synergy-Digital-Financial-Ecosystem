/**
 * Biometric Login Component
 * Handles biometric authentication during login
 */

'use client';

import { useState, useEffect } from 'react';
import { useBiometric } from '@/lib/biometric/use-biometric';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

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

  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'biometric' | 'pin' | 'password'>(
    registeredCredentials.length > 0 ? 'biometric' : 'pin'
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
      onError(authenticateError || 'Biometric authentication failed');
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin || pin.length < 4) {
      onError?.('PIN must be at least 4 digits');
      return;
    }

    try {
      setIsPinLoading(true);
      resetErrors();
      const success = await authenticateWithFallback(pin);

      if (!success) {
        onError?.(authenticateError || 'PIN authentication failed');
      }
    } finally {
      setIsPinLoading(false);
      setPin('');
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      onError?.('Password is required');
      return;
    }

    try {
      setIsPasswordLoading(true);
      resetErrors();
      const success = await authenticateWithFallback(password);

      if (!success) {
        onError?.(authenticateError || 'Password authentication failed');
      }
    } finally {
      setIsPasswordLoading(false);
      setPassword('');
    }
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Biometric Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Your device does not support biometric authentication. Please use PIN or
              password to log in.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Secure Login
        </CardTitle>
        <CardDescription>
          Choose your preferred authentication method
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            {registeredCredentials.length > 0 && (
              <TabsTrigger value="biometric" className="text-xs">
                <Fingerprint className="w-4 h-4 mr-1" />
                Biometric
              </TabsTrigger>
            )}
            <TabsTrigger value="pin" className="text-xs">
              <Lock className="w-4 h-4 mr-1" />
              PIN
            </TabsTrigger>
            <TabsTrigger value="password" className="text-xs">
              <Lock className="w-4 h-4 mr-1" />
              Password
            </TabsTrigger>
          </TabsList>

          {/* Biometric Login */}
          {registeredCredentials.length > 0 && (
            <TabsContent value="biometric" className="space-y-4 mt-4">
              {authenticateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{authenticateError}</AlertDescription>
                </Alert>
              )}

              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Fingerprint className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold">Biometric Authentication</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {registeredCredentials.length} credential
                    {registeredCredentials.length !== 1 ? 's' : ''} registered
                  </p>
                </div>

                <Button
                  onClick={handleBiometricLogin}
                  disabled={isAuthenticating}
                  size="lg"
                  className="w-full"
                >
                  {isAuthenticating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isAuthenticating ? 'Scanning...' : 'Use Biometric'}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Place your finger on the reader or look at your camera
                </p>
              </div>
            </TabsContent>
          )}

          {/* PIN Login */}
          <TabsContent value="pin" className="space-y-4 mt-4">
            {authenticateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authenticateError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePinLogin} className="space-y-3">
              <div>
                <label className="text-sm font-medium">PIN</label>
                <Input
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  disabled={isPinLoading}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numeric PIN (4-6 digits)
                </p>
              </div>

              <Button
                type="submit"
                disabled={isPinLoading || pin.length < 4}
                size="lg"
                className="w-full"
              >
                {isPinLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isPinLoading ? 'Verifying...' : 'Login with PIN'}
              </Button>
            </form>
          </TabsContent>

          {/* Password Login */}
          <TabsContent value="password" className="space-y-4 mt-4">
            {authenticateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authenticateError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPasswordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPasswordLoading || !password}
                size="lg"
                className="w-full"
              >
                {isPasswordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isPasswordLoading ? 'Verifying...' : 'Login with Password'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Success State */}
        {sessionToken && (
          <Alert className="mt-4 bg-green-50 border-green-200">
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
