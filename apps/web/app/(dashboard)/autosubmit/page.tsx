"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  Save,
  Send,
  Sparkles,
  User,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { autosubmitService, type FormSubmission, type UserProfile } from "@/lib/services/autosubmit";

export default function AutoSubmitPage() {
  const [activeTab, setActiveTab] = useState<"submit" | "profile" | "history">("submit");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form submit state
  const [formUrl, setFormUrl] = useState("");
  const [prompt, setPrompt] = useState("");

  // User Profile state
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
    collegeName: "",
    rollNumber: "",
    branchDepartment: "",
    graduationYear: "",
    bioDetails: "",
  });

  // History state
  const [history, setHistory] = useState<FormSubmission[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [profileRes, historyRes] = await Promise.all([
          autosubmitService.getProfile(),
          autosubmitService.getHistory(),
        ]);
        if (profileRes.profile) {
          setProfile(profileRes.profile);
        }
        setHistory(historyRes.history || []);
      } catch (err) {
        console.error("Failed to load AutoSubmit data", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    try {
      const res = await autosubmitService.saveProfile(profile);
      setProfile(res.profile);
      setMessage({ type: "success", text: "Profile details saved successfully! Next time you paste a link, your details will be filled automatically." });
    } catch {
      setMessage({ type: "error", text: "Could not save profile details right now." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formUrl.trim()) return;

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await autosubmitService.submitForm({ formUrl, prompt });
      if (res.success) {
        setFormUrl("");
        setPrompt("");
        setMessage({
          type: "success",
          text: `Form submitted successfully! A confirmation email has been sent to ${profile.email || "your registered email"}.`,
        });
        // Refresh history
        const historyRes = await autosubmitService.getHistory();
        setHistory(historyRes.history || []);
      }
    } catch {
      setMessage({ type: "error", text: "Form submission failed. Please check the URL and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header section */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">AutoSubmit V1</Badge>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Gmail Confirmed
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Never fill boring college or feedback forms manually again.
            </h1>
            <p className="mt-2 text-sm text-muted max-w-2xl">
              Save your profile info once. Paste any form link + prompt, and LayerFlow will auto-submit the form and email you proof!
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-1.5 border border-border">
            <button
              onClick={() => setActiveTab("submit")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "submit" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              Submit Form
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "profile" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "history" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              History ({history.length})
            </button>
          </div>
        </div>
      </section>

      {/* Alert Notification */}
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* TAB 1: SUBMIT FORM */}
      {activeTab === "submit" && (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            1-Click Form AutoSubmitter
          </h2>
          <p className="mt-1 text-xs text-muted">
            Paste Google Form or College feedback link below. No need to re-enter your roll number, name, or email.
          </p>

          <form onSubmit={handleSubmitForm} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Form URL / Link</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-faint" />
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/forms/d/e/... or any feedback link"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 pl-10 pr-4 py-2.5 text-sm text-ink outline-none focus:border-border-strong transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Prompt / Instructions <span className="text-faint">(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Give 5-star ratings for all faculty, select Computer Science department, and add positive comments."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-border-strong transition resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-faint flex items-center gap-1">
                <Mail className="h-3 w-3 text-brand" /> Confirmation email will be sent automatically
              </span>
              <Button type="submit" disabled={submitting} icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>
                {submitting ? "Auto-Submitting..." : "Submit Form Instantly"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 2: USER PROFILE */}
      {activeTab === "profile" && (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <User className="h-4 w-4 text-brand" />
            Your Saved AutoSubmit Profile
          </h2>
          <p className="mt-1 text-xs text-muted">
            Fill this out once. All future forms will automatically draw your information from here.
          </p>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="e.g. Rohit Jadhav"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">College / University Name</label>
                <input
                  type="text"
                  value={profile.collegeName || ""}
                  onChange={(e) => setProfile({ ...profile, collegeName: e.target.value })}
                  placeholder="e.g. MIT College of Engineering"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Roll Number / Student ID</label>
                <input
                  type="text"
                  value={profile.rollNumber || ""}
                  onChange={(e) => setProfile({ ...profile, rollNumber: e.target.value })}
                  placeholder="e.g. 2024CS1092"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Branch / Department</label>
                <input
                  type="text"
                  value={profile.branchDepartment || ""}
                  onChange={(e) => setProfile({ ...profile, branchDepartment: e.target.value })}
                  placeholder="e.g. Computer Engineering"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Graduation Year</label>
                <input
                  type="text"
                  value={profile.graduationYear || ""}
                  onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
                  placeholder="e.g. 2026"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Additional Details / Bio</label>
              <textarea
                rows={3}
                value={profile.bioDetails || ""}
                onChange={(e) => setProfile({ ...profile, bioDetails: e.target.value })}
                placeholder="Any extra default answers or preferences for open-ended questions..."
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-border-strong resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingProfile} icon={<Save className="h-4 w-4" />}>
                {savingProfile ? "Saving Profile..." : "Save Profile Details"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: SUBMISSION HISTORY */}
      {activeTab === "history" && (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand" />
            Submission Log
          </h2>
          <p className="mt-1 text-xs text-muted mb-4">
            Recent form auto-submissions and confirmation status.
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-faint" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted">
              No form submissions recorded yet. Paste a link above to test!
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-border bg-surface-2/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={sub.status === "completed" ? "mint" : "neutral"}>
                        {sub.status.toUpperCase()}
                      </Badge>
                      <a href={sub.formUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:underline truncate max-w-md">
                        {sub.formUrl}
                      </a>
                    </div>
                    <span className="text-[11px] text-faint">
                      {new Date(sub.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {sub.prompt && (
                    <p className="mt-2 text-xs italic text-muted">
                      Prompt: &quot;{sub.prompt}&quot;
                    </p>
                  )}

                  {sub.resultSummary && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-surface/50 p-3 text-xs font-mono text-muted space-y-1">
                      <p className="font-semibold text-ink text-[11px]">Filled Details:</p>
                      <pre className="whitespace-pre-wrap font-sans text-xs">{sub.resultSummary}</pre>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-emerald-400" />
                      Email proof: {sub.emailNotificationSent ? "Sent to inbox" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
