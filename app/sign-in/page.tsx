import { Suspense } from "react";
import type { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to LayerFlow with email and password or Google to open your AI workspace.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
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
