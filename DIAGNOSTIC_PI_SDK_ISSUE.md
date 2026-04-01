# 🔍 CRITICAL: Pi SDK Diagnostic Guide - Find the Real Problem

**Status:** Root cause diagnostics deployed  
**Commit:** `fb20620`  
**Goal:** Identify EXACTLY where the Pi SDK chain is breaking

---

## The Problem Chain

Pi Browser loads your app like this:

```
1. Pi Browser visits: triumphsynergy0576.pinet.com
                              ↓
2. Browser calls: /.well-known/pi-app-verification  ← CRITICAL CHECK
                              ↓
3. Must get valid JSON with matching verification key
                              ↓
4. If passes: Shows app, injects window.Pi
   If fails: Shows blank screen  ❌
                              ↓
5. App loads Pi SDK script
                              ↓
6. window.Pi global is available
                              ↓
7. Payment buttons work
```

**Something in this chain is breaking. We need to find where.**

---

## How to Diagnose

### Step 1: Check Console Logs (MOST IMPORTANT)

Open Pi Browser, access your app, press **F12** to open developer console.

**Look for these logs:**

#### GOOD - You should see:
```
[TRIUMPH SYNERGY] Page loaded at: 2026-01-30T...
[TRIUMPH SYNERGY] Current domain: triumphsynergy0576.pinet.com
[TRIUMPH SYNERGY] User Agent: PiBrowser/... 
[TRIUMPH SYNERGY] window.Pi before script: undefined
[TRIUMPH SYNERGY] 🎉 Pi SDK LOADED: {init: ƒ, auth: {…}, ...}
```

#### BAD - If you see:
```
[TRIUMPH SYNERGY] Page loaded at: ...
[TRIUMPH SYNERGY] Current domain: triumphsynergy0576.pinet.com
[TRIUMPH SYNERGY] window.Pi before script: undefined
(then silence - nothing else loads)
```

This means **Pi SDK script is not loading**.

### Step 2: Test Verification Endpoint

While in Pi Browser console, run:
```javascript
fetch('/.well-known/pi-app-verification')
  .then(r => r.json())
  .then(d => console.log("VERIFICATION RESPONSE:", d))
  .catch(e => console.error("VERIFICATION ERROR:", e))
```

**Good Response:**
```javascript
{
  domain: "triumphsynergy0576.pinet.com",
  appId: "triumph-synergy", 
  verification: "efee2c5a2ce4e...",  // Long key
  network: "mainnet",
  version: "1.0"
}
```

**Bad Response:**
- 404 error
- Empty response
- Missing `verification` key

### Step 3: Test Pi SDK Script Loading

In console, run:
```javascript
console.log("window.Pi exists?", typeof window.Pi);
console.log("window.Pi value:", window.Pi);

// Try to use it
if (window.Pi && window.Pi.init) {
  console.log("✅ Pi SDK is functional");
} else {
  console.log("❌ Pi SDK is broken");
}
```

### Step 4: Check Network Tab

Press F12 → Network tab → Reload page

Look for these requests:

| Request | Status | Expected |
|---------|--------|----------|
| `/.well-known/pi-app-verification` | 200 | ✅ JSON response |
| `https://sdk.minepi.com/pi-sdk.js` | 200 | ✅ Script loaded |
| Domain URL (0576, 1991, or 7386) | 200 | ✅ HTML loaded |

If any shows 404 or 5xx error, that's the problem.

---

## Copy-Paste Diagnostic Script

Run this in Pi Browser console to get complete diagnostics:

```javascript
console.log("=".repeat(60));
console.log("TRIUMPH SYNERGY DIAGNOSTIC");
console.log("=".repeat(60));

// 1. Domain Check
console.log("📍 DOMAIN CHECK:");
console.log("  Current Domain:", window.location.hostname);
console.log("  Current URL:", window.location.href);

// 2. Pi Browser Check
console.log("\n🔷 PI BROWSER CHECK:");
console.log("  User Agent:", navigator.userAgent);
console.log("  Is Pi Browser:", navigator.userAgent.toLowerCase().includes("pibrowser"));
console.log("  window.Pi exists:", typeof window.Pi !== "undefined");
console.log("  window.Pi value:", window.Pi || "NOT FOUND");

// 3. Verification Check
console.log("\n✓ VERIFICATION ENDPOINT CHECK:");
fetch('/.well-known/pi-app-verification')
  .then(r => r.json())
  .then(d => {
    console.log("  ✓ Endpoint accessible");
    console.log("  Response:", d);
    console.log("  Has verification key:", !!d.verification);
    console.log("  Domain matches:", d.domain === window.location.hostname);
  })
  .catch(e => console.error("  ❌ Endpoint ERROR:", e));

// 4. SDK Script Check
console.log("\n📦 SDK SCRIPT CHECK:");
const scripts = Array.from(document.scripts);
const piScripts = scripts.filter(s => s.src.includes("pi-sdk"));
console.log("  Found Pi SDK scripts:", piScripts.length);
piScripts.forEach((s, i) => {
  console.log(`  [${i+1}] ${s.src} - Ready:`, s.readyState);
});

// 5. Try to use Pi SDK
console.log("\n🎮 PI SDK FUNCTIONAL CHECK:");
if (window.Pi) {
  console.log("  window.Pi.init exists:", typeof window.Pi.init);
  console.log("  window.Pi.createPayment exists:", typeof window.Pi.createPayment);
  console.log("  window.Pi.auth exists:", typeof window.Pi.auth);
  console.log("  ✅ SDK APPEARS FUNCTIONAL");
} else {
  console.log("  ❌ window.Pi is NOT available");
}

console.log("\n" + "=".repeat(60));
```

---

## What To Report Back

When you run the diagnostic, tell me:

1. **What domain are you testing?** (0576, 1991, or 7386)
2. **Console logs - copy paste the exact output**
3. **Network tab - any 404 errors?**
4. **Does app show on screen?**
   - [ ] Blank white screen
   - [ ] Shows partial content
   - [ ] Shows full app
   - [ ] Shows error message

5. **Payment button status:**
   - [ ] Button exists but greyed out
   - [ ] Button doesn't exist
   - [ ] Button highlighted/active
   - [ ] Clicking button does nothing
   - [ ] Clicking button shows error: ...

6. **Exact error message you see (if any):** Copy it exactly

---

## Quick Fix Checklist

After each change, do:
1. ✅ Hard refresh: **Ctrl+Shift+R**
2. ✅ Clear storage: Console → `localStorage.clear()`
3. ✅ Reopen Pi Browser app
4. ✅ Open console F12
5. ✅ Run diagnostic script above
6. ✅ Report exact output

---

## Common Issues & Fixes

### Issue: "Payment failed: Pi SDK not available"
**Diagnosis:** window.Pi is undefined  
**Cause:** Script didn't load or loaded too late  
**Fix:** Check Network tab - is pi-sdk.js returning 200?

### Issue: Blank white screen in Pi Browser
**Diagnosis:** App failed domain verification  
**Cause:** /.well-known/pi-app-verification returning wrong data  
**Fix:** Run diagnostic - check verification endpoint response

### Issue: "Cannot read properties of undefined"
**Diagnosis:** Code trying to use Pi before it loads  
**Cause:** Race condition - app initialized before SDK  
**Fix:** Check console for order of messages

### Issue: Payment button doesn't respond
**Diagnosis:** Pi SDK loaded but not initialized  
**Cause:** Pi.init() not called  
**Fix:** Should be in our latest code - verify from console

---

## Next Steps

1. **Refresh** in Pi Browser (Ctrl+Shift+R)
2. **Wait 10 seconds** for app to fully load
3. **Press F12** to open console
4. **Copy-paste** the diagnostic script above into console
5. **Run it** and copy the complete output
6. **Tell me exactly what you see**

This will tell us if the problem is:
- Domain verification (step 2)
- SDK script loading (step 5)
- SDK initialization (step 6)
- Something else (step 4)

Once we know WHERE it's breaking, we can fix it properly.

**CRITICAL:** The real issue is somewhere in this chain. Let's find it.
