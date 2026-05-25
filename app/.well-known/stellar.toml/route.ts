/**
 * app/.well-known/stellar.toml/route.ts
 *
 * SEP-1 stellar.toml served via a Next.js route handler. Same rationale
 * as the pi.toml route — the proxy in front of pinet.com strips
 * /.well-known/* paths from static serving but forwards them when a
 * Next route claims the path.
 *
 * SEP-1: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const file = path.join(
    process.cwd(),
    "public",
    ".well-known",
    "stellar.toml",
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
