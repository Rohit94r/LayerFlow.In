import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found · LayerFlow",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4">
      <div className="text-center">
        <p className="text-[96px] font-bold leading-none text-brand">404</p>
        <h1 className="mt-6 text-xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The page you were looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}