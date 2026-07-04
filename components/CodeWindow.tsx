import { Fragment } from "react";

type CodeWindowProps = {
  lang: string;
  lines: string[];
  filename?: string;
};

const KEYWORDS = new Set([
  "import",
  "from",
  "const",
  "let",
  "var",
  "await",
  "async",
  "function",
  "return",
  "new",
  "export",
  "default",
  "npm",
  "install",
  "npx",
]);

function highlight(line: string, key: number) {
  // comments
  if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) {
    return (
      <span key={key} className="italic text-[#6b7280]">
        {line}
      </span>
    );
  }

  const tokens = line.split(/(\s+|[(){}[\],:.])/);
  return tokens.map((tok, i) => {
    const t = tok.trim();
    let cls = "";
    if (KEYWORDS.has(t)) cls = "text-[#c792ea]";
    else if (/^'.*'$/.test(t) || /^".*"$/.test(t) || /^`.*`$/.test(t))
      cls = "text-[#c3e88d]";
    else if (/^\d+$/.test(t)) cls = "text-[#f78c6c]";
    else if (/^[A-Z][A-Za-z0-9]+$/.test(t)) cls = "text-[#ffcb6b]";
    else if (/^(gpt-4o|claude-3-5-sonnet|gpt-4o-mini)$/.test(t))
      cls = "text-[#82aaff]";
    return (
      <span key={`${key}-${i}`} className={cls}>
        {tok}
      </span>
    );
  });
}

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
              {highlight(line, i)}
              {"\n"}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
