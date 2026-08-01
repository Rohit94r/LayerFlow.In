"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/ui/reveal";
import { FAQS } from "@/lib/data/marketing";
import { cn } from "@/lib/utils";

export default function Faq() {
  const [open, setOpen] = useState<string | null>(FAQS[0].question);

  return (
    <section id="faq" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions,{" "}
              <span className="text-brand">answered</span>
            </>
          }
        />

        <div className="mt-10 space-y-3">
          {FAQS.map((faq) => {
            const isOpen = open === faq.question;
            return (
              <div
                key={faq.question}
                className={cn(
                  "card overflow-hidden transition-colors",
                  isOpen && "border-brand/30",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : faq.question)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4.5 text-left"
                >
                  <span className="text-sm font-semibold text-ink">{faq.question}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
