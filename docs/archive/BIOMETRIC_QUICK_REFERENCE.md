# Biometric Authentication - Quick Reference

## 🚀 Quick Start (5 minutes)

### 1. Add Login Component
```typescript
// pages/login.tsx
import { BiometricAuth } from '@/components/biometric/BiometricAuth';

export default function LoginPage() {
  return (
    <BiometricAuth 
      onSuccess={() => window.location.href = '/dashboard'}
      showFallback={true}
    />
  );
}
```

### 2. Add Registration
```typescript
// pages/settings/biometric.tsx
import { BiometricRegistration } from '@/components/biometric/BiometricRegistration';
import { BiometricCredentialManager } from '@/components/biometric/BiometricCredentialManager';

export default function BiometricSettingsPage() {
  return (
    <div>
      <BiometricRegistration />
      <BiometricCredentialManager />
    </div>
  );
}
```

### 3. Use the Hook
```typescript
'use client';
import { useBiometric } from '@/lib/biometric/use-biometric';

export function MyComponent() {
  const { 
    isSupported, 
    authenticateBiometric,
    getSessionToken 
  } = useBiometric();

  const handleAuth = async () => {
    const success = await authenticateBiometric();
    if (success) {
      const token = getSessionToken();
      // Use token in API calls
    }
  };

  return <button onClick={handleAuth}>Sign In</button>;
}
```

---

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_APP_DOMAIN=example.com
NEXT_PUBLIC_APP_URL=https://example.com

# Rate Limits
BIOMETRIC_AUTH_WINDOW_MS=900000        # 15 minutes
BIOMETRIC_AUTH_MAX_ATTEMPTS=5          # 5 tries
BIOMETRIC_REGISTER_WINDOW_MS=3600000   # 1 hour
BIOMETRIC_REGISTER_MAX_ATTEMPTS=10     # 10 tries
```

---

## 📚 Core Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `lib/biometric/secure-storage.ts` | AES-256 encryption | 342 |
| `lib/biometric/webauthn-service.ts` | FIDO2 protocol | 512 |
| `lib/biometric/use-biometric.ts` | React hook | 603 |
| `lib/biometric/errors.ts` | Error handling | 400+ |
| `lib/biometric/rate-limit.ts` | Rate limiting | 300+ |
| `lib/biometric/audit-logger.ts` | Audit logging | 500+ |
| `components/biometric/BiometricAuth.tsx` | Login UI | 300+ |
| `components/biometric/BiometricRegistration.tsx` | Registration UI | 250+ |
| `components/biometric/BiometricCredentialManager.tsx` | Management UI | 200+ |

---

## 🎯 Common Tasks

### Check if Biometric is Supported
```typescript
const { isSupported } = useBiometric();
if (!isSupported) {
  // Show fallback UI
}
```

### Get Session Token
```typescript
const { getSessionToken } = useBiometric();
const token = getSessionToken();

// Use in API calls
fetch('/api/protected', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Register New Credential
```typescript
const { initiateRegistration, completeRegistration } = useBiometric();

await initiateRegistration('iPhone Face ID');
const credential = await completeRegistration('iPhone Face ID');
```

### Log User Out
```typescript
const { clearSession } = useBiometric();
clearSession();
```

### Handle Errors
```typescript
import { BiometricError, BiometricErrorCode } from '@/lib/biometric/errors';

try {
  await authenticateBiometric();
} catch (error) {
  if (error instanceof BiometricError) {
    console.log(error.getUserMessage());
    console.log(error.suggestRecovery());
  }
}
```

---

## 🔒 Security Checklist

Before deploying:

- [ ] Enable HTTPS/TLS 1.3
- [ ] Set rate limit environment variables
- [ ] Configure audit log retention
- [ ] Setup error logging endpoint
- [ ] Configure rate limit response handling
- [ ] Review encryption settings
- [ ] Enable security headers
- [ ] Test in production-like environment
- [ ] Review audit logs setup
- [ ] Test fallback mechanisms

---

## 🧪 Testing

### Test Registration
1. Go to `/settings/biometric`
2. Click "Add New Biometric"
3. Follow on-screen prompts
4. Verify credential appears in list

### Test Authentication
1. Go to `/login`
2. See biometric prompt
3. Complete biometric auth
4. Verify redirect to dashboard

### Test Fallback
1. Go to `/login`
2. Click "Use PIN"
3. Enter PIN
4. Verify authentication works

### Test Rate Limiting
1. Go to `/login`
2. Fail auth 5 times rapidly
3. See rate limit message
4. Try PIN fallback
5. Verify IP-based limiting

---

## 🐛 Debugging

### Enable Debug Logging
```typescript
// In your component
if (process.env.NEXT_PUBLIC_DEBUG_BIOMETRIC) {
  console.log('[BIOMETRIC]', 'Debug info');
}
```

### Check LocalStorage
```javascript
// In browser console
localStorage.getItem('triumph_session_' + userId)  // Session token
localStorage.getItem('triumph_cred_*')              // Credentials
```

### Inspect API Calls
1. Open DevTools > Network
2. Filter by "biometric"
3. Check request/response payloads
4. Look for errors in response

### Check Audit Logs
```javascript
// In browser console
fetch('/api/biometric/audit/logs').then(r => r.json())
```

---

## ⚠️ Common Issues

### "Not Supported"
→ Device doesn't support WebAuthn
→ Use PIN fallback
→ Check browser compatibility

### "Hardware Unavailable"
→ Enable biometric in device settings
→ Try again after device unlock
→ Use PIN fallback

### "Verification Failed"
→ Clean biometric sensor
→ Try again with proper placement
→ Use PIN fallback

### "Rate Limited"
→ Wait 15 minutes
→ Use PIN fallback
→ Check for brute force

### Session Expired
→ Re-authenticate
→ Check session timeout
→ Clear browser cache

---

## 📊 Monitoring

### Metrics to Track
- Authentication success rate
- Failed authentication attempts
- Rate limit violations
- Registration conversion
- Credential usage

### Alerts to Setup
- 🚨 >50% auth failure rate
- 🚨 Suspicious activity detected
- ⚠️ High rate limit violations

---

## 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/biometric/register/initiate` | Start registration |
| POST | `/api/biometric/register/verify` | Verify credential |
| POST | `/api/biometric/authenticate/initiate` | Start auth |
| POST | `/api/biometric/authenticate/verify` | Verify auth |
| POST | `/api/biometric/authenticate/fallback` | PIN auth |
| GET | `/api/biometric/credentials` | List credentials |
| DELETE | `/api/biometric/credentials/:id` | Delete credential |

---

## 📖 Documentation Files

| File | Content |
|------|---------|
| `BIOMETRIC_SECURITY_GUIDE.md` | Full security documentation |
| `BIOMETRIC_IMPLEMENTATION_COMPLETE.md` | Integration checklist |
| `BIOMETRIC_IMPLEMENTATION_SUMMARY.md` | Executive summary |

---

## 🆘 Support

**For issues**:
1. Check troubleshooting section in Security Guide
2. Review error messages and suggestions
3. Check audit logs for details
4. Inspect browser console
5. Review API responses

**For questions**:
1. See FAQ in Security Guide
2. Review implementation examples
3. Check code comments
4. Review TypeScript types

---

## ⏱️ Performance Tips

- Lazy load biometric components
- Cache credentials locally
- Debounce rate limit checks
- Use React.memo for components
- Implement connection pooling (backend)

---

## 🎓 Learn More

- [FIDO2 Specification](https://fidoalliance.org/)
- [WebAuthn Standard](https://www.w3.org/TR/webauthn-2/)
- [OWASP Auth Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Version**: 1.0.0
**Last Updated**: January 15, 2024
**Status**: Production Ready ✅
