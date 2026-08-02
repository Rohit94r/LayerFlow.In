"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Save,
  Bookmark,
  FileDown,
  Sparkles,
  AlertTriangle,
  Trash2,
  Layers,
  ArrowLeft,
} from "@/components/ui/icons";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { RadialScore } from "@/components/ui/charts";
import { ToolChip } from "@/components/ui/tool-logo";
import { Button } from "@/components/ui/button";
import { RESCUE_REPORTS } from "@/lib/data/passports";
import { MODEL_BY_ID, formatMoney, formatTokens } from "@/lib/data/providers";
import type { RescueReport } from "@/lib/types";
import { cn } from "@/lib/utils";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-ink"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function PassportGrid({ report }: { report: RescueReport }) {
  const rows = [
    { label: "Goal", value: report.passport.goal },
    { label: "Current state", value: report.passport.currentState },
    { label: "Output format", value: report.passport.outputFormat },
    { label: "Next action", value: report.passport.nextAction },
  ];
  const lists = [
    { label: "Key decisions", items: report.passport.decisions },
    { label: "Constraints", items: report.passport.constraints },
    { label: "What worked", items: report.passport.successes },
    { label: "What failed", items: report.passport.failures },
    { label: "Missing info", items: report.passport.missingInfo },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="rounded-xl border border-border bg-surface-2/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{r.label}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{r.value}</p>
        </div>
      ))}
      {lists.map((l) => (
        <div key={l.label} className="rounded-xl border border-border bg-surface-2/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{l.label}</p>
          <ul className="mt-1.5 space-y-1">
            {l.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted">
                <Dot color="#44edbc" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DiffView({ report }: { report: RescueReport }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <Check className="h-3.5 w-3.5" /> Kept ({report.diff.kept.length})
        </p>
        <ul className="mt-2.5 space-y-2">
          {report.diff.kept.map((k) => (
            <li key={k} className="text-xs leading-relaxed text-muted">{k}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-surface-2/40 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Trash2 className="h-3.5 w-3.5 text-faint" /> Removed ({report.diff.removed.length})
        </p>
        <ul className="mt-2.5 space-y-2">
          {report.diff.removed.map((k) => (
            <li key={k} className="flex items-start gap-1.5 text-xs leading-relaxed text-faint">
              <s className="decoration-faint/40">{k}</s>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" /> Review manually ({report.diff.unsure.length})
        </p>
        <ul className="mt-2.5 space-y-2">
          {report.diff.unsure.map((k) => (
            <li key={k} className="text-xs leading-relaxed text-muted">· {k}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CostView({ report }: { report: RescueReport }) {
  const cheapest = [...report.costs].sort((a, b) => a.cost - b.cost)[0];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {report.costs.map((c) => (
          <button
            key={c.modelId}
            type="button"
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-all",
              c.recommended
                ? "gradient-border"
                : "border-border bg-surface-2/40 hover:border-border-strong",
            )}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              {MODEL_BY_ID[c.modelId]?.provider} · {c.model}
              {c.recommended ? (
                <Badge tone="green">recommended</Badge>
              ) : c.modelId === cheapest.modelId ? (
                <Badge tone="mint">cheapest</Badge>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatTokens(c.inputTokens)} in · {formatTokens(c.outputTokens)} out · {c.latency}
            </p>
            <p className={cn("mt-1.5 text-lg font-bold", c.recommended ? "text-emerald-400" : "text-ink")}>
              {formatMoney(c.cost)}
            </p>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        {report.recommendedReason}
      </p>
    </div>
  );
}

function ContinuePackView({ report }: { report: RescueReport }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Copy-ready continuation</p>
        <CopyButton
          label="Copy full pack"
          text={report.continuePack.map((l) => `${l.label}:\n${l.value}`).join("\n\n")}
        />
      </div>
      <div className="mt-4 space-y-2.5">
        {report.continuePack.map((l, i) => (
          <motion.div
            key={l.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 rounded-xl border border-border bg-surface-2/40 p-3.5"
          >
            <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-brand">
              {l.label}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink/90">{l.value}</p>
            <CopyButton text={`${l.label}: ${l.value}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function RescueReportView({ report, onBack }: { report: RescueReport; onBack: () => void }) {
  const [tab, setTab] = useState("summary");
  const [saved, setSaved] = useState(report.saved);
  const [feedback, setFeedback] = useState<RescueReport["feedback"] | null>(report.feedback ?? null);

  const recommended = MODEL_BY_ID[report.recommendedModelId];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> New rescue
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ToolChip tool={report.sourceTool} />
            <Badge tone="neutral">{report.sourceModel}</Badge>
            <Badge tone="mint">{report.compressionPercent}% compressed</Badge>
            <Badge tone="amber">
              <Sparkles className="h-3 w-3" /> Score {report.promptScore}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{report.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{report.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={saved ? "secondary" : "primary"}
            size="sm"
            icon={saved ? <Bookmark className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            onClick={() => setSaved((v) => !v)}
          >
            {saved ? "Saved" : "Save to workspace"}
          </Button>
          <Button variant="outline" size="sm" icon={<FileDown className="h-3.5 w-3.5" />}>
            Export .md
          </Button>
        </div>
      </div>

      <Tabs
        className="mt-6"
        items={[
          { id: "summary", label: "Overview", icon: <Layers className="h-3.5 w-3.5" /> },
          { id: "passport", label: "Context Passport" },
          { id: "diff", label: "Compress + Diff" },
          { id: "prompt", label: "Improved Prompt" },
          { id: "cost", label: "Cost Check" },
          { id: "pack", label: "Continue Pack" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5">
        {tab === "summary" ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Compression" description="Original vs useful context" />
              <CardBody>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
                    <p className="stat-value text-amber-400">{report.originalWords.toLocaleString()}</p>
                    <p className="mt-1 text-[11px] text-faint">original words</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center">
                    <p className="stat-value text-emerald-400">{report.compressedWords.toLocaleString()}</p>
                    <p className="mt-1 text-[11px] text-faint">useful context</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-center">
                    <p className="stat-value text-brand-2">-{report.compressionPercent}%</p>
                    <p className="mt-1 text-[11px] text-faint">waste removed</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-brand/25 bg-brand/5 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand">
                    <Sparkles className="h-3.5 w-3.5" /> Best model suggestion
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-emerald-400 text-sm font-bold text-[#0e1416]">
                      {recommended.provider.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{recommended.name}</p>
                      <p className="text-[11px] text-faint">
                        {formatMoney(report.costs.find((c) => c.recommended)?.cost ?? 0)} · {recommended.bestFor}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-muted">{report.recommendedReason}</p>
                </div>
              </CardBody>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Prompt score" />
                <CardBody className="flex flex-col items-center">
                  <RadialScore value={report.promptScore} size={104} label="improved" />
                  <div className="mt-4 grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
                    {report.promptScores.map((s) => (
                      <span key={s.label} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted">{s.label}</span>
                        <span className="font-semibold text-ink">{s.value}</span>
                      </span>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Outcome feedback" description="Helps LayerFlow learn" />
                <CardBody className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "worked", label: "Worked well" },
                      { id: "missing", label: "Missing context" },
                      { id: "long", label: "Too long" },
                      { id: "model", label: "Wrong model" },
                      { id: "prompt", label: "Bad prompt" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFeedback(feedback === f.id ? null : f.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all",
                        feedback === f.id
                          ? "border-brand/50 bg-brand/10 text-brand"
                          : "border-border text-muted hover:border-border-strong hover:text-ink",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>
        ) : null}

        {tab === "passport" ? (
          <Card>
            <CardHeader
              title="Context Passport"
              description="Editable memory package — all fields are portable to any model"
              action={<CopyButton label="Copy passport" text={JSON.stringify(report.passport, null, 2)} />}
            />
            <CardBody>
              <PassportGrid report={report} />
            </CardBody>
          </Card>
        ) : null}

        {tab === "diff" ? (
          <Card>
            <CardHeader
              title="Smart Compress + Context Diff"
              description="Exactly what LayerFlow kept, removed, and flagged"
            />
            <CardBody>
              <DiffView report={report} />
            </CardBody>
          </Card>
        ) : null}

        {tab === "prompt" ? (
          <Card>
            <CardHeader
              title="Improved prompt"
              description={`Scored ${report.promptScore}/100 — copy and continue in ${MODEL_BY_ID[report.recommendedModelId].name}`}
              action={<CopyButton label="Copy prompt" text={report.improvedPrompt} />}
            />
            <CardBody>
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-[#0d1117] p-5 font-mono text-[13px] leading-relaxed text-emerald-100/90">
                {report.improvedPrompt}
              </pre>
            </CardBody>
          </Card>
        ) : null}

        {tab === "cost" ? (
          <Card>
            <CardHeader
              title="Cost Check"
              description={`Estimated from ${formatTokens(report.costs[0].inputTokens)} input / ${formatTokens(report.costs[0].outputTokens)} output tokens`}
            />
            <CardBody>
              <CostView report={report} />
            </CardBody>
          </Card>
        ) : null}

        {tab === "pack" ? (
          <Card>
            <CardHeader
              title="Continue Pack"
              description={`Ready to paste into any AI — copy it and continue in another model instantly`}
            />
            <CardBody>
              <ContinuePackView report={report} />
            </CardBody>
          </Card>
        ) : null}
      </div>

      {saved ? (
        <p className="mt-5 text-xs text-faint">
          Saved to workspace ·{" "}
          <Link href="/passports" className="text-brand hover:underline">
            view in Context Passport library
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export { RESCUE_REPORTS };
