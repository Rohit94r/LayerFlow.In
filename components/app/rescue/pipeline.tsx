"use client";

import { motion } from "framer-motion";
import { Loader2, FileDown, Wand2, DollarSign, Cpu, CopyCheck, Sparkles } from "@/components/ui/icons";
import type { LucideIcon } from "@/components/ui/icons";

const STEPS: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: Sparkles, label: "Cleaning", detail: "dedupe · trim · strip chatter" },
  { icon: FileDown, label: "Compressing", detail: "extracting useful context" },
  { icon: Wand2, label: "Improving", detail: "building your next prompt" },
  { icon: DollarSign, label: "Pricing", detail: "estimating per model" },
  { icon: Cpu, label: "Suggesting", detail: "best model + reason" },
  { icon: CopyCheck, label: "Packing", detail: "assembling Continue Pack" },
];

export function RescuePipeline() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Building your Rescue Report</h2>
        <p className="mt-1 text-sm text-muted">Compressing 8,150 words into usable context…</p>
      </div>

      <div className="space-y-2.5">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3"
            initial={{ opacity: 0.35, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.55 }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-brand">
              <step.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{step.label}</span>
                <span className="text-[10px] text-faint">{step.detail}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="progress-striped h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.3, delay: i * 0.55, ease: "easeInOut" }}
                />
              </div>
            </div>
            <motion.span
              className="text-[10px] font-bold text-emerald-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.55 + 1.2 }}
            >
              ✓
            </motion.span>
          </motion.div>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-faint">
        Mock pipeline · real analysis runs on your own BYOK keys
      </p>
    </div>
  );
}
