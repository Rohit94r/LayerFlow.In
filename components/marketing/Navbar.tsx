"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  LifeBuoy,
  Shrink,
  Wand2,
  Play,
  BookUser,
  Library,
  Search,
  Brain,
  ClipboardList,
  BarChart3,
  Cpu,
  KeyRound,
  ArrowRight,
  Code2,
  TerminalSquare,
  Bot,
  History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  nav,
  site,
  featureMenu,
  type FeatureMenuItem,
} from "@/lib/marketing-content";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const featureIcons: Record<FeatureMenuItem["icon"], LucideIcon> = {
  code: Code2,
  terminal: TerminalSquare,
  agents: Bot,
  sessions: History,
  rescue: LifeBuoy,
  compress: Shrink,
  improve: Wand2,
  continue: Play,
  passport: BookUser,
  prompts: Library,
  search: Search,
  memory: Brain,
  ledger: ClipboardList,
  cost: BarChart3,
  models: Cpu,
  byok: KeyRound,
};

function FeatureMenuLink({
  item,
  onNavigate,
  compact,
}: {
  item: FeatureMenuItem;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Icon = featureIcons[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex gap-3 rounded-lg transition-colors hover:bg-surface-2 ${
        compact ? "px-3 py-2.5" : "px-3 py-2.5"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-md border border-border bg-surface-1 text-brand transition-colors group-hover:border-brand/30 group-hover:bg-brand/10">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink group-hover:text-ink">
          {item.title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted group-hover:text-muted">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Close menus whenever the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeaturesOpen(false);
    setMobileOpen(false);
    setMobileFeaturesOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const overHero = isHome && !scrolled;

  const openFeatures = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setFeaturesOpen(true);
  };

  const scheduleCloseFeatures = () => {
    closeTimer.current = setTimeout(() => setFeaturesOpen(false), 120);
  };

  const closeAll = () => {
    setMobileOpen(false);
    setMobileFeaturesOpen(false);
    setFeaturesOpen(false);
  };

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
              {nav.map((item) =>
                item.menu === "features" ? (
                  <div
                    key={item.label}
                    ref={featuresRef}
                    className="relative"
                    onMouseEnter={openFeatures}
                    onMouseLeave={scheduleCloseFeatures}
                  >
                    <button
                      type="button"
                      aria-expanded={featuresOpen}
                      aria-haspopup="true"
                      onClick={() => setFeaturesOpen((v) => !v)}
                      className={`nav-link inline-flex items-center gap-1 rounded-md px-3 py-2 text-[0.9375rem] font-normal transition-colors ${
                        overHero ? "" : "text-muted hover:text-ink"
                      } ${featuresOpen ? "text-ink" : ""}`}
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          featuresOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {featuresOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.18 }}
                          className="absolute left-1/2 top-full z-50 mt-2 w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2"
                          onMouseEnter={openFeatures}
                          onMouseLeave={scheduleCloseFeatures}
                        >
                          <div className="overflow-hidden rounded-xl border border-border bg-bg/95 shadow-2xl shadow-black/10 backdrop-blur-xl">
                            <div className="grid gap-0 p-2 sm:grid-cols-2 xl:grid-cols-4">
                              {featureMenu.map((section) => (
                                <div key={section.title} className="px-2 py-3">
                                  <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-faint">
                                    {section.title}
                                  </p>
                                  <div className="space-y-0.5">
                                    {section.items.map((feature) => (
                                      <FeatureMenuLink
                                        key={feature.title}
                                        item={feature}
                                        onNavigate={() => setFeaturesOpen(false)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between border-t border-border bg-surface-1/50 px-5 py-3">
                              <p className="text-xs text-muted">
                                Code + AI Context — one platform
                              </p>
                              <Link
                                href="/#features"
                                onClick={() => setFeaturesOpen(false)}
                                className="group inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                              >
                                View all features
                                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-link rounded-md px-3 py-2 text-[0.9375rem] font-normal transition-colors ${
                      overHero ? "" : "text-muted hover:text-ink"
                    } ${pathname === item.href ? "text-ink" : ""}`}
                  >
                    {item.label}
                  </Link>
                ),
              )}
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
              href={site.signInHref}
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-normal text-black transition-transform hover:scale-[1.02] sm:inline-flex"
            >
              Sign in
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
            <div className="max-h-[calc(100vh-4.25rem)] overflow-y-auto px-6 py-4">
              {nav.map((item) =>
                item.menu === "features" ? (
                  <div key={item.label} className="border-b border-border pb-2">
                    <button
                      type="button"
                      aria-expanded={mobileFeaturesOpen}
                      onClick={() => setMobileFeaturesOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-base text-muted hover:bg-surface-2 hover:text-ink"
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          mobileFeaturesOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileFeaturesOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pb-3 pt-1">
                            {featureMenu.map((section) => (
                              <div key={section.title}>
                                <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-faint">
                                  {section.title}
                                </p>
                                <div className="space-y-0.5">
                                  {section.items.map((feature) => (
                                    <FeatureMenuLink
                                      key={feature.title}
                                      item={feature}
                                      compact
                                      onNavigate={closeAll}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                            <Link
                              href="/#features"
                              onClick={closeAll}
                              className="mx-3 inline-flex items-center gap-1 text-sm font-medium text-brand"
                            >
                              View all features
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeAll}
                    className="block rounded-lg px-3 py-2.5 text-base text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <div className="flex gap-2 pt-3">
                <Link
                  href={site.pricingHref}
                  onClick={closeAll}
                  className="flex-1 rounded-full border border-border-strong px-4 py-2 text-center text-sm text-ink"
                >
                  Pricing
                </Link>
                <Link
                  href={site.signInHref}
                  onClick={closeAll}
                  className="flex-1 rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-black"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
