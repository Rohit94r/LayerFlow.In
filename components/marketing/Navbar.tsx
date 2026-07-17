"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav, site } from "@/lib/marketing-content";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overHero = isHome && !scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        overHero
          ? "nav-on-hero border-b border-transparent bg-transparent"
          : "border-b border-border bg-bg/85 backdrop-blur-xl"
      }`}
    >
      <nav className="relative mx-auto h-[4.25rem] max-w-[1280px] px-6 lg:px-8">
        <div className="flex h-full items-center justify-between">
          <Link href="/" aria-label="LayerFlow home" className="relative z-10 shrink-0">
            <Logo variant={overHero ? "hero" : "default"} />
          </Link>

          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-full items-center justify-center lg:flex">
            <div className="pointer-events-auto flex items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-link rounded-md px-3 py-2 text-[0.9375rem] font-normal transition-colors ${
                    overHero ? "" : "text-muted hover:text-ink"
                  } ${pathname === item.href ? "text-ink" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative z-10 ml-auto flex items-center gap-2 lg:min-w-[220px] lg:justify-end">
            <ThemeToggle overHero={overHero} />
            <Link
              href={site.pricingHref}
              className={`hidden rounded-full px-4 py-2 text-sm font-normal transition-colors sm:inline-flex ${
                overHero
                  ? "border border-white/30 text-white hover:bg-white/10"
                  : "border border-border-strong text-ink hover:bg-surface-2"
              }`}
            >
              Pricing
            </Link>
            <Link
              href={site.workspaceHref}
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-normal text-black transition-transform hover:scale-[1.02] sm:inline-flex"
            >
              Open workspace
            </Link>
            <button
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className={`rounded-lg p-2 lg:hidden ${
                overHero ? "text-white" : "border border-border text-ink"
              }`}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-bg/95 backdrop-blur-xl lg:hidden"
          >
            <div className="space-y-1 px-6 py-4">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-base text-muted hover:bg-surface-2 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-2 pt-3">
                <Link
                  href={site.pricingHref}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full border border-border-strong px-4 py-2 text-center text-sm text-ink"
                >
                  Pricing
                </Link>
                <Link
                  href={site.workspaceHref}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-black"
                >
                  Open workspace
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
