"use client";

import { useState } from "react";

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("curl -fsSL https://layerflow.dev/install | bash");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="hero-v2" id="top">
      <div className="hero-art" aria-hidden="true">
        <picture>
          <source
            type="image/webp"
            srcSet="/art/hero-480.webp 480w, /art/hero-768.webp 768w, /art/hero-1024.webp 1024w, /art/hero-1440.webp 1440w, /art/hero-1916.webp 1916w"
            sizes="100vw"
          />
          <img
            src="/art/hero.jpg"
            alt=""
            width={1916}
            height={821}
            fetchPriority="high"
          />
        </picture>
      </div>

      <div className="hero-inner">
        

        <h1 >
          Code with AI across any model.
          <br />
          <span className="ink">
            One workspace brings your <span className="back" style={{ color: "#ea580c" }}>context back.</span>
          </span>
        </h1>

        <p className="hero-sub rv-now rv-d2">
          Chat across Claude, ChatGPT, Gemini, and DeepSeek. Rescue dead conversations
          instead of restarting them, run parallel coding agents, and sync your terminal
          sessions in real time with hard budget limits and zero markup.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 rv-now rv-d3">
          <a
            className="cta-pill cta-lg"
            href="https://layerflow.dev"
            style={{
              background: "var(--accent)",
              boxShadow: "0 4px 18px rgba(249, 115, 22, 0.4)",
            }}
          >
            Start Coding Free <span className="arrow">→</span>
          </a>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 rounded-[var(--radius-pill)] border border-black/10 bg-white/80 px-4 py-3 text-[13px] font-mono text-stone-700 shadow-sm backdrop-blur transition-all hover:bg-white hover:shadow hover:border-orange-500/40"
          >
            <span className="text-orange-500 font-bold">$</span>
            <span>curl -fsSL https://layerflow.dev/install | bash</span>
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
              {copied ? "Copied! ✓" : "Copy"}
            </span>
          </button>
        </div>
      </div>

      {/* Floating Panel Graphic */}
      <div className="hero-panel-wrap rv rv-d3">
        <div className="relative mx-auto w-[330px] rounded-2xl border border-black/10 bg-white/95 p-4 text-left shadow-[0_24px_60px_rgba(249,115,22,0.12),0_12px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-transform hover:-translate-y-1">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-[13px] text-stone-900">LayerFlow Workspace</span>
            </div>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
              Live Sync
            </span>
          </div>

          {/* Model selection chip */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 p-2.5 border border-black/5">
            <div>
              <div className="text-[11px] font-medium text-stone-500">Active Model</div>
              <div className="text-[13px] font-semibold text-stone-900 flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                Claude 3.7 Sonnet + DeepSeek R1
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold">$0.002 / run</span>
          </div>

          {/* Status box */}
          <div className="mt-3 rounded-xl border border-orange-200/70 bg-gradient-to-br from-orange-50/80 to-amber-50/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                Rescue Pack Ready
              </span>
              <span className="text-[11px] font-bold text-orange-600">Score 98/100</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-stone-700">
              Preserved 8.4k tokens context. 3 constraints added. Auto-compressed for Claude &amp; terminal.
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="rounded-lg bg-orange-500 py-2 text-center text-[12px] font-semibold text-white shadow-sm hover:bg-orange-600">
              Resume in CLI
            </button>
            <button className="rounded-lg border border-black/10 bg-white py-2 text-center text-[12px] font-semibold text-stone-700 hover:bg-stone-50">
              Switch Model
            </button>
          </div>

          {/* Footer metric */}
          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2 text-[11px] text-stone-500">
            <span>Unified sessions</span>
            <span className="font-mono font-medium text-stone-800">14 agents · $0 wasted</span>
          </div>
        </div>
      </div>
    </header>
  );
}
