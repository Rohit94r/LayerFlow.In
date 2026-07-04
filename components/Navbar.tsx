"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { nav } from "@/lib/content";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overHero = !scrolled;

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
          <a href="#top" aria-label="LayerFlow home" className="relative z-10 shrink-0">
            <Logo variant={overHero ? "hero" : "default"} />
          </a>

          <div className="relative z-10 ml-auto flex items-center gap-2 lg:min-w-[220px] lg:justify-end">
            <ThemeToggle overHero={overHero} />
            <a
              href="#docs"
              className={`hidden rounded-full px-4 py-2 text-sm font-normal transition-colors sm:inline-flex ${
                overHero
                  ? "border border-white/30 text-white hover:bg-white/10"
                  : "border border-border-strong text-ink hover:bg-surface-2"
              }`}
            >
              Get Started
            </a>
            <a
              href="#demo"
              className="hidden rounded-full bg-white px-4 py-2 text-sm font-normal text-black transition-transform hover:scale-[1.02] sm:inline-flex"
            >
              View dashboard
            </a>
            <button
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className={`rounded-lg p-2 lg:hidden ${
                overHero
                  ? "text-white"
                  : "border border-border text-ink"
              }`}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* center navigation — absolutely centered like mlflow.org */}
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-full items-center justify-center lg:flex">
          <div className="pointer-events-auto flex items-center gap-0.5">
          {nav.map((item) =>
            "items" in item && item.items ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  className={`nav-link flex items-center gap-1 rounded-md px-3 py-2 text-[0.9375rem] font-normal transition-colors ${
                    overHero ? "" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                <AnimatePresence>
                  {openMenu === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-50 pt-2"
                    >
                      <div className="card min-w-[280px] overflow-hidden p-2 shadow-2xl">
                        {item.items.map((sub) => (
                          <a
                            key={sub.title}
                            href={sub.href}
                            className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                          >
                            <div className="text-sm font-medium text-ink">
                              {sub.title}
                            </div>
                            <div className="text-xs leading-relaxed text-faint">
                              {sub.desc}
                            </div>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className={`nav-link rounded-md px-3 py-2 text-[0.9375rem] font-normal transition-colors ${
                  overHero ? "" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </a>
            ),
          )}
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
                <a
                  key={item.label}
                  href={"href" in item ? item.href : "#platform"}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-base text-muted hover:bg-surface-2 hover:text-ink"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex gap-2 pt-3">
                <a
                  href="#docs"
                  className="flex-1 rounded-full border border-border-strong px-4 py-2 text-center text-sm text-ink"
                >
                  Get Started
                </a>
                <a
                  href="#demo"
                  className="flex-1 rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-black"
                >
                  View dashboard
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
