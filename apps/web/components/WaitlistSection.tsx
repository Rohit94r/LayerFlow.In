"use client";

import { useState } from "react";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className="flex flex-col items-center px-6 pb-24 pt-4 sm:pb-28">
      <h2
        className="text-[1.5rem] leading-[1.15] tracking-[-0.5px] text-text"
        style={{ fontWeight: "var(--font-weight-bold)" }}
      >
        Stay ahead of frontier models.
      </h2>
      <p className="mt-2.5 max-w-[420px] text-center text-[14px] leading-relaxed text-text-secondary">
        Get an email when new model integrations, CLI workflows, and prompt templates drop. Zero noise.
      </p>
      <div className="mt-7 w-full max-w-md">
        <div id="waitlist" className="flex w-full flex-col items-center gap-3 text-center">
          {submitted ? (
            <div className="rounded-[var(--radius-pill)] border border-orange-500/30 bg-orange-500/10 px-6 py-3 text-[14px] font-medium text-orange-700">
              ✓ You&apos;re subscribed! We&apos;ll notify you about new updates.
            </div>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit}
              className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:gap-3"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-[var(--radius-pill)] border border-hairline bg-surface text-text placeholder:text-text-secondary outline-none transition-colors focus:border-orange-500 disabled:opacity-60 motion-reduce:transition-none px-5 py-3 text-base"
              />
              <button
                type="submit"
                className="shrink-0 rounded-[var(--radius-pill)] bg-accent text-white transition-colors hover:bg-accent-deep disabled:opacity-60 motion-reduce:transition-none px-6 py-3 text-base shadow-[0_2px_10px_rgba(249,115,22,0.35)]"
                style={{ fontWeight: "var(--font-weight-medium)" }}
              >
                Join LayerFlow
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
