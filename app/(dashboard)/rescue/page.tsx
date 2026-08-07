"use client";

import { useMemo, useState, Suspense } from "react";import { useSearchParams } from "next/navigation";
import { AlertTriangle, Refresh } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { PasteView } from "@/components/features/rescue/paste-view";
import { RescuePipeline } from "@/components/features/rescue/pipeline";
import { RescueReportView } from "@/components/features/rescue/report";
import { apiFetch } from "@/lib/api/client";
import { getRescueReportResponseSchema } from "@layerflow/contracts";
import { mapRescueReport, passportService } from "@/lib/services/passports";
import type { AiTool, RescueReport } from "@/lib/types";

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 150_000;

async function fetchReportDto(id: string) {
  const res = await apiFetch(`/api/rescue/${id}`, {}, getRescueReportResponseSchema);
  return res.report;
}

export function RescueClient() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "prompt" ? "prompt" : "rescue";
  const [phase, setPhase] = useState<"paste" | "pipeline" | "report">("paste");
  const [report, setReport] = useState<RescueReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState(0);

  const title = useMemo(
    () => (mode === "prompt" ? "Improve A Prompt" : "Rescue My Chat"),
    [mode],
  );
  const description =
    mode === "prompt"
      ? "Paste a prompt. LayerFlow adds context, constraints, examples and format — then scores it."
      : "Paste any ChatGPT, Claude, Gemini, DeepSeek or Kimi conversation and get a ready-to-continue Rescue Report.";

  async function handleAnalyze(payload: { text: string; source: AiTool; target: AiTool }) {
    setError(null);
    setPhase("pipeline");
    try {
      const created = await passportService.createRescue({
        content: payload.text,
        sourceTool: payload.source,
      });
      setWords(created.originalWords);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const dto = await fetchReportDto(created.id);
        if (dto.status === "completed") {
          setReport(mapRescueReport(dto));
          setPhase("report");
          return;
        }
        if (dto.status === "failed") {
          setError(dto.errorMessage ?? "The rescue pipeline could not process this chat.");
          setPhase("paste");
          return;
        }
      }
      setError("This rescue is taking longer than expected. Please try again.");
      setPhase("paste");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the rescue. Try again.");
      setPhase("paste");
    }
  }

  return (
    <div>
      <PageHeader title={title} description={description} />

      {error ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{error}</p>
            <p className="mt-0.5 text-xs text-muted">
              Add a provider API key under Keys, or paste a shorter conversation.
            </p>
          </div>
        </div>
      ) : null}

      {phase === "paste" ? (
        <PasteView mode={mode} onAnalyze={handleAnalyze} />
      ) : null}

      {phase === "pipeline" ? <RescuePipeline words={words} /> : null}

      {phase === "report" && report ? (
        <RescueReportView report={report} onBack={() => setPhase("paste")} />
      ) : null}

      {phase === "report" || phase === "pipeline" ? null : (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <Refresh className="h-3.5 w-3.5" />
            Start over
          </Button>
        </div>
      )}
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
