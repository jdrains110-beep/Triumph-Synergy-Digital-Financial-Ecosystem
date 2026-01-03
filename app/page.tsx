'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Triumph Synergy - Loading',
  description: 'Initializing application',
};

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to chat after brief delay
    const timer = setTimeout(() => {
      router.replace('/(chat)');
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Triumph Synergy</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced Payment Routing & Compliance
          </p>
        </div>
        <div className="animate-pulse">
          <p className="text-sm text-gray-500">Initializing application...</p>
        </div>
      </div>
    </main>
  );
}
