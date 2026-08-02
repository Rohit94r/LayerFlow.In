"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Copy, Check, Star, History, Play } from "@/components/ui/icons";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadialScore } from "@/components/ui/charts";
import { Button } from "@/components/ui/button";
import { PROMPT_BY_ID } from "@/lib/data/prompts";
import { timeAgo } from "@/lib/data/providers";
import { cn } from "@/lib/utils";

export default function PromptDetailClient() {
  const { id } = useParams<{ id: string }>();
  const prompt = PROMPT_BY_ID[id];
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(prompt?.favorite ?? false);

  if (!prompt) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/prompts"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Prompt Library
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {prompt.tags.map((t) => (
              <Badge key={t} tone="neutral">#{t}</Badge>
            ))}
            <Badge tone="mint">v{prompt.version}</Badge>
            <Badge tone="neutral">best on {prompt.model}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{prompt.title}</h1>
          <p className="mt-1.5 text-xs text-faint">
            Improved {timeAgo(prompt.updatedAt)} · used {prompt.usageCount}× · {prompt.content.split(/\s+/).length.toLocaleString()} words
          </p>
        </div>
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
            icon={copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            onClick={() => {
              navigator.clipboard?.writeText(prompt.content).catch(() => undefined);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Copied" : "Copy prompt"}
          </Button>
          <Button size="sm" icon={<Play className="h-3.5 w-3.5" />}>
            Run
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Prompt" description={`Version ${prompt.version} · scored ${prompt.score}/100`} />
          <CardBody>
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-[#0d1117] p-5 font-mono text-[13px] leading-relaxed text-emerald-100/90">
              {prompt.content}
            </pre>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Prompt Score" />
            <CardBody className="flex flex-col items-center">
              <RadialScore value={prompt.score} size={104} />
              <div className="mt-4 grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  { label: "Clarity", value: 94 },
                  { label: "Context", value: 92 },
                  { label: "Format", value: 90 },
                  { label: "Constraints", value: 95 },
                  { label: "Efficiency", value: 88 },
                  { label: "Model fit", value: 91 },
                ].map((s) => (
                  <span key={s.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{s.label}</span>
                    <span className="font-semibold text-ink">{s.value}</span>
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Before improvement" description="Your original paste" />
            <CardBody>
              <p className="rounded-xl border border-border bg-surface-2/40 p-3.5 text-xs italic leading-relaxed text-faint">
                “{prompt.originalContent}”
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
                <History className="h-3.5 w-3.5" /> v{prompt.version} of {Math.max(prompt.version, 3)} saved versions
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
