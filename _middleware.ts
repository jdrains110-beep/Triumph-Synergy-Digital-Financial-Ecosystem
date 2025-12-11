import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let these paths go through without crashing
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api/_next') || 
      pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // Everything else just works normally (no more crash)
  return NextResponse.next();
}
