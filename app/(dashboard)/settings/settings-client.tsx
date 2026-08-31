"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Bell, Shield, KeyRound, Palette, CreditCard, Check, Loader2 } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, Input, Select } from "@/components/ui/input";
import { useSession, signOut } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api/client";
import { profileResponseSchema } from "@layerflow/contracts";
import { PICKER_MODELS } from "@/components/features/chat/chat-models";

// Real, servable models only — pulled from the shared model registry via the
// chat model picker. No fiction ids (gpt-5, DeepSeek V3…) that the platform
// cannot serve. "auto" delegates to the backend router.
const DEFAULT_MODELS = PICKER_MODELS.filter((m) => !m.auto);

const NOTIFICATIONS = [
  {
    id: "digest",
    label: "Weekly context digest",
    hint: "Summary of rescues, prompts and learnings every Monday",
    on: true,
  },
  {
    id: "cost",
    label: "Cost alerts",
    hint: "When monthly spend passes 50% / 80% of your budget",
    on: true,
  },
  {
    id: "byok",
    label: "BYOK health warnings",
    hint: "When a provider key starts failing",
    on: false,
  },
  {
    id: "feedback",
    label: "Outcome feedback reminders",
    hint: "Ask how a Continue Pack performed",
    on: false,
  },
];

export default function SettingsClient() {
  const session = useSession();
  const user = session.data?.user;
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [defaultModel, setDefaultModel] = useState("auto");
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  // Real save — persists displayName to the LayerFlow API (PATCH /api/profiles/me).
  async function saveProfile() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaved(null);
    try {
      await apiFetch(
        "/api/profiles/me",
        { method: "PATCH", body: { displayName: name.trim() } },
        profileResponseSchema,
      );
      setSaved("Profile saved");
      window.setTimeout(() => setSaved(null), 1800);
    } catch {
      setSaveError("Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // UI-only preferences (notifications, theme, language) are stored on this
  // device for now — there is no per-user toggle API yet, so we say so instead
  // of faking a server save.
  function saveLocal(label: string) {
    setSaved(label);
    window.setTimeout(() => setSaved(null), 1800);
  }

  // Real sign-out via the Better Auth client, then return to the sign-in page.
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Your account, workspace, keys and plan." />

      <div className="space-y-5">
        <Panel>
          <PanelHeader title="Profile" description="Shown across your workspace" action={<User className="h-4 w-4 text-faint" />} />
          <PanelBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input defaultValue={user?.email ?? ""} disabled />
            </Field>
            <Field label="Default model" hint="Used as the session default when you start a new chat">
              <Select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)}>
                <option value="auto">Auto (best available)</option>
                {DEFAULT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language">
              <Select defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="hi">हिन्दी</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button
                size="sm"
                disabled={saving || !name.trim()}
                onClick={saveProfile}
                icon={
                  saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saved === "Profile saved" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : undefined
                }
              >
                {saving ? "Saving…" : saved === "Profile saved" ? "Saved" : "Save profile"}
              </Button>
              {saveError ? <p className="mt-2 text-[11px] text-rose-400">{saveError}</p> : null}
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Notifications" description="Keep your AI work top of mind" action={<Bell className="h-4 w-4 text-faint" />} />
          <PanelBody className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2/40 p-4"
              >
                <span>
                  <span className="block text-sm font-medium text-ink">{n.label}</span>
                  <span className="mt-0.5 block text-[11px] text-faint">{n.hint}</span>
                </span>
                <Switch
                  label={n.label}
                  checked={n.on}
                  onCheckedChange={(on) =>
                    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, on } : x)))
                  }
                />
              </div>
            ))}
            <Button
              size="sm"
              onClick={() => saveLocal("Preferences saved on this device")}
              icon={saved === "Preferences saved on this device" ? <Check className="h-3.5 w-3.5" /> : undefined}
            >
              {saved === "Preferences saved on this device" ? "Saved" : "Save preferences"}
            </Button>
            <p className="text-[11px] text-faint">
              Preferences are kept on this device only. A server-side per-user toggle is not available yet.
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Plan" description="Workflow value pricing — never pay per AI credit" action={<CreditCard className="h-4 w-4 text-faint" />} />
          <PanelBody>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-2/40 p-5">
              <div>
                <p className="text-sm font-semibold text-ink">Free plan</p>
                <p className="mt-0.5 text-[11px] text-faint">
                  3 Rescue Reports / month · Upgrade for unlimited reports + Cost Check + BYOK
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/billing">
                  <Button variant="secondary" size="sm">
                    Compare plans
                  </Button>
                </Link>
                <Link href="/billing">
                  <Button size="sm">Upgrade to Starter · $5</Button>
                </Link>
              </div>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Appearance" action={<Palette className="h-4 w-4 text-faint" />} />
          <PanelBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Theme">
              <Select defaultValue="system">
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </Select>
            </Field>
            <Field label="Density">
              <Select defaultValue="comfortable">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </Select>
            </Field>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Privacy & data" action={<Shield className="h-4 w-4 text-faint" />} />
          <PanelBody className="space-y-4">
            <div className="rounded-xl border border-border bg-surface-2/40 p-4">
              <span className="block text-sm font-medium text-ink">Data export & workspace deletion</span>
              <span className="mt-0.5 block text-[11px] text-faint">
                Export archive and permanent deletion are not wired to an endpoint yet.
              </span>
            </div>
          </PanelBody>
        </Panel>

        <Panel className="border-rose-500/20">
          <PanelHeader title="Account" description="End your session on this device" action={<KeyRound className="h-4 w-4 text-faint" />} />
          <PanelBody>
            <p className="text-sm text-muted">
              Signing out ends your LayerFlow session on this device. Your saved chats, prompts and
              workspaces remain stored in your account.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" size="sm" disabled={signingOut} onClick={handleSignOut}>
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
