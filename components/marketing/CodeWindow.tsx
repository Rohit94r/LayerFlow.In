import { Fragment } from "react";
import { highlightLine } from "@/lib/highlight-code";

type CodeWindowProps = {
  lang: string;
  lines: string[];
  filename?: string;
};

export default function CodeWindow({ lang, lines, filename }: CodeWindowProps) {
  return (
    <div className="code-window overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 font-mono text-xs text-[#6b7280]">
          {filename ?? lang}
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-4 text-[13px] leading-relaxed">
        <code className="font-mono text-[#c9c9d4]">
          {lines.map((line, i) => (
            <Fragment key={i}>
              {highlightLine(line, i)}
              {"\n"}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
