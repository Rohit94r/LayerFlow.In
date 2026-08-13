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
  const h = await headers();
  const session = await getServerSession(h);
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