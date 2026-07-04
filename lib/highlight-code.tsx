import { Fragment } from "react";

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

export function highlightLine(line: string, key: number) {
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

export function highlightCode(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {highlightLine(line, i)}
      {i < lines.length - 1 ? "\n" : null}
    </Fragment>
  ));
}
