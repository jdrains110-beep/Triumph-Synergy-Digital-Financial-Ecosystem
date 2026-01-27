# 🔐 Biometric Authentication Quick Start

**Get biometric authentication working in 5 minutes!**

---

## 1. Basic Login Implementation (2 minutes)

### Add BiometricLogin to your login page:

```typescript
// app/login/page.tsx
import { BiometricLogin } from "@/components/biometric/biometric-login";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <BiometricLogin
        onSuccess={() => {
          // Redirect to dashboard
          window.location.href = "/dashboard";
        }}
        onError={(error) => {
          // Show error message
          alert(`Login failed: ${error}`);
        }}
        showFallback={true}
      />
    </div>
  );
}
```

---

## 2. Protected Route (1 minute)

### Verify biometric session before accessing protected pages:

```typescript
// lib/auth/middleware.ts
import { useBiometric } from "@/lib/biometric-sdk/use-biometric";

export function withBiometricAuth(Component: React.ComponentType) {
  return function Protected(props: any) {
    const { session, token } = useBiometric();

    if (!session || !token) {
      return <BiometricLogin onSuccess={() => window.location.reload()} />;
    }

    return <Component {...props} />;
  };
}
```

Use it:
```typescript
export default withBiometricAuth(DashboardPage);
```

---

## 3. Register Biometric (1 minute)

### Add registration to settings page:

```typescript
// app/settings/biometric/page.tsx
import { BiometricRegister } from "@/components/biometric/biometric-register";
import { BiometricManage } from "@/components/biometric/biometric-manage";
import { useUser } from "@/hooks/use-user"; // Your user hook

export default function BiometricSettings() {
  const user = useUser();

  return (
    <div className="space-y-6">
      <BiometricRegister userId={user.id} />
      <BiometricManage userId={user.id} />
    </div>
  );
}
```

---

## 4. API Integration (1 minute)

### Call APIs from your backend:

```typescript
// lib/auth/biometric-auth.ts
export async function verifybiBiometricToken(token: string) {
  const response = await fetch("/api/biometric/session/verify", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Invalid session");
  }

  return response.json();
}

export async function logout() {
  await fetch("/api/biometric/logout", { method: "POST" });
}
```

---

## Common Tasks

### Task 1: Get Current Session

```typescript
const { session, token, hasActiveSession } = useBiometric("user_123");

if (hasActiveSession) {
  console.log("Authenticated as:", session.userId);
  console.log("Token expires in:", session.expiresAt);
}
```

### Task 2: Authenticate with Biometric

```typescript
const { startAuthentication, state } = useBiometric("user_123");

// Trigger authentication
await startAuthentication();

// Monitor state
console.log(state.isAuthenticating);
console.log(state.message);
```

### Task 3: Use Fallback Authentication

```typescript
const { useFallbackAuth } = useBiometric("user_123");

// Authenticate with PIN
await useFallbackAuth("pin", "123456");

// Authenticate with Password
await useFallbackAuth("password", "MySecurePassword123!");
```

### Task 4: Manage Credentials

```typescript
const {
  credentials,
  startRegistration,
  removeCredential,
  canRegisterMore,
} = useBiometric("user_123");

// Check if user can add more
if (canRegisterMore) {
  await startRegistration({
    biometricType: "faceId",
  });
}

// Remove a credential
await removeCredential("cred_123");
```

### Task 5: Handle Errors

```typescript
const { error, cancel } = useBiometric("user_123");

if (error) {
  console.error("Code:", error.code);
  console.error("Message:", error.message);
  console.error("Recoverable:", error.recoverable);
  console.error("Suggestion:", error.suggestedAction);

  // Try again or show fallback
  cancel();
}
```

---

## Environment Setup

### Add to `.env.local`:

```bash
# WebAuthn Configuration
NEXT_PUBLIC_WEBAUTHN_RP_ID=localhost
NEXT_PUBLIC_WEBAUTHN_RP_NAME="Triumph Synergy"

# Session Timeouts (milliseconds)
BIOMETRIC_SESSION_TIMEOUT=1800000
BIOMETRIC_ACCESS_TOKEN_TIMEOUT=3600000
BIOMETRIC_LOCKOUT_DURATION=900000
```

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] HTTP-only cookies configured
- [ ] CSRF protection enabled
- [ ] Rate limiting configured (5 attempts/15 min)
- [ ] Audit logging enabled
- [ ] Session validation on each request
- [ ] Token refresh before expiration
- [ ] Secure database storage
- [ ] Regular security audits
- [ ] User education/training

---

## Testing

### Test Registration

```typescript
// Click "Add New" → Select "Face ID" → Complete biometric prompt
```

### Test Authentication

```typescript
// Login page → Click "Authenticate with Biometric" → Use registered biometric
```

### Test Fallback

```typescript
// Login page → "Use Fallback Method" → Select "PIN" → Enter 6 digits
```

### Test Session Expiration

```typescript
// Monitor session in browser DevTools
// After 30 minutes, session should expire automatically
```

---

## Troubleshooting

### "Biometric not available"
```typescript
// Check if WebAuthn is supported
if (!("PublicKeyCredential" in window)) {
  // Use fallback authentication
}
```

### "Session expired"
```typescript
// Re-authenticate
const { startAuthentication } = useBiometric(userId);
await startAuthentication();
```

### "Too many failed attempts"
```typescript
// Wait 15 minutes or use different method
```

### "Credential not found"
```typescript
// Register new credential
const { startRegistration } = useBiometric(userId);
await startRegistration();
```

---

## File Locations

```
Core Files:
├── lib/biometric-sdk/
│   ├── biometric-config.ts      (configuration)
│   ├── biometric.ts             (manager)
│   └── use-biometric.ts         (hook)
├── components/biometric/
│   ├── biometric-login.tsx
│   ├── biometric-register.tsx
│   └── biometric-manage.tsx
└── app/api/biometric/
    ├── registration/
    ├── authentication/
    ├── fallback/
    ├── credentials/
    ├── session/
    └── logout/
```

---

## Next Steps

1. ✅ Copy code snippets above into your app
2. ✅ Add environment variables
3. ✅ Test biometric registration
4. ✅ Test biometric login
5. ✅ Test fallback methods
6. ✅ Monitor sessions and tokens
7. ✅ Deploy to production
8. ✅ Monitor security metrics

---

## Quick Reference

| Feature | Usage | Time |
|---------|-------|------|
| Register | `startRegistration()` | ~30s |
| Login | `startAuthentication()` | ~5s |
| Fallback | `useFallbackAuth()` | ~3s |
| Verify | `GET /session/verify` | ~50ms |
| Logout | `POST /logout` | ~100ms |

---

## Support Resources

- Full Guide: `BIOMETRIC_INTEGRATION_COMPLETE.md`
- Component Files: `components/biometric/`
- API Endpoints: `app/api/biometric/`
- Configuration: `lib/biometric-sdk/biometric-config.ts`

---

**Ready to go!** 🚀
