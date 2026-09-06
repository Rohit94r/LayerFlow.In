"use client";

import { useState } from "react";
import { Star, Copy, Check, Play } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/hooks/use-copy";
import { cn } from "@/lib/utils";

export function PromptActions({ content }: { content: string }) {
  const [favorite, setFavorite] = useState(false);
  const { copied, copy } = useCopy();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setFavorite((v) => !v)}
        aria-label="Toggle favorite"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all",
          favorite
            ? "border-brand/40 bg-brand/10 text-brand"
            : "border-border text-muted hover:border-border-strong hover:text-ink",
        )}
      >
        <Star className={cn("h-4 w-4", favorite && "fill-brand")} />
      </button>
      <Button
        variant="secondary"
        size="sm"
        icon={copied ? <Check className="h-3.5 w-3.5 text-brand-2" /> : <Copy className="h-3.5 w-3.5" />}
        onClick={() => copy(content)}
      >
        {copied ? "Copied" : "Copy prompt"}
      </Button>
      <Button size="sm" icon={<Play className="h-3.5 w-3.5" />}>
        Run
      </Button>
    </div>
  );
}
