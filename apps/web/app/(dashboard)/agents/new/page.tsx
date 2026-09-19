"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AgentTemplate } from "@layerflow/contracts";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Check,
  FileCode2,
  Layers,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { agentsService } from "@/lib/services/agents";
import { cn } from "@/lib/utils";

const TEMPLATE_ICONS: Record<string, typeof Bot> = {
  common_assistant: Sparkles,
  freelancer_pipeline: Briefcase,
  job_finder: Briefcase,
  product_finder: Layers,
  content_creator: FileCode2,
  startup_research: Sparkles,
};

function buildSystemPrompt(template: AgentTemplate, goal: string): string {
  const persona: Record<string, string> = {
    common_assistant:
      "You are a helpful LayerFlow agent that researches, drafts, and answers using web search, reading pages, and files.",
    freelancer_pipeline:
      "You are a LayerFlow Freelance Prospector. Find freelance gigs and clients, shape tailored proposals from the user's portfolio and rates, and prepare polished follow-ups. Never submit a proposal or send a client message without approval.",
    job_finder:
      "You are a LayerFlow Job Finder. Search job listings, score fit against the user's profile, and prepare applications with tailored cover letters. Never submit an application or contact a recruiter without approval.",
    product_finder:
      "You are a LayerFlow Product Finder. Find products, suppliers, and leads, compare specs and pricing, and deliver a ranked shortlist the user can act on.",
    content_creator:
      "You are a LayerFlow Content Creator. Turn ideas into posts, threads, and newsletters with clear, on-brand drafts for the user to review before publishing.",
    startup_research:
      "You are a LayerFlow Startup Research agent. Map companies, founders, funding signals, and opportunities, and deliver concise research briefs.",
  };

  return [
    persona[template.key] ?? persona.common_assistant,
    "",
    "Current mission:",
    goal.trim() || template.expectedOutcome,
    "",
    `Operating schedule: ${template.defaultSchedule}`,
    "",
    "Safety rules:",
    "- Stop and create an approval card before any high-risk action (submission, sending, publishing, deleting).",
    "- Save useful findings and preferences to memory.",
    "- Report progress with clear, concise steps.",
  ].join("\n");
}

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGoal = searchParams.get("goal") || "";
  const requestedTemplate = searchParams.get("template") || "common_assistant";

  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState(requestedTemplate);
  const [goal, setGoal] = useState(initialGoal);
  const [context, setContext] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void agentsService
      .templates()
      .then((res) => {
        setTemplates(res.templates);
        if (!res.templates.some((t) => t.key === requestedTemplate)) {
          setSelectedKey("common_assistant");
        }
      })
      .catch(() => undefined);
  }, [requestedTemplate]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.key === selectedKey) ?? templates[0] ?? null,
    [templates, selectedKey],
  );

  async function create() {
    if (saving || !selectedTemplate) return;
    setSaving(true);
    setError(null);
    try {
      const systemPrompt = buildSystemPrompt(selectedTemplate, goal);
      const created = await agentsService.create({
        name: selectedTemplate.name,
        role: "custom",
        templateKey: selectedTemplate.key,
        goal: goal.trim() || selectedTemplate.expectedOutcome,
        systemPrompt,
        modelId: null,
        temperature: 0.3,
        tools: ["search", "read_file", "write_file", "edit_file", "fetch_url", "shell"],
        schedule: selectedTemplate.defaultSchedule,
        expectedActivity: selectedTemplate.expectedOutcome,
        estimatedUsage: selectedTemplate.estimatedCost,
        onboarding: {
          requestedGoal: goal,
          extraContext: context,
          resume: {
            fileName: resumeFileName || null,
            pasted: resumeText.trim().length > 0,
          },
        },
        permissions: selectedTemplate.permissions.map((permission) => ({
          ...permission,
          mode: permission.mode,
        })),
      });

      if (resumeText.trim()) {
        await agentsService.uploadResume(created.agent.id, {
          fileName: resumeFileName || "pasted-resume.txt",
          mimeType: "text/plain",
          extraction: { fullName: "", email: "", skills: context },
        });
      }

      await agentsService.start(created.agent.id);
      router.push(`/agents/${created.agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this agent.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 text-ink">
      <button
        type="button"
        onClick={() => router.push("/agents")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Agents
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Create an agent</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Pick a template, tell it what to do, and hit create — no long questionnaires. It starts in the background and only
          asks before high-risk actions.
        </p>
      </div>

      {/* Step 1 — template picker */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">1 · Choose a work type</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const Icon = TEMPLATE_ICONS[template.key] ?? Bot;
            const selected = selectedKey === template.key;
            return (
              <button
                key={template.key}
                type="button"
                onClick={() => setSelectedKey(template.key)}
                className={cn(
                  "flex min-h-44 flex-col rounded-2xl border p-4 text-left transition",
                  selected
                    ? "border-brand bg-orange-500/5 shadow-[0_0_0_1px_theme(colors.brand)]"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-brand bg-brand text-white" : "border-border text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </div>
                <div className="mt-auto pt-3">
                  <p className="text-sm font-semibold text-ink">
                    {template.name}
                    {template.key === "common_assistant" ? (
                      <Badge tone="mint" className="ml-2">Default</Badge>
                    ) : null}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-5 text-muted">{template.description}</p>
                </div>
              </button>
            );
          })}
          {!templates.length ? (
            <div className="flex items-center justify-center rounded-2xl border border-border bg-surface py-16">
              <Loader2 className="h-5 w-5 animate-spin text-faint" />
            </div>
          ) : null}
        </div>
      </section>

      {/* Step 2 — quick briefing */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold tracking-tight text-ink">2 · Quick briefing</h2>
        <p className="mt-1 text-xs text-muted">One goal is all you need. Add context (optional) if you want better results.</p>

        <div className="mt-5 space-y-4">
          <Field label="What should this agent do?">
            <Textarea
              aria-label="What should this agent do?"
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={selectedTemplate?.key === "common_assistant" ? "e.g. Research trending AI freelancing niches and draft a summary." : selectedTemplate?.expectedOutcome}
            />
          </Field>

          <Field label="Extra context" hint="Optional — your skills, rates, portfolio links, target market, companies, etc.">
            <Textarea
              aria-label="Extra context"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. I'm a React dev, charge $30/hr, based in Pune, want remote gigs…"
            />
          </Field>

          <details className="rounded-xl border border-border bg-surface-2/50 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted">
              Add a resume or profile text (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-bg transition hover:opacity-90">
                <Mail className="h-3.5 w-3.5" />
                Choose file
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setResumeFileName(e.target.files?.[0]?.name ?? "")}
                />
              </label>
              <Field label="or paste its text">
                <Textarea aria-label="Paste resume text" rows={5} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume / profile text so the agent can reference your background…" />
              </Field>
            </div>
          </details>

          <div className="rounded-xl border border-border bg-surface-2 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Safe by default
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(selectedTemplate?.permissions ?? []).map((permission) => (
                <span
                  key={permission.key}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10.5px] font-semibold",
                    permission.mode === "deny"
                      ? "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                      : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                  )}
                >
                  {permission.label}: {permission.mode.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-400">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-faint">
              {selectedTemplate?.estimatedCost} · {selectedTemplate?.defaultSchedule}
            </p>
            <Button
              onClick={create}
              disabled={saving || !selectedTemplate}
              icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            >
              {saving ? "Creating and starting…" : "Create & start agent"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}