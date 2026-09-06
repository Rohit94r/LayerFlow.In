import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SignInForm from "@/components/auth/SignInForm";
import { getServerSession } from "@/lib/server/auth-loader";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to LayerFlow with email and password or Google to open your AI workspace.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  // Strict internal-path validation: reject protocol-relative (//evil.com),
  // backslash, control chars and anything outside alphanumerics + / - _ . ~
  const rawNext = typeof next === "string" ? next : "";
  const nextPath =
    /^\/[a-zA-Z0-9\-._~/]*$/.test(rawNext) && !rawNext.startsWith("//") && !rawNext.includes("\\\\")
      ? rawNext
      : "/home";

  // Already signed in? Skip the form and go straight to the workspace.
  // Wrap in try/catch so a DB connection failure doesn't crash the page.
  let session = null;
  try {
    const h = await headers();
    session = await getServerSession(h);
  } catch {
    // Database unavailable — render the sign-in form anyway so the page
    // doesn't show "Internal Server Error".  The form's own API calls
    // will surface a user-facing error if the backend is truly down.
  }
  if (session) {
    redirect(nextPath);
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}