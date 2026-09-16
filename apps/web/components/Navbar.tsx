import Link from "next/link";
import Logo from "./Logo";

export default function Navbar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3.5 z-50 flex justify-center px-4">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-[var(--radius-pill)] border border-hairline py-1.5 pl-3 pr-2 backdrop-blur-xl backdrop-saturate-150 transition-[box-shadow,background-color] duration-300 motion-reduce:transition-none bg-white/75 shadow-[0_2px_14px_rgba(249,115,22,0.08),0_1px_3px_rgba(0,0,0,0.04)]">
        <Link className="mr-2 flex items-center no-underline" href="/">
          <Logo size={26} />
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          <a
            href="#how"
            className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] text-text-secondary no-underline transition-colors hover:bg-orange-500/10 hover:text-orange-600 motion-reduce:transition-none"
          >
            How it works
          </a>
          <a
            href="#terminal"
            className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] text-text-secondary no-underline transition-colors hover:bg-orange-500/10 hover:text-orange-600 motion-reduce:transition-none"
          >
            Terminal
          </a>
          <a
            href="#features"
            className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] text-text-secondary no-underline transition-colors hover:bg-orange-500/10 hover:text-orange-600 motion-reduce:transition-none"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] text-text-secondary no-underline transition-colors hover:bg-orange-500/10 hover:text-orange-600 motion-reduce:transition-none"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] text-text-secondary no-underline transition-colors hover:bg-orange-500/10 hover:text-orange-600 motion-reduce:transition-none"
          >
            FAQ
          </a>
        </div>
        <a
          className="group ml-2 flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] bg-accent py-2 pl-4 pr-2.5 text-[13px] text-white no-underline shadow-[0_2px_10px_rgba(249,115,22,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_22px_rgba(249,115,22,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={{ fontWeight: "var(--font-weight-medium)" }}
          href="/sign-in"
        >
          Start Coding
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          >
            →
          </span>
        </a>
      </nav>
    </div>
  );
}
