"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

/**
 * Starts a Dodo Payments hosted checkout for the given plan. The server
 * creates the checkout session (`/api/billing/checkout`) and we redirect the
 * browser to the returned hosted URL. Plan activation happens only after the
 * verified webhook — never from this redirect.
 */
export function CheckoutButton({
  plan,
  label,
  variant = "primary",
  size = "md",
  className,
}: {
  plan: "starter" | "pro" | "team";
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as {
        checkout_url?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.error?.message ?? "Could not start checkout. Please try again.");
      }
      window.location.assign(data.checkout_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        variant={variant}
        size={size}
        className={className}
        loading={loading}
        onClick={() => void startCheckout()}
      >
        {label ?? "Upgrade"}
      </Button>
      {error ? <p className="mt-2 text-xs text-crimson">{error}</p> : null}
    </div>
  );
}