import { NextRequest, NextResponse } from 'next/server';
import { approvePOST } from 'pi-sdk-nextjs';

export async function POST(req: NextRequest) {
  // TODO: Fill this handler with Pi logic or call out to your SDK
  return approvePOST(req);
}