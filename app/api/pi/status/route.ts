/**
 * Pi Network Status API
 * Returns comprehensive status of Pi Network integration
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PiIntegrationStatus {
  status: 'operational' | 'degraded' | 'offline';
  timestamp: string;
  version: string;
  
  // SDK Status
  sdk: {
    available: boolean;
    version: string;
    sandbox: boolean;
  };
  
  // API Status
  api: {
    approve: boolean;
    complete: boolean;
    value: boolean;
    webhooks: boolean;
  };
  
  // Payment Configuration
  payments: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    internalMultiplier: number;
    externalMultiplier: number;
    stellarSettlement: boolean;
  };
  
  // Integration Status
  integrations: {
    vercel: boolean;
    github: boolean;
    stellar: boolean;
    supabase: boolean;
  };
  
  // Environment
  environment: {
    production: boolean;
    sandbox: boolean;
    configured: boolean;
  };
}

export async function GET(): Promise<NextResponse<PiIntegrationStatus>> {
  const hasApiKey = !!process.env.PI_API_KEY;
  const hasApiSecret = !!process.env.PI_API_SECRET;
  const hasInternalKey = !!process.env.PI_INTERNAL_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';
  
  const status: PiIntegrationStatus = {
    status: hasApiKey ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    
    sdk: {
      available: true,
      version: '2.0',
      sandbox: isSandbox,
    },
    
    api: {
      approve: hasApiKey,
      complete: hasApiKey,
      value: true,
      webhooks: !!process.env.PI_WEBHOOK_SECRET,
    },
    
    payments: {
      enabled: hasApiKey && hasApiSecret,
      minAmount: parseFloat(process.env.PI_MIN_TRANSACTION || '10'),
      maxAmount: parseFloat(process.env.PI_MAX_TRANSACTION || '100000'),
      internalMultiplier: parseFloat(process.env.INTERNAL_PI_MULTIPLIER || '1.5'),
      externalMultiplier: parseFloat(process.env.EXTERNAL_PI_MULTIPLIER || '1.0'),
      stellarSettlement: !!process.env.STELLAR_PAYMENT_ACCOUNT,
    },
    
    integrations: {
      vercel: isProduction || !!process.env.VERCEL,
      github: true, // Always connected via CI/CD
      stellar: !!process.env.STELLAR_HORIZON_URL,
      supabase: !!process.env.SUPABASE_URL,
    },
    
    environment: {
      production: isProduction,
      sandbox: isSandbox,
      configured: hasApiKey && hasApiSecret && hasInternalKey,
    },
  };
  
  return NextResponse.json(status);
}
