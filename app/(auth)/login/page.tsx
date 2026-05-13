"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { usePi } from "@/lib/pi-sdk/pi-provider";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  );

  const { update: updateSession } = useSession();

  // Pi Network auth state
  const { authenticate, isAuthenticated, isLoading: piLoading, user: piUser } = usePi();

  // Auto-trigger Pi authentication on page load when running inside Pi Browser.
  // The layout.tsx inline script has already called Pi.init() as a Promise;
  // by the time this effect runs Pi is ready (or will resolve shortly).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initState = (window as any).__piInitialization;
    // Only auto-trigger when the Pi SDK is present (i.e. we are inside Pi Browser).
    if (initState?.status === "ready" && !isAuthenticated) {
      authenticate();
    } else if (
      initState &&
      initState.status !== "unavailable" &&
      initState.status !== "failed" &&
      !isAuthenticated
    ) {
      // SDK is still initialising — wait for the piReady event then auth.
      const onReady = () => authenticate();
      window.addEventListener("piReady", onReady, { once: true });
      return () => window.removeEventListener("piReady", onReady);
    }
  // authenticate is stable (defined outside component), safe to include.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once Pi auth succeeds, refresh the Next-Auth session so the rest of the
  // app sees the authenticated user, then navigate home.
  useEffect(() => {
    if (isAuthenticated && piUser) {
      updateSession();
      router.push("/");
    }
  }, [isAuthenticated, piUser, updateSession, router]);

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Invalid credentials!",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, router.refresh, updateSession]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Sign In</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Sign in with your Pi Network identity
          </p>
        </div>

        {/* Pi Network sign-in — primary auth method inside Pi Browser */}
        <div className="flex flex-col items-center gap-3 px-4 sm:px-16">
          {isAuthenticated && piUser ? (
            <div className="w-full rounded-xl border border-yellow-400/30 bg-yellow-50/10 px-4 py-3 text-center">
              <p className="font-medium text-sm text-yellow-600 dark:text-yellow-400">
                ✓ Signed in as @{piUser.username}
              </p>
            </div>
          ) : (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6633CC] px-4 py-3 font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={piLoading}
              onClick={() => authenticate()}
              type="button"
            >
              {piLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connecting to Pi…
                </>
              ) : (
                <>
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                  Sign in with Pi Network
                </>
              )}
            </button>
          )}
          <p className="text-center text-gray-400 text-xs">
            Opens the Pi Browser authentication dialog
          </p>
        </div>

        <div className="flex items-center gap-4 px-4 sm:px-16">
          <div className="h-px flex-1 bg-border" />
          <span className="text-gray-400 text-xs">or use email</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
          <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/register"
            >
              Sign up
            </Link>
            {" for free."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
