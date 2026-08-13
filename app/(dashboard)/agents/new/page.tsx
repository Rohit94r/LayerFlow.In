"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AgentPermissionMode, AgentTemplate } from "@layerflow/contracts";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  FileCode2,
  FileDown,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { agentsService } from "@/lib/services/agents";
import { cn } from "@/lib/utils";

type GoalDiscovery = {
  role: string;
  opportunityType: string;
  locations: string;
  salaryRange: string;
  experienceLevel: string;
  preferredCompanies: string;
  industries: string;
  workAuthorization: string;
  noticePeriod: string;
};

type ResumeExtraction = {
  fullName: string;
  email: string;
  phone: string;
  skills: string;
  education: string;
  projects: string;
  experience: string;
  certifications: string;
  github: string;
  linkedin: string;
  portfolio: string;
};

type InterviewPreferences = {
  availability: string;
  timeZone: string;
  communication: string;
  remotePreference: string;
  relocation: string;
};

const DEFAULT_JOB_TEMPLATE: AgentTemplate = {
  key: "job_applying",
  name: "Job Applying Agent",
  description: "Finds matching roles, prepares applications, and pauses before every submission.",
  category: "Career",
  estimatedCost: "$3-$12 per active search week",
  expectedOutcome: "A tracked application pipeline with approvals and follow-ups.",
  defaultSchedule: "Weekdays at 09:00, 13:00, and 18:00 in your time zone",
  permissions: [
    { key: "browse_jobs", label: "Browse job websites", category: "Discovery", mode: "allow_always" },
    { key: "open_external_pages", label: "Open external pages", category: "Discovery", mode: "allow_always" },
    { key: "upload_resume", label: "Upload resume", category: "Documents", mode: "allow_once" },
    { key: "submit_applications", label: "Submit applications", category: "High risk", mode: "deny" },
    { key: "generate_cover_letters", label: "Generate cover letters", category: "Writing", mode: "allow_always" },
    { key: "send_follow_up_emails", label: "Send follow-up emails", category: "Communication", mode: "deny" },
    { key: "store_job_history", label: "Store job history", category: "Memory", mode: "allow_always" },
  ],
};

const STEPS = [
  "Goal",
  "Resume",
  "Extract",
  "Interview",
  "Permissions",
  "Confirm",
];

const EMPTY_EXTRACTION: ResumeExtraction = {
  fullName: "",
  email: "",
  phone: "",
  skills: "",
  education: "",
  projects: "",
  experience: "",
  certifications: "",
  github: "",
  linkedin: "",
  portfolio: "",
};

function inferGoal(goal: string): Partial<GoalDiscovery> {
  const lower = goal.toLowerCase();
  return {
    role: lower.includes("frontend")
      ? "Frontend Engineer Intern"
      : lower.includes("data")
        ? "Data Analyst Intern"
        : "Software Engineer Intern",
    opportunityType: lower.includes("full") ? "Full-time" : "Internship",
    locations: lower.includes("remote") ? "Remote" : "Mumbai, Pune, Remote",
    experienceLevel: lower.includes("senior") ? "Senior" : "Student / early career",
  };
}

function parseResumeText(text: string): ResumeExtraction {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? "";
  const github = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0] ?? "";
  const linkedin = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] ?? "";
  const portfolio = text.match(/https?:\/\/(?![^/]*github\.com|[^/]*linkedin\.com)[^\s)]+/i)?.[0] ?? "";
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 2 && !line.includes("@"));
  const likelySkills = [
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Python",
    "Tailwind",
    "AI workflows",
  ].filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));

  return {
    ...EMPTY_EXTRACTION,
    fullName: firstLine && firstLine.length < 80 ? firstLine : "",
    email,
    phone,
    skills: likelySkills.length ? likelySkills.join(", ") : "React, TypeScript, Next.js, Node.js",
    education: text.toLowerCase().includes("university") || text.toLowerCase().includes("college")
      ? "Detected education section - review and edit"
      : "",
    projects: text.toLowerCase().includes("project") ? "Detected project experience - review and edit" : "",
    experience: text.toLowerCase().includes("intern") || text.toLowerCase().includes("experience")
      ? "Detected experience section - review and edit"
      : "",
    github,
    linkedin,
    portfolio,
    certifications: text.toLowerCase().includes("certification") ? "Detected certifications - review and edit" : "",
  };
}

function buildSystemPrompt(goal: GoalDiscovery, extraction: ResumeExtraction, prefs: InterviewPreferences) {
  return [
    "You are a LayerFlow Job Applying Agent.",
    "",
    "Mission:",
    `Find and prepare applications for ${goal.opportunityType.toLowerCase()} ${goal.role} roles in ${goal.locations}.`,
    "",
    "Candidate profile:",
    `Name: ${extraction.fullName || "Unknown"}`,
    `Skills: ${extraction.skills || "Review extracted resume skills"}`,
    `Education: ${extraction.education || "Not provided"}`,
    `Projects: ${extraction.projects || "Not provided"}`,
    `Experience: ${extraction.experience || "Not provided"}`,
    "",
    "Search preferences:",
    `Salary range: ${goal.salaryRange || "Flexible"}`,
    `Preferred companies: ${goal.preferredCompanies || "Open to strong matches"}`,
    `Industries: ${goal.industries || "Software and AI-first companies"}`,
    `Work authorization: ${goal.workAuthorization || "Confirm before applying"}`,
    `Notice period: ${goal.noticePeriod || "Immediate / flexible"}`,
    "",
    "Interview preferences:",
    `Availability: ${prefs.availability}`,
    `Time zone: ${prefs.timeZone}`,
    `Communication: ${prefs.communication}`,
    `Remote interviews: ${prefs.remotePreference}`,
    `Relocation: ${prefs.relocation}`,
    "",
    "Safety rules:",
    "- Never submit an application without a pending approval being approved.",
    "- Never upload a resume, send an email, or contact a recruiter silently.",
    "- Deduplicate companies and roles before preparing new applications.",
    "- Store application history, rejected companies, recruiter context, and interview feedback as memory.",
  ].join("\n");
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGoal = searchParams.get("goal") || "I want a Job Applying Agent.";
  const requestedTemplate = searchParams.get("template") || "job_applying";

  const [templates, setTemplates] = useState<AgentTemplate[]>([DEFAULT_JOB_TEMPLATE]);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === requestedTemplate) ?? DEFAULT_JOB_TEMPLATE,
    [templates, requestedTemplate],
  );
  const [step, setStep] = useState(0);
  const [goalText, setGoalText] = useState(initialGoal);
  const [goal, setGoal] = useState<GoalDiscovery>({
    role: "Software Engineer Intern",
    opportunityType: "Internship",
    locations: "Mumbai, Pune, Remote",
    salaryRange: "25k-60k INR/month",
    experienceLevel: "Student / early career",
    preferredCompanies: "Google, Microsoft, Atlassian, CRED",
    industries: "AI tools, SaaS, fintech, developer tools",
    workAuthorization: "Authorized to work in India",
    noticePeriod: "Immediate",
    ...inferGoal(initialGoal),
  });
  const [resumeMode, setResumeMode] = useState<"upload_pdf" | "upload_docx" | "paste" | "manual">("upload_pdf");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [extraction, setExtraction] = useState<ResumeExtraction>(EMPTY_EXTRACTION);
  const [prefs, setPrefs] = useState<InterviewPreferences>({
    availability: "Weekdays after 5 PM, Saturday mornings",
    timeZone: "Asia/Kolkata",
    communication: "Email first, WhatsApp for urgent scheduling",
    remotePreference: "Prefer remote interviews",
    relocation: "Open to Pune, Mumbai, Bengaluru; remote preferred",
  });
  const [permissionModes, setPermissionModes] = useState<Record<string, AgentPermissionMode>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedTemplateKey, setSyncedTemplateKey] = useState<string | null>(null);

  useEffect(() => {
    void agentsService.templates().then((res) => setTemplates(res.templates)).catch(() => undefined);
  }, []);

  // Reset permission modes in-render when the selected template changes (the
  // recommended pattern vs. an effect) so step 5 starts from the template's
  // defaults before the user edits them.
  if (syncedTemplateKey !== selectedTemplate.key) {
    setSyncedTemplateKey(selectedTemplate.key);
    setPermissionModes(
      Object.fromEntries(selectedTemplate.permissions.map((permission) => [permission.key, permission.mode])),
    );
  }

  function updateGoal<K extends keyof GoalDiscovery>(key: K, value: GoalDiscovery[K]) {
    setGoal((current) => ({ ...current, [key]: value }));
  }

  function updateExtraction<K extends keyof ResumeExtraction>(key: K, value: ResumeExtraction[K]) {
    setExtraction((current) => ({ ...current, [key]: value }));
  }

  function updatePrefs<K extends keyof InterviewPreferences>(key: K, value: InterviewPreferences[K]) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function discoverGoal() {
    setGoal((current) => ({ ...current, ...inferGoal(goalText) }));
    setStep(1);
  }

  function handleFile(file: File | null, mode: "upload_pdf" | "upload_docx") {
    if (!file) return;
    setResumeMode(mode);
    setResumeFileName(file.name);
    setExtraction({
      ...EMPTY_EXTRACTION,
      fullName: "",
      email: "",
      phone: "",
      skills: "React, TypeScript, Next.js, Node.js",
      education: "Uploaded resume queued for full parsing",
      projects: "Uploaded resume queued for project extraction",
      experience: "Uploaded resume queued for experience extraction",
    });
    setStep(2);
  }

  function extractFromPaste() {
    setExtraction(parseResumeText(resumeText));
    setStep(2);
  }

  async function create() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const systemPrompt = buildSystemPrompt(goal, extraction, prefs);
      const permissions = selectedTemplate.permissions.map((permission) => ({
        ...permission,
        mode: permissionModes[permission.key] ?? "deny",
      }));
      const onboarding = {
        requestedGoal: goalText,
        goalDiscovery: goal,
        resume: {
          mode: resumeMode,
          fileName: resumeFileName || null,
          textProvided: resumeMode === "paste" ? resumeText.length > 0 : false,
        },
        extraction,
        interviewPreferences: prefs,
        securitySummary: {
          neverSilentSubmission: true,
          highRiskActionsRequireApproval: true,
          permissionModes,
        },
      };

      const created = await agentsService.create({
        name: goal.role ? `${goal.role} Agent` : selectedTemplate.name,
        role: selectedTemplate.key === "job_applying" ? "job_apply" : "custom",
        templateKey: selectedTemplate.key,
        goal: `${goal.opportunityType} ${goal.role} roles in ${goal.locations}`,
        systemPrompt,
        modelId: null,
        temperature: 0.3,
        tools: ["safe_browser", "resume_parser", "cover_letter_writer", "approval_gate", "agent_memory"],
        schedule: selectedTemplate.defaultSchedule,
        expectedActivity: selectedTemplate.expectedOutcome,
        estimatedUsage: selectedTemplate.estimatedCost,
        onboarding,
        permissions,
      });

      if (resumeFileName || resumeText.trim()) {
        await agentsService.uploadResume(created.agent.id, {
          fileName: resumeFileName || "pasted-resume.txt",
          mimeType: resumeMode === "upload_docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : resumeMode === "upload_pdf"
              ? "application/pdf"
              : "text/plain",
          extraction,
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

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-6 lg:h-fit">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-brand">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-sm font-semibold text-ink">Create agent</h1>
              <p className="text-[11px] text-muted">{selectedTemplate.name}</p>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition",
                  step === index
                    ? "bg-ink text-bg"
                    : index < step
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                    step === index
                      ? "bg-bg text-ink"
                      : index < step
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-surface-2 text-muted",
                  )}
                >
                  {index < step ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-[11px] font-semibold text-ink">Security summary</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              High-risk actions are converted into approval cards. Denied permissions stay unavailable to this agent.
            </p>
          </div>
        </aside>

        <main className="rounded-2xl border border-border bg-surface shadow-sm">
          {step === 0 ? (
            <section className="space-y-6 p-5 md:p-7">
              <div>
                <Badge tone="neutral">Step 1</Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Goal discovery</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Start conversationally. LayerFlow turns the goal into an onboarding plan and adaptive questions.
                </p>
              </div>

              <Field label="What do you want this agent to do?">
                <Textarea value={goalText} onChange={(event) => setGoalText(event.target.value)} rows={3} />
              </Field>

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Sparkles className="h-4 w-4 text-brand" />
                  Adaptive questions
                </div>
                <FieldGrid>
                  <Field label="Role">
                    <Input value={goal.role} onChange={(event) => updateGoal("role", event.target.value)} />
                  </Field>
                  <Field label="Internship or full-time">
                    <Select value={goal.opportunityType} onChange={(event) => updateGoal("opportunityType", event.target.value)}>
                      <option>Internship</option>
                      <option>Full-time</option>
                      <option>Contract</option>
                    </Select>
                  </Field>
                  <Field label="Preferred locations">
                    <Input value={goal.locations} onChange={(event) => updateGoal("locations", event.target.value)} />
                  </Field>
                  <Field label="Salary range">
                    <Input value={goal.salaryRange} onChange={(event) => updateGoal("salaryRange", event.target.value)} />
                  </Field>
                  <Field label="Experience level">
                    <Input value={goal.experienceLevel} onChange={(event) => updateGoal("experienceLevel", event.target.value)} />
                  </Field>
                  <Field label="Preferred companies">
                    <Input value={goal.preferredCompanies} onChange={(event) => updateGoal("preferredCompanies", event.target.value)} />
                  </Field>
                  <Field label="Industries">
                    <Input value={goal.industries} onChange={(event) => updateGoal("industries", event.target.value)} />
                  </Field>
                  <Field label="Work authorization">
                    <Input value={goal.workAuthorization} onChange={(event) => updateGoal("workAuthorization", event.target.value)} />
                  </Field>
                  <Field label="Notice period">
                    <Input value={goal.noticePeriod} onChange={(event) => updateGoal("noticePeriod", event.target.value)} />
                  </Field>
                </FieldGrid>
              </div>

              <div className="flex justify-end">
                <Button onClick={discoverGoal} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Continue
                </Button>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6 p-5 md:p-7">
              <div>
                <Badge tone="neutral">Step 2</Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Upload resume</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Upload is recommended because the agent can extract structured profile fields and reuse them for every application.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-brand shadow-sm">
                    <FileDown className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Upload Resume (Recommended)</h3>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      One resume upload lets the agent extract skills, projects, links, education, and contact details once.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-bg transition hover:opacity-90">
                    <FileDown className="h-3.5 w-3.5" />
                    Upload PDF
                    <input type="file" accept="application/pdf" className="hidden" onChange={(event) => handleFile(event.target.files?.[0] ?? null, "upload_pdf")} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 text-xs font-semibold text-ink transition hover:bg-surface-2">
                    <FileCode2 className="h-3.5 w-3.5" />
                    Upload DOCX
                    <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => handleFile(event.target.files?.[0] ?? null, "upload_docx")} />
                  </label>
                  <Button variant="outline" size="sm" onClick={() => setResumeMode("paste")} icon={<Mail className="h-3.5 w-3.5" />}>
                    Paste text
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setResumeMode("manual"); setStep(2); }} icon={<User className="h-3.5 w-3.5" />}>
                    Fill manually
                  </Button>
                </div>
              </div>

              {resumeMode === "paste" ? (
                <div className="space-y-3">
                  <Field label="Paste resume text">
                    <Textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} rows={8} />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={extractFromPaste} disabled={!resumeText.trim()} icon={<Sparkles className="h-3.5 w-3.5" />}>
                      Extract fields
                    </Button>
                  </div>
                </div>
              ) : null}

              {resumeFileName ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
                  Selected: {resumeFileName}
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6 p-5 md:p-7">
              <div>
                <Badge tone="neutral">Step 3</Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Automatic extraction</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Review and edit the extracted profile before the agent starts.</p>
              </div>

              <FieldGrid>
                {(Object.keys(extraction) as Array<keyof ResumeExtraction>).map((key) => (
                  <Field key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}>
                    {["skills", "education", "projects", "experience", "certifications"].includes(key) ? (
                      <Textarea value={extraction[key]} onChange={(event) => updateExtraction(key, event.target.value)} rows={3} />
                    ) : (
                      <Input value={extraction[key]} onChange={(event) => updateExtraction(key, event.target.value)} />
                    )}
                  </Field>
                ))}
              </FieldGrid>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Continue
                </Button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-6 p-5 md:p-7">
              <div>
                <Badge tone="neutral">Step 4</Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Interview preferences</h2>
                <p className="mt-2 text-sm leading-6 text-muted">The agent uses these details when preparing applications and scheduling follow-ups.</p>
              </div>

              <FieldGrid>
                <Field label="Interview availability">
                  <Input value={prefs.availability} onChange={(event) => updatePrefs("availability", event.target.value)} />
                </Field>
                <Field label="Time zone">
                  <Input value={prefs.timeZone} onChange={(event) => updatePrefs("timeZone", event.target.value)} />
                </Field>
                <Field label="Communication preference">
                  <Input value={prefs.communication} onChange={(event) => updatePrefs("communication", event.target.value)} />
                </Field>
                <Field label="Remote interview preference">
                  <Input value={prefs.remotePreference} onChange={(event) => updatePrefs("remotePreference", event.target.value)} />
                </Field>
                <Field label="Relocation willingness">
                  <Input value={prefs.relocation} onChange={(event) => updatePrefs("relocation", event.target.value)} />
                </Field>
              </FieldGrid>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                  Back
                </Button>
                <Button onClick={() => setStep(4)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Continue
                </Button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="space-y-6 p-5 md:p-7">
              <div>
                <Badge tone="neutral">Step 5</Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Permission system</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Choose exactly what this agent may do. High-risk permissions should stay approval-gated.</p>
              </div>

              <div className="space-y-3">
                {selectedTemplate.permissions.map((permission) => (
                  <div key={permission.key} className="rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{permission.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{permission.description ?? permission.category}</p>
                      </div>
                      <span className="rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
                        {permission.category ?? "Permission"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        ["allow_once", "Allow once"],
                        ["allow_always", "Allow always"],
                        ["deny", "Deny"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPermissionModes((current) => ({ ...current, [permission.key]: value as AgentPermissionMode }))}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                            permissionModes[permission.key] === value
                              ? value === "deny"
                                ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-border bg-surface text-muted hover:bg-surface-2",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Security summary
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Applications, resume uploads, follow-up emails, and recruiter messages create approval cards before execution. Denied actions are blocked for this agent.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                  Back
                </Button>
                <Button onClick={() => setStep(5)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Review
                </Button>
              </div>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="space-y-6 p-5 md:p-7">
              <div>
                <Badge tone="neutral">Step 6</Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">Agent confirmation</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Review the digital worker before it begins background execution.</p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Agent name</p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">{goal.role} Agent</h3>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-brand">
                    <Briefcase className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[
                    ["Goal", `${goal.opportunityType} ${goal.role} roles in ${goal.locations}`],
                    ["Daily schedule", selectedTemplate.defaultSchedule],
                    ["Expected activity", selectedTemplate.expectedOutcome],
                    ["Estimated AI usage", selectedTemplate.estimatedCost],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-surface p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
                      <p className="mt-1 text-sm leading-5 text-ink">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-border bg-surface p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Permission summary</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTemplate.permissions.map((permission) => (
                      <span
                        key={permission.key}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          permissionModes[permission.key] === "deny"
                            ? "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                            : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                        )}
                      >
                        {permission.label}: {(permissionModes[permission.key] ?? "deny").replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-400">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                  Back
                </Button>
                <Button
                  onClick={create}
                  disabled={saving}
                  icon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                >
                  {saving ? "Creating..." : "Create Agent"}
                </Button>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}