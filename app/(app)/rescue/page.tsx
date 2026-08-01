"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PasteView } from "@/components/app/rescue/paste-view";
import { RescuePipeline } from "@/components/app/rescue/pipeline";
import { RescueReportView, RESCUE_REPORTS } from "@/components/app/rescue/report";
import type { AiTool, RescueReport } from "@/lib/types";

export function RescueClient() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "prompt" ? "prompt" : "rescue";
  const [phase, setPhase] = useState<"paste" | "pipeline" | "report">("paste");
  const [report, setReport] = useState<RescueReport | null>(null);

  const title = useMemo(
    () => (mode === "prompt" ? "Improve A Prompt" : "Rescue My Chat"),
    [mode],
  );
  const description =
    mode === "prompt"
      ? "Paste a prompt. LayerFlow adds context, constraints, examples and format — then scores it."
      : "Paste any ChatGPT, Claude, Gemini, DeepSeek or Kimi conversation and get a ready-to-continue Rescue Report.";

  function handleAnalyze(payload: { text: string; source: AiTool; target: AiTool }) {
    setPhase("pipeline");
    window.setTimeout(() => {
      // Demo: map a sample paste to the matching mock report, else first report.
      const lower = payload.text.toLowerCase();
      let next: RescueReport;
      if (lower.includes("cold") || lower.includes("email")) {
        next = RESCUE_REPORTS.find((r) => r.id === "rescue-002")!;
      } else if (lower.includes("webhook")) {
        next = RESCUE_REPORTS.find((r) => r.id === "rescue-003")!;
      } else {
        next = RESCUE_REPORTS[0];
      }
      setReport({ ...next, sourceTool: payload.source });
      setPhase("report");
    }, 3400);
  }

  return (
    <div>
      <PageHeader title={title} description={description} />

      {phase === "paste" ? (
        <PasteView mode={mode} onAnalyze={handleAnalyze} />
      ) : null}

      {phase === "pipeline" ? <RescuePipeline /> : null}

      {phase === "report" && report ? (
        <RescueReportView report={report} onBack={() => setPhase("paste")} />
      ) : null}
    </div>
  );
}

export default function RescuePage() {
  return (
    <Suspense fallback={null}>
      <RescueClient />
    </Suspense>
  );
}
