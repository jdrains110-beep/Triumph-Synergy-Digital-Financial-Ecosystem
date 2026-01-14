"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Attempt to redirect to chat, with fallback to loading the chat directly
    const timer = setTimeout(() => {
      setIsReady(true);
      router.replace("/(chat)/");
    }, 300);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <div className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl tracking-tight">Triumph Synergy</h1>
          <p className="text-gray-600 dark:text-gray-400">
            The World's Most Advanced Payment Platform
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
            Superior to all others on this planet 🌍
          </p>
        </div>
        <div className={isReady ? "opacity-50" : "animate-pulse"}>
          <p className="text-gray-500 text-sm">Loading Pi App Studio...</p>
        </div>
      </div>
    </main>
  );
}
