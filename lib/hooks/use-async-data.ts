"use client";

import { useEffect, useState } from "react";
import { ApiClientError } from "@/lib/api/client";

type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "error"; data: null; error: Error }
  | { status: "success"; data: T; error: null };

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { reload: () => void } {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<AsyncState<T>>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    loader()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error =
          err instanceof Error ? err : new Error("Failed to load data");
        setState({ status: "error", data: null, error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return {
    ...state,
    reload: () => setTick((t) => t + 1),
  };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.isBudgetExceeded) {
      return "Budget exceeded — this request was blocked. Raise your limit in Cost / Budget.";
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
