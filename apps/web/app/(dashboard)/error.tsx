"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-16">
      <ErrorState
        title="This view hit an error"
        description={error.message || "Something went wrong while loading this page. Try again."}
        onRetry={reset}
      />
    </div>
  );
}
