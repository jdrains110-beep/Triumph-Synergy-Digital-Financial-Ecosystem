"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to chat after brief delay
    const timer = setTimeout(() => {
      router.replace("/(chat)");
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl tracking-tight">Triumph Synergy</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced Payment Routing & Compliance
          </p>
        </div>
        <div className="animate-pulse">
          <p className="text-gray-500 text-sm">Initializing application...</p>
        </div>
      </div>
    </main>
  );
}
