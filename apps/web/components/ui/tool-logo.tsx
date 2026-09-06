import type { AiTool } from "@/lib/types";
import { AI_TOOLS, toolMeta } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

/**
 * Brand wordmark for each AI tool. Uses the real logo SVG where we ship it
 * (public/images) and a styled wordmark otherwise — keeps both themes clean.
 */

const REAL_SVG: Partial<Record<AiTool, string>> = {
  chatgpt: "/images/openai.svg",
  claude: "/images/anthropic.svg",
  gemini: "/images/google-gemini.svg",
  groq: "/images/groq.svg",
};

export function ToolLogo({
  tool,
  className,
  showLabel = true,
}: {
  tool: AiTool;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = toolMeta(tool);
  const svg = REAL_SVG[tool];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {svg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={svg}
          alt={meta.label}
          className="h-4 w-4 object-contain"
          style={{ filter: tool === "claude" ? undefined : "none" }}
        />
      ) : (
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] text-[9px] font-bold text-[#0e1416]"
          style={{ background: meta.color }}
          aria-hidden
        >
          {meta.label.charAt(0)}
        </span>
      )}
      {showLabel ? (
        <span className="text-xs font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </span>
      ) : null}
    </span>
  );
}

export function ToolGlyph({ tool, size = 20 }: { tool: AiTool; size?: number }) {
  const meta = toolMeta(tool);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        background: `${meta.color}1f`,
        color: meta.color,
        fontSize: size * 0.5,
        fontWeight: 700,
      }}
      aria-hidden
    >
      {meta.brand.charAt(0)}
    </span>
  );
}

export function ToolChip({ tool, className }: { tool: AiTool; className?: string }) {
  const meta = AI_TOOLS[tool];
  return (
    <span
      className={cn(
        "chip",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
