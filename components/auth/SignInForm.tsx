"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/marketing/Logo";
import ThemeToggle from "@/components/marketing/ThemeToggle";
import SignInFlowField from "@/components/auth/SignInFlowField";
import { signIn, signUp } from "@/lib/auth-client";
import { ApiClientError } from "@/lib/api/client";
import { getApiBaseUrl, isLocalWebHost, isProductionWebHost, pingApi } from "@/lib/api/config";

type Mode = "signin" | "signup";

function friendlyError(err: unknown, onProduction: boolean): string {
  if (err instanceof TypeError && /fetch|network|failed/i.test(err.message)) {
    if (onProduction) {
      return "Production API (api.layerflow.dev) is not online yet. Sign-in will work after the API is deployed to Fly.io and DNS is added. For now, use http://localhost:3000/sign-in with npm run dev.";
    }
    return `Could not reach the LayerFlow API at ${getApiBaseUrl()}. Run npm run dev in the LayerFlow folder and wait for "API connected".`;
  }
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Sign-in failed. Try again.";
}

export default function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/workspace";
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [localDev, setLocalDev] = useState(true);
  const [productionSite, setProductionSite] = useState(false);
  const [apiUpstream, setApiUpstream] = useState<string | null>(null);

  // Email/password form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const checkApi = useCallback(async () => {
    const result = await pingApi();
    setApiUp(result.ok);
    if (result.upstream) setApiUpstream(result.upstream);
    return result.ok;
  }, []);

  useEffect(() => {
    const host = window.location.hostname;
    setLocalDev(isLocalWebHost(host));
    setProductionSite(isProductionWebHost(host));

    const onProd = isProductionWebHost(host);

    // API may start a few seconds after Next (local) or after Fly cold start (prod).
    let cancelled = false;
    const maxAttempts = onProd ? 6 : 8;
    const run = async (attempt: number) => {
      const ok = await checkApi();
      if (cancelled || ok || attempt >= maxAttempts) return;
      setTimeout(() => void run(attempt + 1), onProd ? 3000 : 1500);
    };
    void run(0);

    const id = setInterval(() => void checkApi(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [checkApi]);

  const authBlocked = productionSite && apiUp === false;
  const apiLabel = localDev ? getApiBaseUrl() : apiUpstream ?? "https://api.layerflow.dev";

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const validateForm = (): string | null => {
    if (mode === "signup") {
      if (!name.trim()) return "Please enter your name.";
      if (name.trim().length < 2) return "Name must be at least 2 characters.";
    }
    if (!email.trim()) return "Please enter your email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Please enter a valid email address.";
    }
    if (!password) return "Please enter a password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "signup" && password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    if (authBlocked) {
      setError(
        "Production API is not deployed yet. Deploy apps/api to Fly.io and add api.layerflow.dev DNS (see docs/deployment.md).",
      );
      setLoading(false);
      return;
    }

    // Soft check — warn but don't block on local.
    const ok = await checkApi();
    if (!ok) {
      setInfo(
        `Heads up: the API health check failed. Still trying ${mode === "signup" ? "sign-up" : "sign-in"} via ${apiLabel}…`,
      );
    }

    try {
      if (mode === "signup") {
        const result = await signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: next.startsWith("/")
            ? `${window.location.origin}${next}`
            : next,
        });
        if (result?.error) {
          setError(result.error.message || "Sign-up failed. Try again.");
          setLoading(false);
          return;
        }
        // Success — better-auth auto-signs-in when enabled; redirect.
        const dest = next.startsWith("/") ? next : "/workspace";
        window.location.href = `${window.location.origin}${dest}`;
      } else {
        const result = await signIn.email({
          email: email.trim(),
          password,
          callbackURL: next.startsWith("/")
            ? `${window.location.origin}${next}`
            : next,
        });
        if (result?.error) {
          setError(result.error.message || "Sign-in failed. Try again.");
          setLoading(false);
          return;
        }
        const dest = next.startsWith("/") ? next : "/workspace";
        window.location.href = `${window.location.origin}${dest}`;
      }
    } catch (err) {
      setError(friendlyError(err, productionSite));
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);

    if (authBlocked) {
      setError(
        "Production API is not deployed yet. Deploy apps/api to Fly.io and add api.layerflow.dev DNS (see docs/deployment.md).",
      );
      setLoading(false);
      return;
    }

    // Soft check only — never block sign-in on a false "offline" probe (local).
    const ok = await checkApi();
    if (!ok) {
      setInfo(`Heads up: API health check failed. Still trying Google sign-in via ${apiLabel}…`);
    }

    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: next.startsWith("/")
          ? `${window.location.origin}${next}`
          : next,
      });
      if (result?.error) {
        setError(result.error.message || "Sign-in failed. Try again.");
        setLoading(false);
        return;
      }
      // Successful redirect — keep loading spinner until navigation.
    } catch (err) {
      setError(friendlyError(err, productionSite));
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg">
      <SignInFlowField />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(68,237,188,0.07),_transparent_50%)]"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" aria-label="LayerFlow home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col-reverse items-center justify-center gap-12 px-6 pb-16 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-10">
        <section className="w-full max-w-xl text-center lg:text-left">
          <h1 className="text-balance text-4xl font-medium leading-[1.08] tracking-[-0.025em] text-ink sm:text-5xl lg:text-[3.4rem]">
            The workspace for everything you do with AI
          </h1>
          <p className="mx-auto mt-5 max-w-md text-pretty font-mono text-sm leading-6 text-muted lg:mx-0">
            Save prompts, compare models, control costs — all in one place.
            Build faster with every LLM connected.
          </p>
        </section>

        <section className="w-full max-w-sm lg:shrink-0">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-[var(--card-shadow)] backdrop-blur-sm">
            <h2 className="text-center text-xl font-semibold tracking-tight text-ink">
              {mode === "signin" ? "Sign in to LayerFlow" : "Create your LayerFlow account"}
            </h2>
            <p className="mt-2 text-center text-sm text-muted">
              {mode === "signin"
                ? "One account for prompts, budgets, and the gateway."
                : "Free to start. No credit card required."}
            </p>

            {/* Soft API notice — informational, never blocks */}
            {apiUp === false && (
              <div
                role="status"
                className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-700 dark:text-amber-400"
              >
                <p className="font-medium">
                  {productionSite ? "Production API is offline" : "Local API not connected"}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-90">
                  {productionSite ? (
                    <>
                      The website is on Vercel, but the <strong>API is not
                      live</strong> yet. Deploy it once, then add DNS:
                      <br />
                      <code className="mt-1 block font-mono text-[11px]">
                        flyctl auth login
                      </code>
                      <code className="block font-mono text-[11px]">
                        bash scripts/deploy-api-prod.sh
                      </code>
                      Then add <strong>CNAME api → layerflow-api.fly.dev</strong>{" "}
                      at your registrar. Until{" "}
                      <code className="font-mono">api.layerflow.dev</code> resolves,
                      use{" "}
                      <a className="underline" href="http://localhost:3000/sign-in">
                        localhost:3000/sign-in
                      </a>.
                    </>
                  ) : (
                    <>
                      Run <code className="font-mono">npm run dev</code> in the
                      LayerFlow folder (starts web + API). Target:{" "}
                      <code className="font-mono">{apiLabel}</code>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void checkApi()}
                  className="mt-2 text-xs font-medium underline"
                >
                  Retry connection
                </button>
              </div>
            )}

            {apiUp === true && (
              <p className="mt-4 text-center font-mono text-[11px] text-brand-2">
                API connected · {apiLabel}
              </p>
            )}

            {/* Email / Password form */}
            <form onSubmit={handleEmailAuth} className="mt-6 space-y-3" noValidate>
              {mode === "signup" && (
                <Field
                  icon={<UserIcon className="h-4 w-4" />}
                  label="Name"
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    disabled={loading}
                    className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                  />
                </Field>
              )}

              <Field icon={<Mail className="h-4 w-4" />} label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                />
              </Field>

              <Field icon={<Lock className="h-4 w-4" />} label="Password">
                <div className="flex w-full items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    disabled={loading}
                    className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="ml-1 text-faint hover:text-muted"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {mode === "signup" && (
                <Field icon={<Lock className="h-4 w-4" />} label="Confirm password">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
                  />
                </Field>
              )}

              <button
                type="submit"
                disabled={loading || authBlocked}
                className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? mode === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in with email"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-faint">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={loading || authBlocked}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink transition hover:bg-surface/80 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {loading ? "Redirecting to Google…" : "Continue with Google"}
            </button>

            {/* Toggle sign-in / sign-up */}
            <p className="mt-6 text-center text-sm text-muted">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-brand font-medium hover:underline"
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="text-brand font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            {info && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-600 dark:text-sky-400"
              >
                {info}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
              >
                {error}
              </p>
            )}

            <p className="mt-6 text-center text-xs leading-5 text-faint">
              By continuing, you agree to our Terms and Privacy Policy. First
              sign-in creates your workspace automatically.
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            <Link href="/" className="text-brand hover:underline">
              Back to home
            </Link>
            {" · "}
            <Link href="/docs" className="text-brand hover:underline">
              Docs
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-bg/50 px-3 py-2.5 transition focus-within:border-brand">
        <span className="text-faint">{icon}</span>
        {children}
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
