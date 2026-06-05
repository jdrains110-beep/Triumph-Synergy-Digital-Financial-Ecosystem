/**
 * POST /api/pi/auth
 *
 * Validates a Pi Network access token by calling GET https://api.minepi.com/v2/me
 * with Authorization: Bearer <accessToken>.  No Pi API key is required for this flow.
 * On success, writes a secure, httpOnly session cookie and returns the Pioneer's uid + username.
 *
 * Request body: { accessToken: string }
 * Response 200: { uid: string; username: string }
 * Response 401: { error: string }
 */

import { type NextRequest, NextResponse } from "next/server";

// Pi Platform API /v2/me validation endpoint, per network. Both default to the
// canonical Platform API host, but each is independently overridable via env so
// testnet can be pointed at a sandbox validator without a code change. This is
// what makes the testnet trigger work end-to-end instead of silently failing
// against the mainnet-only host.
const PI_ME_MAINNET =
  process.env.PI_PLATFORM_API_URL || "https://api.minepi.com/v2/me";
const PI_ME_TESTNET =
  process.env.PI_PLATFORM_API_TESTNET_URL ||
  process.env.PI_PLATFORM_API_URL ||
  "https://api.minepi.com/v2/me";
const NETWORK_COOKIE = "pi_network";
const SESSION_COOKIE = "pi_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function resolveNetwork(
  bodyNetwork: unknown,
  cookieNetwork: string | undefined,
): "mainnet" | "testnet" {
  const raw = (
    typeof bodyNetwork === "string" ? bodyNetwork : cookieNetwork || ""
  ).toLowerCase();
  return raw === "testnet" ? "testnet" : "mainnet";
}

type PiMeResponse = {
  uid: string;
  username: string;
  credentials?: {
    scopes: string[];
    valid_until: { timestamp: number; iso8601: string };
  };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.accessToken !== "string" || !body.accessToken.trim()) {
      return NextResponse.json({ error: "accessToken required" }, { status: 400 });
    }

    const { accessToken } = body;

    // Select the validation network from the request body, falling back to the
    // pi_network cookie set by the runtime testnet trigger in layout.tsx.
    const network = resolveNetwork(
      body.network,
      request.cookies.get(NETWORK_COOKIE)?.value,
    );
    const piMeUrl = network === "testnet" ? PI_ME_TESTNET : PI_ME_MAINNET;

    // Validate token with Pi Network — no API key needed for /v2/me
    const piRes = await fetch(piMeUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      // Abort quickly if Pi API is slow
      signal: AbortSignal.timeout(10_000),
    });

    if (!piRes.ok) {
      const errText = await piRes.text().catch(() => "");
      console.error(
        `[Pi Auth] ${network} /v2/me rejected token:`,
        piRes.status,
        errText,
      );
      return NextResponse.json(
        { error: "Pi Network rejected the access token", network },
        { status: 401 }
      );
    }

    const piUser = (await piRes.json()) as PiMeResponse;

    if (!piUser.uid || !piUser.username) {
      console.error("[Pi Auth] /v2/me returned incomplete user:", piUser);
      return NextResponse.json(
        { error: "Invalid user data from Pi Network" },
        { status: 401 }
      );
    }

    console.log(`[Pi Auth] Pioneer authenticated: ${piUser.username} (${piUser.uid}) on ${network}`);

    // Build a minimal session payload — never store the raw accessToken in the cookie
    const sessionPayload = JSON.stringify({
      uid: piUser.uid,
      username: piUser.username,
      network,
      authenticatedAt: Date.now(),
    });

    const response = NextResponse.json({
      uid: piUser.uid,
      username: piUser.username,
      network,
    });

    // httpOnly, secure, sameSite=strict — cannot be read by JS on the client
    response.cookies.set(SESSION_COOKIE, sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Pi Auth] Unexpected error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/pi/auth — returns the current session from the cookie, or 401 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const parsed = JSON.parse(session);
    return NextResponse.json({
      uid: parsed.uid,
      username: parsed.username,
      network: parsed.network ?? "mainnet",
    });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}

/** DELETE /api/pi/auth — clears the Pi session cookie (sign-out) */
export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
