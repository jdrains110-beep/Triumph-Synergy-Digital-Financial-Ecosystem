/**
 * tests/unit/pi-sdk-ecosystem.test.ts
 *
 * Whole-ecosystem integrity check for the Pi SDK wiring. Every assertion
 * here is something Pi App Studio's verifier (or a freshly-issued PAS
 * domain on transfer) depends on. If any of these fail, sign-in detection
 * will likely break — keep them green.
 *
 * Coverage:
 *   1. Root layout loads the Pi SDK script with a CSP nonce
 *   2. Auto-init script unconditionally calls Pi.authenticate(['username'])
 *      (no UA gate that the PAS verifier crawler would fail)
 *   3. Auto-init posts the access token to /api/pi/auth
 *   4. Middleware does NOT redirect any host to a hardcoded pinet/vercel URL
 *   5. Middleware forwards x-csp-nonce on the request so server components
 *      can attach it to <script> tags
 *   6. /api/pi-studio/sync acknowledges any runtime hostname (no whitelist)
 *   7. /api/pi/auth validates tokens via GET /v2/me with Bearer only
 *      (no Pi Network API key required)
 *   8. No runtime source file pins a stale Pi App Studio / Vercel domain
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("Pi SDK ecosystem integrity", () => {
  describe("app/layout.tsx", () => {
    const layout = read("app/layout.tsx");

    it("loads pi-sdk.js from sdk.minepi.com with a CSP nonce", () => {
      expect(layout).toMatch(/sdk\.minepi\.com\/pi-sdk\.js/);
      // Both the SDK <script src=...> and the inline init must carry nonce
      const nonceScripts = layout.match(/<script[\s\S]*?nonce=\{nonce\}/g);
      expect(nonceScripts && nonceScripts.length).toBeGreaterThanOrEqual(2);
    });

    it("reads x-csp-nonce from request headers", () => {
      expect(layout).toMatch(/headers\(\)\)\.get\(["']x-csp-nonce["']\)/);
    });

    it("auto-init unconditionally calls Pi.authenticate(['username'])", () => {
      expect(layout).toMatch(/Pi\.authenticate\(\['username'\]/);
      // shouldAutoAuth must be unconditionally true (no UA whitelist gate)
      expect(layout).toMatch(/var shouldAutoAuth = true/);
      // The old pibrowser UA gate must be gone
      expect(layout).not.toMatch(/if \(isPiBrowser\)\s*\{\s*return window\.Pi\.authenticate/);
    });

    it("posts the access token to /api/pi/auth on success", () => {
      expect(layout).toMatch(/fetch\(['"]\/api\/pi\/auth['"]/);
      expect(layout).toMatch(/accessToken: auth\.accessToken/);
    });

    it("does NOT pin a stale Pi App Studio / Vercel hostname", () => {
      expect(layout).not.toMatch(/triumphsynergy\d+\.pinet\.com/);
      expect(layout).not.toMatch(/triumph-synergy\.vercel\.app/);
    });
  });

  describe("middleware.ts", () => {
    const mw = read("middleware.ts");

    it("does NOT redirect *.vercel.app to a hardcoded pinet domain", () => {
      expect(mw).not.toMatch(/redirectUrl\.hostname\s*=\s*["']triumphsynergy/);
      expect(mw).not.toMatch(/NextResponse\.redirect\([^)]*triumphsynergy/);
    });

    it("forwards a per-request CSP nonce via x-csp-nonce request header", () => {
      expect(mw).toMatch(/requestHeaders\.set\(["']x-csp-nonce["']/);
      expect(mw).toMatch(/NextResponse\.next\(\{\s*request:\s*\{\s*headers:\s*requestHeaders/);
    });

    it("emits a CSP allowing sdk.minepi.com with strict-dynamic + nonce", () => {
      expect(mw).toMatch(/script-src[^"]*'nonce-\$\{nonce\}'[^"]*'strict-dynamic'[^"]*sdk\.minepi\.com/);
    });
  });

  describe("app/api/pi-studio/sync/route.ts", () => {
    const sync = read("app/api/pi-studio/sync/route.ts");

    it("does NOT gate sync status on a hardcoded host whitelist", () => {
      expect(sync).not.toMatch(/triumphsynergy\d+\.pinet\.com/);
      expect(sync).not.toMatch(/triumph-synergy\.vercel\.app/);
    });

    it("exports GET, POST, and OPTIONS handlers", () => {
      expect(sync).toMatch(/export async function GET/);
      expect(sync).toMatch(/export async function POST/);
      expect(sync).toMatch(/export async function OPTIONS/);
    });

    it("reflects the caller origin (no hardcoded Access-Control-Allow-Origin)", () => {
      expect(sync).toMatch(/Access-Control-Allow-Origin["']\s*:\s*origin/);
    });
  });

  describe("app/api/pi/auth/route.ts", () => {
    const auth = read("app/api/pi/auth/route.ts");

    it("validates access tokens against api.minepi.com/v2/me", () => {
      expect(auth).toMatch(/api\.minepi\.com\/v2\/me/);
    });

    it("uses Bearer authentication with no Pi Network API key", () => {
      expect(auth).toMatch(/Authorization:\s*`Bearer \$\{[^}]+\}`/);
      expect(auth.toLowerCase()).not.toMatch(/['"]pi-api-key['"]/);
      expect(auth.toLowerCase()).not.toMatch(/['"]x-api-key['"]/);
    });

    it("sets an httpOnly pi_session cookie", () => {
      expect(auth).toMatch(/pi_session/);
      expect(auth).toMatch(/httpOnly:\s*true/);
    });
  });

  describe("manifest + well-known files (post-transfer cleanliness)", () => {
    it("pi-app-manifest.json no longer pins a stale PAS / Vercel domain", () => {
      const manifest = read("pi-app-manifest.json");
      expect(manifest).not.toMatch(/triumphsynergy\d+\.pinet\.com/);
      expect(manifest).not.toMatch(/triumph-synergy\.vercel\.app/);
    });

    it("/.well-known/pi-app-verification.json carries the validation key", () => {
      const json = JSON.parse(
        read("public/.well-known/pi-app-verification.json")
      );
      expect(json.app_id).toBe("triumph-synergy");
      expect(typeof json.validation_key).toBe("string");
      expect(json.validation_key.length).toBeGreaterThan(64);
      expect(json.network).toBe("mainnet");
    });

    it("/.well-known/pi-domain.txt does NOT pin stale domains", () => {
      const txt = read("public/.well-known/pi-domain.txt");
      expect(txt).not.toMatch(/triumphsynergy\d+\.pinet\.com/);
      expect(txt).not.toMatch(/triumph-synergy\.vercel\.app/);
    });
  });

  describe("runtime libs (no domain pinning)", () => {
    const files = [
      "lib/validation/keys.ts",
      "lib/pi-node/registry.ts",
      "lib/hooks/useDeploymentVerification.ts",
      "lib/constants/deployment-urls.ts",
      "next.config.ts",
    ];

    for (const f of files) {
      it(`${f} contains no hardcoded pinet/vercel host`, () => {
        const src = read(f);
        expect(src).not.toMatch(/triumphsynergy\d+\.pinet\.com/);
        expect(src).not.toMatch(/triumph-synergy[^.]*\.vercel\.app/);
      });
    }
  });
});
