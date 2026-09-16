export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <div className="flex items-center gap-[8px]">
      <img
        src="/logo.png"
        alt="LayerFlow"
        width={size}
        height={size}
        className="rounded-[7px] shadow-[0_2px_8px_rgba(249,115,22,0.35)]"
      />
      <span
        className="text-[15px] tracking-tight"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
        }}
      >
        <span className="text-[#1d1d1f]">Layer</span>
        <span className="text-[#f97316]">Flow</span>
      </span>
    </div>
  );
}
