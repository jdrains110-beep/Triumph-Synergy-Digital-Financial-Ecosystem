import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    POSTGRES_URL: process.env.POSTGRES_URL ? '✓ Set' : '✗ Not set',
    REDIS_URL: process.env.REDIS_URL ? '✓ Set' : '✗ Not set',
    AUTH_SECRET: process.env.AUTH_SECRET ? '✓ Set' : '✗ Not set',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Not set',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'undefined',
    PI_API_KEY: process.env.PI_API_KEY ? '✓ Set' : '✗ Not set',
    SUPABASE_URL: process.env.SUPABASE_URL || 'undefined',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set',
    STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL || 'undefined',
  };

  return NextResponse.json({
    message: 'Environment variables check',
    environment: envVars,
    timestamp: new Date().toISOString(),
  });
}
