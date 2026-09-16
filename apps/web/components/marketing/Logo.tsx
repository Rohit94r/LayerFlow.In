export default function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "hero";
}) {
  return (
    <span
      className={`nav-logo inline-flex items-center gap-2 font-sans text-[1.35rem] font-medium tracking-[-0.02em] ${
        variant === "hero" ? "text-white" : "text-ink"
      } ${className ?? ""}`}
    >
      <img
        src="/logo.png"
        alt="LayerFlow"
        width={32}
        height={32}
        className="rounded"
      />
      layerflow
    </span>
  );
}
