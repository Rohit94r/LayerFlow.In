"use client";

import { motion } from "framer-motion";

export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  title,
  description,
  align = "center",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal
      className={
        align === "center"
          ? `mx-auto max-w-2xl text-center ${className ?? ""}`
          : `max-w-2xl ${className ?? ""}`
      }
    >
      <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.1]">
        {title}
      </h2>
      {description ? <p className="mt-4 text-lg leading-relaxed text-muted">{description}</p> : null}
    </Reveal>
  );
}
