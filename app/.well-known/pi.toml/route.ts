/**
 * app/.well-known/pi.toml/route.ts
 *
 * Next.js App Router route handler that serves the Pi Tokens manifest.
 *
 * Files under `public/.well-known/` are NOT reliably served because:
 *   1. Next.js skips dotfile-prefixed directories in `public/` by default.
 *   2. The Pi App Studio / Google Cloud proxy in front of pinet.com
 *      intercepts `/.well-known/*` requests before they reach the Next
 *      server unless an explicit Next route claims the path.
 *
 * A real route handler bypasses both problems — the path is owned by
 * Next at build time and the proxy forwards it.
 *
 * Spec: https://github.com/pi-apps/pi-platform-docs/blob/master/tokens.md
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600; // re-read once an hour

export async function GET() {
  const file = path.join(
    process.cwd(),
    "public",
    ".well-known",
    "pi.toml",
  );
  const body = await readFile(file, "utf8");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "access-control-allow-origin": "*",
    },
  });
}
