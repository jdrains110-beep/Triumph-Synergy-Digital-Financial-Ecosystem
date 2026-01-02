import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  // Allow public access to validation key endpoints
  if (
    request.nextUrl.pathname === "/validation-key.txt" ||
    request.nextUrl.pathname === "/api/validation-key"
  ) {
    // Skip deployment protection for validation endpoints
    const response = NextResponse.next();
    response.headers.set("x-vercel-skip-protection", "1");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/validation-key.txt", "/api/validation-key"],
};
