/**
 * Tests for POST /api/pi/auth — server-side validation of Pi access tokens
 * against GET https://api.minepi.com/v2/me (no API key required).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST, GET, DELETE } from "@/app/api/pi/auth/route";

const PI_ME_URL = "https://api.minepi.com/v2/me";

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pi/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pi/auth", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  beforeEach(() => {
    fetchSpy.mockReset();
  });

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it("rejects requests with no accessToken", async () => {
    const res = await POST(makePostReq({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "accessToken required" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects requests with non-string accessToken", async () => {
    const res = await POST(makePostReq({ accessToken: 12345 }));
    expect(res.status).toBe(400);
  });

  it("calls Pi /v2/me with Bearer token and no API key", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          uid: "pi-uid-abc",
          username: "pioneer_test",
          credentials: { scopes: ["username"], valid_until: { timestamp: 0, iso8601: "" } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await POST(makePostReq({ accessToken: "tok-xyz" }));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(PI_ME_URL);
    expect((init as RequestInit).method).toBe("GET");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-xyz");
    // No Pi API key should be sent — quick-start auth flow does not use one.
    for (const k of Object.keys(headers)) {
      expect(k.toLowerCase()).not.toContain("api-key");
      expect(k.toLowerCase()).not.toContain("pi-api");
    }

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ uid: "pi-uid-abc", username: "pioneer_test" });

    // Session cookie set, httpOnly
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("pi_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("returns 401 when Pi /v2/me rejects the token", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("invalid token", { status: 401 })
    );
    const res = await POST(makePostReq({ accessToken: "bad" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when Pi /v2/me returns incomplete user data", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ uid: "" }), { status: 200 })
    );
    const res = await POST(makePostReq({ accessToken: "tok" }));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/pi/auth", () => {
  it("returns 401 when no session cookie present", async () => {
    const req = new NextRequest("http://localhost/api/pi/auth");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns the parsed session when cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/pi/auth");
    req.cookies.set(
      "pi_session",
      JSON.stringify({ uid: "u1", username: "alice", authenticatedAt: Date.now() })
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ uid: "u1", username: "alice" });
  });
});

describe("DELETE /api/pi/auth", () => {
  it("clears the pi_session cookie", async () => {
    const req = new NextRequest("http://localhost/api/pi/auth", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("pi_session=");
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/);
  });
});
