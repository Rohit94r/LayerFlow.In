import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#18181b] px-6 pb-10 pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <picture>
          <source
            type="image/webp"
            srcSet="/art/footer-480.webp 480w, /art/footer-768.webp 768w, /art/footer-1024.webp 1024w, /art/footer-1440.webp 1440w, /art/footer-1916.webp 1916w"
            sizes="100vw"
          />
          <img
            src="/art/footer.jpg"
            alt=""
            width={1916}
            height={821}
            className="absolute inset-0 h-full w-full object-cover object-bottom opacity-40 mix-blend-luminosity"
            loading="lazy"
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--bg) 0%, rgba(24,24,27,0.85) 30%, rgba(24,24,27,0.98) 100%)",
          }}
        ></div>
        {/* Subtle orange ambient glow in footer */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-[350px] w-[600px] rounded-full bg-orange-500/10 blur-[120px]"></div>
      </div>

      <div className="relative z-[2] mx-auto w-full max-w-[960px]">
        <div
          aria-hidden="true"
          className="select-none text-center text-[clamp(52px,10vw,140px)] leading-none text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            textShadow:
              "0 4px 44px rgba(249,115,22,0.25), 0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          Layer<span className="text-orange-500">Flow</span>
        </div>

        <div className="mx-auto mt-12 grid max-w-[720px] grid-cols-2 gap-x-12 gap-y-10 text-center sm:grid-cols-3 sm:text-left">
          {/* Column 1: Product */}
          <nav className="flex flex-col gap-2.5">
            <span
              className="text-[11px] uppercase tracking-[0.09em] text-orange-400 font-semibold"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
            >
              Product
            </span>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="/sign-in"
            >
              Web Workspace
            </a>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="#terminal"
            >
              Terminal CLI
            </a>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="#features"
            >
              Chat Rescue
            </a>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="#how"
            >
              How it works
            </a>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="#pricing"
            >
              Pricing
            </a>
          </nav>

          {/* Column 2: Resources */}
          <nav className="flex flex-col gap-2.5">
            <span
              className="text-[11px] uppercase tracking-[0.09em] text-orange-400 font-semibold"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
            >
              Resources
            </span>
            <Link
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="/docs"
            >
              Documentation
            </Link>
            <Link
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="/agents"
            >
              Agent Library
            </Link>
            <Link
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="/blog"
            >
              Blog
            </Link>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="https://x.com/layerflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter / X
            </a>
          </nav>

          {/* Column 3: Trust & Legal */}
          <nav className="flex flex-col gap-2.5">
            <span
              className="text-[11px] uppercase tracking-[0.09em] text-orange-400 font-semibold"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
            >
              Security
            </span>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="https://layerflow.dev/privacy"
            >
              Privacy Policy
            </a>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="https://layerflow.dev/terms"
            >
              Terms of Service
            </a>
            <a
              className="text-[13px] text-white/85 no-underline transition-colors duration-200 hover:text-orange-400 motion-reduce:transition-none"
              href="/docs"
            >
              BYOK Security Model
            </a>
          </nav>
        </div>

        <div
          className="mt-12 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-[12px] text-white/60 sm:flex-row sm:justify-between"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
        >
          <span>© 2026 LayerFlow. All rights reserved.</span>
          <span>Engineered for developers &amp; AI teams</span>
        </div>
      </div>
    </footer>
  );
}
