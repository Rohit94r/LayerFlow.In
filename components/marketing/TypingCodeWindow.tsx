"use client";

import { useEffect, useRef, useState } from "react";
import { highlightCode } from "@/lib/highlight-code";

type TypingCodeWindowProps = {
  lang: string;
  lines: string[];
  playing: boolean;
  done: boolean;
  onComplete?: () => void;
  speed?: number;
};

export default function TypingCodeWindow({
  lang,
  lines,
  playing,
  done,
  onComplete,
  speed = 22,
}: TypingCodeWindowProps) {
  const fullText = lines.join("\n");
  const [count, setCount] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (done) {
      setCount(fullText.length);
      return;
    }
    if (!playing) {
      setCount(0);
      completedRef.current = false;
      return;
    }
    if (count >= fullText.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }
    const delay = fullText[count] === "\n" ? speed * 2.5 : speed;
    const t = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [playing, done, count, fullText, speed, onComplete]);

  const display = done ? fullText : fullText.slice(0, count);
  const showCursor = playing && !done && count < fullText.length;

  return (
    <div className="code-window overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        <span className="ml-3 font-mono text-xs text-[#6b7280]">{lang}</span>
      </div>
      <pre className="min-h-[140px] overflow-x-auto px-5 py-4 text-[13px] leading-relaxed sm:min-h-[160px] sm:text-[14px]">
        <code className="font-mono text-[#c9c9d4]">
          {highlightCode(display)}
          {showCursor && (
            <span className="ml-px inline-block h-[1.1em] w-[2px] animate-pulse bg-brand align-middle" />
          )}
        </code>
      </pre>
    </div>
  );
}
