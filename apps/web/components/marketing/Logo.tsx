export default function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "hero";
}) {
  return (
    <span
      className={`nav-logo font-sans text-[1.35rem] font-medium tracking-[-0.02em] ${
        variant === "hero" ? "text-white" : "text-ink"
      } ${className ?? ""}`}
    >
      layerflow
    </span>
  );
}
