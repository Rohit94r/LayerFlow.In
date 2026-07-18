"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Logo from "@/components/marketing/Logo";
import ThemeToggle from "@/components/marketing/ThemeToggle";
import { signIn } from "@/lib/auth-client";
import { ApiClientError } from "@/lib/api/client";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/workspace";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: next.startsWith("/") ? `${window.location.origin}${next}` : next,
      });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign-in failed. Try again.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(68,237,188,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(96,165,250,0.08),_transparent_50%)]"
      />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <p className="text-sm font-medium text-brand">LayerFlow</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Sign in to your workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Continue with Google to open your prompts, budgets, and gateway.
            First login creates your workspace automatically.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {loading ? "Redirecting to Google…" : "Continue with Google"}
          </button>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
            >
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-xs text-faint">
            By continuing you agree to use LayerFlow with your Google account.
            Marketing pages stay public — only the workspace requires sign-in.
          </p>

          <p className="mt-4 text-center text-sm text-muted">
            <Link href="/" className="text-brand hover:underline">
              Back to home
            </Link>
            {" · "}
            <Link href="/docs" className="text-brand hover:underline">
              Docs
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
