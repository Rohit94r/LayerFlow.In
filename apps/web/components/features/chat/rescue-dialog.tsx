"use client";

import { useCallback, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { PasteView } from "@/components/features/rescue/paste-view";
import { RescuePipeline } from "@/components/features/rescue/pipeline";
import { RescueReportView } from "@/components/features/rescue/report";
import { rescueService } from "@/lib/services/rescue";
import type { AiTool, RescueReport } from "@/lib/types";

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 150_000;

type Phase = "paste" | "pipeline" | "report";

/**
 * Rescue flow embedded in Chat: paste a dead conversation → pipeline →
 * report → "continue here" opens it as a live chat session.
 */
export function RescueDialog({
  open,
  onClose,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  onStarted?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("paste");
  const [report, setReport] = useState<RescueReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState(0);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setPhase("paste");
    setReport(null);
    setError(null);
    setWords(0);
  }, []);

  function close() {
    reset();
    onClose();
  }

  async function handleAnalyze(payload: { text: string; source: AiTool; target: AiTool }) {
    setError(null);
    setPhase("pipeline");
    try {
      const created = await rescueService.createRescue({
        content: payload.text,
        sourceTool: payload.source,
      });
      setWords(created.originalWords);
      onStarted?.();

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelledRef.current) return;
        const dto = await rescueService.getRescueReport(created.id);
        if (!dto) continue;
        if (dto.status === "completed") {
          setReport(dto);
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
    <Modal
      open={open}
      onClose={close}
      title="Rescue a past chat"
      description="Paste any ChatGPT, Claude, Gemini, DeepSeek or Kimi conversation and get a ready-to-continue rescue — right here in Chat."
      className="max-w-4xl"
    >
      <div className="max-h-[70dvh] overflow-y-auto pr-1">
        {error ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-ink">
            {error}
            <p className="mt-0.5 text-xs text-muted">
              Add a provider API key under Keys, or paste a shorter conversation.
            </p>
          </div>
        ) : null}

        {phase === "paste" ? <PasteView mode="rescue" onAnalyze={handleAnalyze} /> : null}
        {phase === "pipeline" ? <RescuePipeline words={words} /> : null}
        {phase === "report" && report ? <RescueReportView report={report} onBack={() => setPhase("paste")} /> : null}
      </div>
    </Modal>
  );
}